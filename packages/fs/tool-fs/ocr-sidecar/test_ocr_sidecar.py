"""Unit tests for the OCR sidecar (no GPU, no network): python -m pytest test_ocr_sidecar.py"""
import base64, io, json, threading, urllib.request, urllib.error
import pytest
try:
    import pymupdf
except ImportError:
    pymupdf = pytest.importorskip('fitz')
from PIL import Image
import ocr_sidecar as S


def make_pdf(pages=3):
    doc = pymupdf.open()
    for i in range(pages):
        p = doc.new_page(); p.insert_text((72, 72), f'Page {i + 1} tag P-10{i}A')
    return doc.tobytes()


def fake_transcribe(png):
    im = Image.open(io.BytesIO(png)); assert max(im.size) <= S.PRESETS[S.CFG['preset']]['longest']
    return f'w{im.width}'


def test_clean_output_strips_fence_and_front_matter():
    assert S.clean_output('```markdown\n| a | b |\n```') == '| a | b |'
    assert S.clean_output('---\nprimary_language: en\nis_table: True\n---\nHello') == 'Hello'
    assert S.clean_output('plain --- text') == 'plain --- text'


def test_handle_pdf_window_and_order():
    pdf = base64.b64encode(make_pdf(3)).decode()
    out = S.handle_pdf({'pdf_base64': pdf, 'page_offset': 2, 'page_limit': 5}, transcribe=fake_transcribe)
    assert out['page_count'] == 3
    assert [p['number'] for p in out['pages']] == [2, 3]
    assert all(p['text'].startswith('w') for p in out['pages'])


def test_handle_pdf_validation():
    with pytest.raises(S.OcrError) as e: S.handle_pdf({'pdf_base64': '!!'}, transcribe=fake_transcribe)
    assert e.value.status == 400
    with pytest.raises(S.OcrError) as e: S.handle_pdf({'pdf_base64': base64.b64encode(b'not a pdf').decode()}, transcribe=fake_transcribe)
    assert e.value.status == 400
    with pytest.raises(S.OcrError) as e: S.handle_pdf({'pdf_base64': base64.b64encode(make_pdf(1)).decode(), 'page_limit': 999}, transcribe=fake_transcribe)
    assert 'page_limit' in str(e.value)


def test_vlm_page_request_shape():
    seen = {}
    class R:
        def __enter__(self): return self
        def __exit__(self, *a): pass
        def read(self): return json.dumps({'choices': [{'message': {'content': '```\nTag MTR-LT-02-A01\n```'}}]}).encode()
    def opener(req, timeout):
        seen['url'] = req.full_url; seen['body'] = json.loads(req.data); return R()
    assert S.vlm_page(b'png', preset='deepseek-ocr', upstream='http://x/v1', model='m', opener=opener) == 'Tag MTR-LT-02-A01'
    assert seen['url'] == 'http://x/v1/chat/completions'
    assert seen['body']['model'] == 'm' and seen['body']['skip_special_tokens'] is False
    assert seen['body']['messages'][0]['content'][1]['text'] == 'Convert the document to markdown.'


def test_http_roundtrip_with_auth(monkeypatch):
    monkeypatch.setitem(S.CFG, 'api_key', 'k')
    monkeypatch.setattr(S, 'vlm_page', lambda png, **kw: 'ok')
    monkeypatch.setattr(S, 'handle_pdf', lambda payload, transcribe=None: S.__dict__['_orig_handle_pdf'](payload, transcribe=lambda png: 'ok'))
    srv = S.ThreadingHTTPServer(('127.0.0.1', 0), S.Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    direct = urllib.request.build_opener(urllib.request.ProxyHandler({}))  # ignore any http_proxy env
    url = f'http://127.0.0.1:{srv.server_address[1]}/v1/ocr/pdf'
    body = json.dumps({'pdf_base64': base64.b64encode(make_pdf(1)).decode()}).encode()
    with pytest.raises(urllib.error.HTTPError) as e:
        direct.open(urllib.request.Request(url, body, {'Content-Type': 'application/json'}))
    assert e.value.code == 401
    r = direct.open(urllib.request.Request(url, body, {'Content-Type': 'application/json', 'Authorization': 'Bearer k'}))
    d = json.loads(r.read())
    assert d['page_count'] == 1 and d['pages'][0]['text'] == 'ok'
    srv.shutdown()


S._orig_handle_pdf = S.handle_pdf
