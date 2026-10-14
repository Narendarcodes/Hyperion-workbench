"""Persistent speech-to-text sidecar for `@deepseek-ai/dsh-asr-http`.

One long-lived process keeps the engines warm on the GPU and routes each
request to an engine by language. Standard library HTTP only (no web
framework); engines import lazily so `--help` and `/healthz` work without
torch installed.

    python3 stt_server.py --host 0.0.0.0 --port 8790 \
        --route te=sravaani --route hi=sravaani --route en=whisper-turbo \
        --engine sravaani=sravaani:/models/SraVaani-1.0 \
        --engine whisper-turbo=whisper:openai/whisper-large-v3-turbo \
        --preload

Protocol (JSON over HTTP):
  GET  /healthz            -> {"ok": true, "routes": {...}, "engines": {...}, "loaded": [...]}
  POST /v1/transcribe      body {"language": "te" | "auto", "audio_b64": "<wav/flac/mp3 bytes>"}
                         ("auto": --detect-engine picks among --auto-languages, then routes)
                                 or {"language": "te", "audio_path": "/abs/path.wav"}
                           optional "engine" (overrides the route), "normalize": "plant" | "none"
                        -> {"text", "raw", "language", "engine", "model", "seconds"}
Errors answer 4xx/5xx with {"error": "<message>"}.
"""
import argparse
import base64
import io
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plantnorm  # noqa: E402

MAX_BODY_BYTES = 64 * 1024 * 1024


class Engine:
    """One lazily-loaded model. `kind` is sravaani | whisper | indicconformer."""

    def __init__(self, name: str, kind: str, source: str, device: str):
        self.name, self.kind, self.source, self.device = name, kind, source, device
        self.model = None
        self.lock = threading.Lock()

    def load(self):
        if self.model is not None:
            return
        import torch  # noqa: F401
        if self.kind == 'sravaani':
            from transformers import AutoModel
            sys.path.insert(0, self.source)
            self.model = AutoModel.from_pretrained(self.source, trust_remote_code=True).to(self.device).eval()
        elif self.kind == 'whisper':
            import torch
            from transformers import WhisperForConditionalGeneration, WhisperProcessor
            proc = WhisperProcessor.from_pretrained(self.source)
            mod = WhisperForConditionalGeneration.from_pretrained(self.source, dtype=torch.float16).to(self.device).eval()
            mod.generation_config.forced_decoder_ids = None
            self.model = (proc, mod)
        elif self.kind == 'indicconformer':
            import huggingface_hub
            from transformers import AutoModel
            original = huggingface_hub.snapshot_download
            huggingface_hub.snapshot_download = (
                lambda repo_id=None, **k: repo_id if os.path.isdir(str(repo_id)) else original(repo_id=repo_id, **k))
            self.model = AutoModel.from_pretrained(self.source, trust_remote_code=True)
        else:
            raise ValueError(f'unknown engine kind {self.kind!r}')

    def transcribe(self, wav, language: str) -> str:
        import numpy as np
        import torch
        with self.lock:
            self.load()
            if self.kind == 'sravaani':
                import tempfile
                import soundfile as sf
                with tempfile.NamedTemporaryFile(suffix='.wav') as f:
                    sf.write(f.name, wav, 16000)
                    hyp = self.model.transcribe([f.name], return_hypotheses=True)[0]
                return str(getattr(hyp, 'text', hyp)).strip()
            if self.kind == 'whisper':
                proc, mod = self.model
                feats = proc(wav, sampling_rate=16000, return_tensors='pt').input_features.to(self.device, torch.float16)
                tok = proc.tokenizer
                prefix = [tok.convert_tokens_to_ids(t) for t in
                          ('<|startoftranscript|>', f'<|{language}|>', '<|transcribe|>', '<|notimestamps|>')]
                with torch.inference_mode():
                    ids = mod.generate(feats, decoder_input_ids=torch.tensor([prefix], device=self.device),
                                       max_new_tokens=220, num_beams=1)
                return tok.decode(ids[0], skip_special_tokens=True).strip()
            return str(self.model(torch.from_numpy(np.asarray(wav, dtype='float32')).unsqueeze(0), language, 'rnnt')).strip()


    def detect_language(self, wav, candidates):
        """Whisper language ID restricted to ``candidates``: one decoder step after
        <|startoftranscript|>, softmax over the candidate language tokens only."""
        import torch
        if self.kind != 'whisper':
            raise ValueError(f'engine {self.name} ({self.kind}) cannot detect language; use a whisper engine')
        with self.lock:
            self.load()
            proc, mod = self.model
            feats = proc(wav, sampling_rate=16000, return_tensors='pt').input_features.to(self.device, torch.float16)
            tok = proc.tokenizer
            sot = tok.convert_tokens_to_ids('<|startoftranscript|>')
            ids = [tok.convert_tokens_to_ids(f'<|{c}|>') for c in candidates]
            with torch.inference_mode():
                logits = mod(input_features=feats, decoder_input_ids=torch.tensor([[sot]], device=self.device)).logits[0, -1]
            probs = torch.softmax(logits[ids].float(), dim=-1).tolist()
        scores = {c: round(p, 4) for c, p in zip(candidates, probs)}
        return max(scores, key=scores.get), scores


