#!/usr/bin/env python3
"""Hyperion OCR sidecar: renders PDF pages and transcribes them with a VLM behind an
OpenAI-compatible endpoint (vLLM). Stdlib HTTP server + PyMuPDF + Pillow; no web framework.

Endpoints
  GET  /health                -> {"ok", "model", "preset", "upstream_ok"}
  POST /v1/ocr/pdf            {"pdf_base64", "page_offset"=1, "page_limit"=10}
                              -> {"page_count", "model", "preset", "pages": [{"number", "text", "latency_s"}], "wall_s"}
  POST /v1/ocr/image          {"image_base64"} -> {"page_count": 1, "pages": [{"number": 1, "text"}], ...}

Raw page text is returned unguarded on purpose: the caller (read_pdf in @deepseek-ai/dsh-tool-fs)
runs every page through the OCR guard (@deepseek-ai/dsh-ocr-guard) before the model sees it.

Environment
  OCR_UPSTREAM     http://127.0.0.1:8110/v1   OpenAI-compatible VLM server
  OCR_MODEL        ocr                        served model name
  OCR_PRESET       qwen-vl                    prompt/resize preset: qwen-vl | olmocr | deepseek-ocr
  OCR_HOST/PORT    127.0.0.1 / 8111
  OCR_CONCURRENCY  16                         parallel page requests to the VLM
  OCR_DPI          200                        PDF render resolution
  OCR_MAX_PAGES    50                         largest page window per request
  OCR_MAX_BYTES    26214400                   largest PDF accepted (25 MiB, same as read_pdf)
  OCR_API_KEY      (unset)                    if set, require "Authorization: Bearer <key>"
"""
import base64, io, json, os, re, sys, time, urllib.request, concurrent.futures as cf
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PRESETS = {
    'qwen-vl': dict(longest=1600, max_tokens=6000, temperature=0.0, extra={},
        prompt=('Transcribe all text on this scanned page in natural reading order as Markdown. Render every table as a Markdown table '
                '(one table row per line, one cell per column). Copy equipment tags, codes, numbers, units and symbols exactly as printed. '
                'For diagrams, transcribe the visible labels and tags. Output only the transcription.')),
    'olmocr': dict(longest=1288, max_tokens=7000, temperature=0.1, extra={},
        prompt=('Attached is one page of a document that you must process. Just return the plain text representation of this document '
                'as if you were reading it naturally. Convert equations to LateX and tables to HTML.\nIf there are any figures or charts, label them '
                'with the following markdown syntax ![Alt text describing the contents of the figure](page_startx_starty_width_height.png)\nReturn your '
                'output as markdown, with a front matter section on top specifying values for the primary_language, is_rotation_valid, '
                'rotation_correction, is_table, and is_diagram parameters.')),
    'deepseek-ocr': dict(longest=1280, max_tokens=6000, temperature=0.0, prompt='Convert the document to markdown.',
        extra={'skip_special_tokens': False, 'vllm_xargs': {'ngram_size': 30, 'window_size': 90, 'whitelist_token_ids': [128821, 128822]}}),
}

CFG = dict(
    upstream=os.environ.get('OCR_UPSTREAM', 'http://127.0.0.1:8110/v1').rstrip('/'),
    model=os.environ.get('OCR_MODEL', 'ocr'),
    preset=os.environ.get('OCR_PRESET', 'qwen-vl'),
    host=os.environ.get('OCR_HOST', '127.0.0.1'),
    port=int(os.environ.get('OCR_PORT', '8111')),
    concurrency=int(os.environ.get('OCR_CONCURRENCY', '16')),
    dpi=int(os.environ.get('OCR_DPI', '200')),
    max_pages=int(os.environ.get('OCR_MAX_PAGES', '50')),
    max_bytes=int(os.environ.get('OCR_MAX_BYTES', str(25 * 1024 * 1024))),
    api_key=os.environ.get('OCR_API_KEY') or None,
)


class OcrError(Exception):
    def __init__(self, status, message):
        super().__init__(message); self.status = status


def clean_output(text):
    """Strip a wrapping ```markdown fence and olmOCR's YAML front matter; leave content untouched."""
    t = (text or '').strip()
    m = re.fullmatch(r'```[a-zA-Z]*\s*\n(.*?)\n?```', t, flags=re.S)
    if m: t = m.group(1)
    t = re.sub(r'\A---\n(?:[a-z_]+:.*\n)+---\n?', '', t)
    return t.strip()


def resize_png(img, longest):
    from PIL import Image
    im = img.convert('RGB')
    s = longest / max(im.size)
    if s < 1: im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'PNG'); return b.getvalue()


def render_pdf(pdf_bytes, page_offset, page_limit, dpi):
    """Return (page_count, [(page_number, PIL.Image)]) for the 1-based window."""
    try:
        import pymupdf
    except ImportError:  # older PyMuPDF wheels only expose the legacy name
        import fitz as pymupdf
    from PIL import Image
    try:
        doc = pymupdf.open(stream=pdf_bytes, filetype='pdf')
    except Exception as e:
        raise OcrError(400, f'not a readable PDF: {e}')
    count = doc.page_count
    out = []
    for n in range(page_offset, min(count, page_offset + page_limit - 1) + 1):
        pix = doc[n - 1].get_pixmap(dpi=dpi)
        out.append((n, Image.frombytes('RGB' if pix.n < 4 else 'RGBA', (pix.width, pix.height), pix.samples)))
    return count, out


