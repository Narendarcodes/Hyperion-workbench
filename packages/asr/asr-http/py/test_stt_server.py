"""Tests for the STT sidecar's normaliser and HTTP protocol (no GPU, no torch).

Run: python3 -m pytest packages/asr/asr-http/py -q
"""
import json
import os
import sys
import threading
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

# never route the loopback test traffic through an ambient HTTP proxy
OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plantnorm as pn  # noqa: E402
import stt_server  # noqa: E402


# ------------------------------------------------------------------ plantnorm
def test_verbalize_roundtrips_through_canonicalize():
    cases = [
        ('P-101A యొక్క ప్రెషర్ 15.2 bar కి తగ్గించండి', 'te'),
        ('FV-2203 को 85 % खुले रखें, तापमान 150°C से अधिक न हो।', 'hi'),
        ('Set P-101A flow to 1500 m3/h and confirm pressure 3.2 bar.', 'en'),
    ]
    for ref, lang in cases:
        spoken = pn.verbalize(ref, lang)
        assert not any(c.isdigit() for c in spoken)
        assert pn.canonicalize(spoken) == pn.canonicalize(ref)


def test_canonicalize_recovers_tags_numbers_units():
    toks = pn.canonicalize('p101a pressure twelve point five bar, fv 2203 at seventy-five percent; LIC 207 at 45%')
    assert pn.tags_of(toks) == ['P101A', 'FV2203', 'LIC207']
    assert pn.numbers_of(toks) == ['12.5', '75', '45']
    assert 'bar' in toks and 'pct' in toks


def test_canonicalize_native_digit_names():
    assert pn.tags_of(pn.canonicalize('टी आई चार शून्य पाँच')) == ['TI405']
    assert pn.tags_of(pn.canonicalize('టీ ఐ నాలుగు సున్నా ఐదు')) == ['TI405']


def test_fold_rewrites_only_tags_and_numbers():
    assert pn.fold('పీ వన్ జీరో వన్ ఏ యొక్క ప్రెషర్ ఫిఫ్టీన్ పాయింట్ టూ బార్.') == 'P-101A యొక్క ప్రెషర్ 15.2 బార్.'
    assert pn.fold('set P one zero one A flow to one thousand five hundred cubic metres per hour') == \
        'set P-101A flow to 1500 cubic metres per hour'
    assert pn.fold('one of the pumps, LIC 207 at 45% open') == 'one of the pumps, LIC-207 at 45% open'
    assert pn.fold('') == ''


def test_reference_extraction():
    ref = 'TI-405 पर ताप 340°C है, V-402 को 120 rpm पर चलाएँ।'
    assert pn.ref_tags(ref) == ['TI405', 'V402']
    assert pn.ref_numbers(ref) == ['340', '120']


# ------------------------------------------------------------------ HTTP protocol
class FakeEngine:
    kind, source, model = 'fake', '/models/fake', object()

    def __init__(self, text='పీ వన్ జీరో వన్ ఏ ప్రెషర్ ట్వెల్వ్ బార్', fail=False):
        self.text, self.fail, self.calls = text, fail, []

    def transcribe(self, wav, language):
        self.calls.append((len(wav), language))
        if self.fail:
            raise RuntimeError('boom')
        return self.text


def serve(engines, routes):
    stt_server.load_audio = lambda body: [0.0] * 1600 if body.get('audio_b64') or body.get('audio_path') else (_ for _ in ()).throw(
        ValueError('request needs "audio_b64" or an absolute "audio_path"'))
    srv = ThreadingHTTPServer(('127.0.0.1', 0), stt_server.make_handler(stt_server.State(routes, engines)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}'


def post(url, doc):
    req = urllib.request.Request(url + '/v1/transcribe', json.dumps(doc).encode(), {'Content-Type': 'application/json'})
    try:
        with OPENER.open(req, timeout=5) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def test_routes_by_language_and_folds_tags():
    te, en = FakeEngine(), FakeEngine('hello')
    srv, url = serve({'sravaani': te, 'whisper': en}, {'te': 'sravaani', 'en': 'whisper'})
    try:
        code, doc = post(url, {'language': 'te', 'audio_b64': 'AAAA'})
        assert code == 200 and doc['engine'] == 'sravaani' and doc['text'] == 'P-101A ప్రెషర్ 12 బార్'
        assert doc['raw'].startswith('పీ వన్')
        code, doc = post(url, {'language': 'te', 'audio_b64': 'AAAA', 'engine': 'whisper', 'normalize': 'none'})
        assert code == 200 and doc['engine'] == 'whisper' and doc['text'] == 'hello'
        with OPENER.open(url + '/healthz', timeout=5) as r:
            health = json.loads(r.read())
        assert health['ok'] and health['routes'] == {'te': 'sravaani', 'en': 'whisper'}
    finally:
        srv.shutdown()


def test_errors_are_json_with_status():
    srv, url = serve({'x': FakeEngine(fail=True)}, {'*': 'x'})
    try:
        assert post(url, {'language': '', 'audio_b64': 'AAAA'})[0] == 400
        assert post(url, {'language': 'te'})[0] == 400
        assert post(url, {'language': 'te', 'audio_b64': 'AAAA', 'engine': 'nope'})[0] == 400
        code, doc = post(url, {'language': 'te', 'audio_b64': 'AAAA'})
        assert code == 500 and 'boom' in doc['error']
    finally:
        srv.shutdown()


def test_main_rejects_routes_to_unknown_engines():
    assert stt_server.main(['--route', 'te=missing']) == 2