def _librosa_load(src):
    import librosa
    wav, _ = librosa.load(src, sr=16000)
    return wav


def decode_audio_bytes(data: bytes):
    """Decode any container ffmpeg understands (browser WebM/Opus, OGG, M4A) to
    16 kHz mono float32. Binary from STT_FFMPEG (default ``ffmpeg``)."""
    import subprocess
    import numpy as np
    cmd = [os.environ.get('STT_FFMPEG', 'ffmpeg'), '-v', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1']
    proc = subprocess.run(cmd, input=data, capture_output=True, timeout=float(os.environ.get('STT_FFMPEG_TIMEOUT_S', '60')))
    if proc.returncode != 0:
        raise ValueError(f'ffmpeg could not decode audio: {proc.stderr.decode(errors="replace").strip()[:300]}')
    return np.frombuffer(proc.stdout, dtype='<f4').copy()


def load_audio(body: dict, primary=None):
    """WAV/FLAC/MP3 via libsndfile (librosa); anything it cannot open (the
    composer's WebM/Opus) falls back to ffmpeg instead of a 422."""
    primary = primary or _librosa_load
    if isinstance(body.get('audio_b64'), str):
        data = base64.b64decode(body['audio_b64'], validate=True)
        try:
            return primary(io.BytesIO(data))
        except Exception:
            return decode_audio_bytes(data)
    if isinstance(body.get('audio_path'), str) and os.path.isabs(body['audio_path']):
        try:
            return primary(body['audio_path'])
        except Exception:
            with open(body['audio_path'], 'rb') as fh:
                return decode_audio_bytes(fh.read())
    raise ValueError('request needs "audio_b64" or an absolute "audio_path"')


class State:
    def __init__(self, routes: dict, engines: dict, detect_engine: str | None = None, auto_languages=None):
        self.routes, self.engines = routes, engines
        self.detect_engine = detect_engine
        self.auto_languages = list(auto_languages or [])


def make_handler(state: State):
    class Handler(BaseHTTPRequestHandler):
        server_version = 'hx-stt/1'

        def _send(self, code: int, doc: dict):
            raw = json.dumps(doc, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def log_message(self, fmt, *args):  # one line per request on stderr
            sys.stderr.write('%s %s\n' % (self.address_string(), fmt % args))

        def do_GET(self):
            if self.path.rstrip('/') == '/healthz':
                self._send(200, dict(ok=True, routes=state.routes,
                                     engines={k: f'{e.kind}:{e.source}' for k, e in state.engines.items()},
                                     loaded=[k for k, e in state.engines.items() if e.model is not None]))
            else:
                self._send(404, dict(error='not found'))

        def do_POST(self):
            if self.path.rstrip('/') != '/v1/transcribe':
                return self._send(404, dict(error='not found'))
            length = int(self.headers.get('Content-Length') or 0)
            if length <= 0 or length > MAX_BODY_BYTES:
                return self._send(413 if length > 0 else 400, dict(error='body missing or too large'))
            try:
                body = json.loads(self.rfile.read(length))
                language = body.get('language')
                if not isinstance(language, str) or not language:
                    raise ValueError('"language" must be a non-empty string')
                detected, scores = False, None
                if language == 'auto':
                    if not state.detect_engine or state.detect_engine not in state.engines or not state.auto_languages:
                        raise ValueError('language "auto" needs --detect-engine and --auto-languages on the sidecar')
                    wav = load_audio(body)
                    language, scores = state.engines[state.detect_engine].detect_language(wav, state.auto_languages)
                    detected = True
                name = body.get('engine') or state.routes.get(language) or state.routes.get('*')
                if name not in state.engines:
                    raise ValueError(f'no engine routed for language {language!r}')
                if not detected:
                    wav = load_audio(body)
            except (ValueError, json.JSONDecodeError) as error:
                return self._send(400, dict(error=str(error)))
            except Exception as error:  # unreadable audio
                return self._send(422, dict(error=f'unreadable audio: {error}'))
            engine = state.engines[name]
            started = time.time()
            try:
                raw = engine.transcribe(wav, language)
            except Exception as error:
                return self._send(500, dict(error=f'engine {name} failed: {error}'))
            text = plantnorm.fold(raw) if body.get('normalize', 'plant') == 'plant' else raw
            doc = dict(text=text, raw=raw, language=language, engine=name, model=engine.source,
                       seconds=round(time.time() - started, 3), detected=detected)
            if scores is not None:
                doc['languageScores'] = scores
            self._send(200, doc)
    return Handler


def parse_args(argv):
    p = argparse.ArgumentParser(description='Hyperion STT sidecar')
    p.add_argument('--host', default=os.environ.get('STT_HOST', '127.0.0.1'))
    p.add_argument('--port', type=int, default=int(os.environ.get('STT_PORT', '8790')))
    p.add_argument('--device', default='cuda')
    p.add_argument('--engine', action='append', default=[], help='name=kind:source (kind: sravaani|whisper|indicconformer)')
    p.add_argument('--route', action='append', default=[], help='language=engine-name ("*" = fallback)')
    p.add_argument('--preload', action='store_true', help='load every routed engine before serving')
    p.add_argument('--detect-engine', default=os.environ.get('STT_DETECT_ENGINE', ''),
                   help='whisper engine used for language="auto" (env STT_DETECT_ENGINE)')
    p.add_argument('--auto-languages', default=os.environ.get('STT_AUTO_LANGUAGES', 'te,hi,en'),
                   help='candidate languages for language="auto" (env STT_AUTO_LANGUAGES, default te,hi,en)')
    return p.parse_args(argv)


def main(argv):
    a = parse_args(argv)
    engines = {}
    for spec in a.engine:
        name, rest = spec.split('=', 1)
        kind, source = rest.split(':', 1)
        engines[name] = Engine(name, kind, source, 'cpu' if kind == 'indicconformer' else a.device)
    routes = dict(r.split('=', 1) for r in a.route)
    missing = sorted(set(routes.values()) - set(engines))
    if missing:
        print(f'stt-server: routes name unknown engines {missing}', file=sys.stderr)
        return 2
    if a.preload:
        for name in sorted(set(routes.values())):
            t = time.time(); engines[name].load(); print(f'loaded {name} in {time.time() - t:.1f}s', file=sys.stderr, flush=True)
    if a.detect_engine and a.detect_engine not in engines:
        print(f'stt-server: --detect-engine names unknown engine {a.detect_engine!r}', file=sys.stderr)
        return 2
    auto = [x.strip() for x in a.auto_languages.split(',') if x.strip()]
    server = ThreadingHTTPServer((a.host, a.port), make_handler(State(routes, engines, a.detect_engine or None, auto)))
    print(f'stt-server listening on {a.host}:{a.port} routes={routes}', file=sys.stderr, flush=True)
    server.serve_forever()
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