def vlm_page(png_bytes, preset=None, upstream=None, model=None, opener=urllib.request.urlopen):
    p = PRESETS[preset or CFG['preset']]
    body = {'model': model or CFG['model'], 'temperature': p['temperature'], 'max_tokens': p['max_tokens'],
            'messages': [{'role': 'user', 'content': [
                {'type': 'image_url', 'image_url': {'url': 'data:image/png;base64,' + base64.b64encode(png_bytes).decode()}},
                {'type': 'text', 'text': p['prompt']}]}]}
    body.update(p['extra'])
    req = urllib.request.Request((upstream or CFG['upstream']) + '/chat/completions', json.dumps(body).encode(), {'Content-Type': 'application/json'})
    try:
        with opener(req, timeout=600) as r:
            d = json.loads(r.read())
    except OcrError:
        raise
    except Exception as e:
        raise OcrError(502, f'VLM upstream failed: {e}')
    return clean_output(d['choices'][0]['message'].get('content') or '')


def ocr_images(images, transcribe=vlm_page):
    """images: [(number, PIL.Image)] -> [{"number", "text", "latency_s"}] in page order."""
    longest = PRESETS[CFG['preset']]['longest']
    def one(item):
        n, im = item; t0 = time.time()
        return {'number': n, 'text': transcribe(resize_png(im, longest)), 'latency_s': round(time.time() - t0, 2)}
    with cf.ThreadPoolExecutor(max(1, CFG['concurrency'])) as ex:
        return sorted(ex.map(one, images), key=lambda p: p['number'])


def handle_pdf(payload, transcribe=vlm_page):
    try:
        data = base64.b64decode(payload.get('pdf_base64') or '', validate=True)
    except Exception:
        raise OcrError(400, 'pdf_base64 is not valid base64')
    if not data: raise OcrError(400, 'pdf_base64 is required')
    if len(data) > CFG['max_bytes']: raise OcrError(413, f"PDF exceeds {CFG['max_bytes']} bytes")
    off, lim = payload.get('page_offset', 1), payload.get('page_limit', 10)
    if not (isinstance(off, int) and off >= 1 and isinstance(lim, int) and 1 <= lim <= CFG['max_pages']):
        raise OcrError(400, f"page_offset must be >=1 and page_limit in 1..{CFG['max_pages']}")
    t0 = time.time()
    count, images = render_pdf(data, off, lim, CFG['dpi'])
    pages = ocr_images(images, transcribe)
    return {'page_count': count, 'model': CFG['model'], 'preset': CFG['preset'], 'pages': pages, 'wall_s': round(time.time() - t0, 2)}


def handle_image(payload, transcribe=vlm_page):
    from PIL import Image
    try:
        im = Image.open(io.BytesIO(base64.b64decode(payload.get('image_base64') or '', validate=True)))
        im.load()
    except Exception:
        raise OcrError(400, 'image_base64 is not a readable image')
    t0 = time.time()
    return {'page_count': 1, 'model': CFG['model'], 'preset': CFG['preset'], 'pages': ocr_images([(1, im)], transcribe), 'wall_s': round(time.time() - t0, 2)}


class Handler(BaseHTTPRequestHandler):
    server_version = 'hyperion-ocr/1'

    def _send(self, status, obj):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def _authorized(self):
        return not CFG['api_key'] or self.headers.get('Authorization') == f"Bearer {CFG['api_key']}"

    def do_GET(self):
        if self.path != '/health': return self._send(404, {'error': 'not found'})
        ok = True
        try: urllib.request.urlopen(CFG['upstream'] + '/models', timeout=5).read()
        except Exception: ok = False
        self._send(200, {'ok': True, 'model': CFG['model'], 'preset': CFG['preset'], 'upstream_ok': ok})

    def do_POST(self):
        if not self._authorized(): return self._send(401, {'error': 'unauthorized'})
        routes = {'/v1/ocr/pdf': handle_pdf, '/v1/ocr/image': handle_image}
        if self.path not in routes: return self._send(404, {'error': 'not found'})
        try:
            n = int(self.headers.get('Content-Length') or 0)
            if n > CFG['max_bytes'] * 4 // 3 + 4096: raise OcrError(413, 'request too large')
            payload = json.loads(self.rfile.read(n) or b'{}')
            self._send(200, routes[self.path](payload))
        except OcrError as e:
            self._send(e.status, {'error': str(e)})
        except json.JSONDecodeError:
            self._send(400, {'error': 'body must be JSON'})
        except Exception as e:  # pragma: no cover
            self._send(500, {'error': f'internal error: {e}'})

    def log_message(self, fmt, *args):
        sys.stderr.write('[ocr-sidecar] ' + (fmt % args) + '\n')


def main():
    if CFG['preset'] not in PRESETS: sys.exit(f"OCR_PRESET must be one of {sorted(PRESETS)}")
    srv = ThreadingHTTPServer((CFG['host'], CFG['port']), Handler)
    print(f"[ocr-sidecar] listening on {CFG['host']}:{CFG['port']} -> {CFG['upstream']} ({CFG['model']}, preset {CFG['preset']})", flush=True)
    srv.serve_forever()


if __name__ == '__main__':
    main()
