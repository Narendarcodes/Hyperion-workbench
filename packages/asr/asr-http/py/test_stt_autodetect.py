"""language='auto': the sidecar detects among --auto-languages with the --detect-engine, then routes."""
import os
import sys
import threading
from http.server import ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stt_server  # noqa: E402
from test_stt_server import FakeEngine, post  # noqa: E402


class FakeDetector(FakeEngine):
    def __init__(self, scores):
        super().__init__('unused')
        self.scores, self.detect_calls = scores, []

    def detect_language(self, wav, candidates):
        self.detect_calls.append(tuple(candidates))
        allowed = {k: v for k, v in self.scores.items() if k in candidates}
        return max(allowed, key=allowed.get), allowed


def serve(engines, routes, detect_engine, auto_languages):
    stt_server.load_audio = lambda body: [0.0] * 1600
    state = stt_server.State(routes, engines, detect_engine=detect_engine, auto_languages=auto_languages)
    srv = ThreadingHTTPServer(('127.0.0.1', 0), stt_server.make_handler(state))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}'


def test_auto_detects_within_allowed_languages_and_routes():
    te, det = FakeEngine(), FakeDetector({'te': 0.7, 'hi': 0.2, 'en': 0.05, 'ta': 0.9})
    srv, url = serve({'indic': te, 'whisper': det}, {'te': 'indic', 'hi': 'indic', 'en': 'whisper'}, 'whisper', ['te', 'hi', 'en'])
    try:
        code, doc = post(url, {'language': 'auto', 'audio_b64': 'AAAA'})
        assert code == 200, doc
        assert doc['language'] == 'te' and doc['engine'] == 'indic' and doc['detected'] is True
        assert det.detect_calls == [('te', 'hi', 'en')]       # 'ta' is not allowed
        assert te.calls[-1][1] == 'te'
        assert set(doc['languageScores']) == {'te', 'hi', 'en'}
    finally:
        srv.shutdown()


def test_auto_without_detector_is_a_clear_400():
    srv, url = serve({'x': FakeEngine()}, {'*': 'x'}, None, ['te', 'hi', 'en'])
    try:
        code, doc = post(url, {'language': 'auto', 'audio_b64': 'AAAA'})
        assert code == 400 and 'detect' in doc['error']
    finally:
        srv.shutdown()


def test_cli_parses_detection_flags():
    a = stt_server.parse_args(['--detect-engine', 'whisper-turbo', '--auto-languages', 'te,hi,en'])
    assert a.detect_engine == 'whisper-turbo' and a.auto_languages == 'te,hi,en'
