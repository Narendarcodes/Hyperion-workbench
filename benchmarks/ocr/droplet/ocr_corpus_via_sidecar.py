#!/usr/bin/env python3
"""OCR a folder of PDFs through the Hyperion OCR sidecar. usage: <pdf_dir> <out_dir> [parallel_docs]"""
import sys, os, json, base64, time, urllib.request, concurrent.futures as cf
src, out = sys.argv[1], sys.argv[2]; P = int(sys.argv[3]) if len(sys.argv) > 3 else 3
URL = os.environ.get('SIDECAR', 'http://127.0.0.1:8111') + '/v1/ocr/pdf'
os.makedirs(out, exist_ok=True)
files = sorted(f for f in os.listdir(src) if f.endswith('.pdf'))
def one(f):
    dst = os.path.join(out, f[:-4] + '.json')
    if os.path.exists(dst): return 0
    data = base64.b64encode(open(os.path.join(src, f), 'rb').read()).decode()
    t0 = time.time(); pages_done = []; off = 1; count = None
    while count is None or off <= count:
        body = json.dumps({'pdf_base64': data, 'page_offset': off, 'page_limit': 50}).encode()
        r = json.loads(urllib.request.urlopen(urllib.request.Request(URL, body, {'Content-Type': 'application/json'}), timeout=1800).read())
        count = r['page_count']; pages_done += r['pages']; off += 50
    json.dump({'doc': f[:-4], 'page_count': count, 'model': r['model'], 'preset': r['preset'], 'pages': pages_done, 'wall_s': round(time.time() - t0, 1)}, open(dst, 'w'), ensure_ascii=False)
    return count
t0 = time.time()
with cf.ThreadPoolExecutor(P) as ex: n = sum(ex.map(one, files))
w = time.time() - t0
json.dump({'docs': len(files), 'pages': n, 'wall_s': round(w, 1), 'pages_per_min': round(n / w * 60, 2) if n else None}, open(os.path.join(out, '_run.json'), 'w'))
print('done', len(files), n, w)
