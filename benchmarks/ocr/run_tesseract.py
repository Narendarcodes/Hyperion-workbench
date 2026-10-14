#!/usr/bin/env python3
import sys, os, json, time, subprocess, concurrent.futures as cf
ev, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
items = [json.loads(l) for l in open(os.path.join(ev, 'manifest.jsonl'))]
def one(it):
    t0 = time.time()
    p = subprocess.run(['tesseract', os.path.join(ev, it['image']), '-', '--psm', '3', '-l', 'eng'], capture_output=True, text=True,
                       env={**os.environ, 'OMP_THREAD_LIMIT': '1'})
    rec = {'id': it['id'], 'engine': 'tesseract', 'text': p.stdout, 'latency_s': round(time.time() - t0, 2), 'error': None if p.returncode == 0 else p.stderr[-300:]}
    json.dump(rec, open(os.path.join(out, it['id'] + '.json'), 'w'))
t0 = time.time(); W = int(sys.argv[3]) if len(sys.argv) > 3 else 4
with cf.ThreadPoolExecutor(W) as ex: list(ex.map(one, items))
w = time.time() - t0
json.dump({'engine': 'tesseract', 'pages': len(items), 'wall_s': round(w, 1), 'pages_per_min': round(len(items) / w * 60, 2), 'workers': W, 'device': f'sandbox CPU x{W}'}, open(os.path.join(out, '_run.json'), 'w'))
