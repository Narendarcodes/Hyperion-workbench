#!/usr/bin/env python3
"""PaddleOCR (PP-OCRv5, CPU) runner. usage: run_paddle.py <evalset> <out>"""
import sys, os, json, time
os.environ.setdefault('OMP_NUM_THREADS', '8')
from paddleocr import PaddleOCR
ev, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
ocr = PaddleOCR(use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False, device='cpu', cpu_threads=8)
items = [json.loads(l) for l in open(os.path.join(ev, 'manifest.jsonl'))]
t0 = time.time()
for it in items:
    dst = os.path.join(out, it['id'] + '.json')
    t1 = time.time(); err = None; text = ''
    try:
        res = ocr.predict(os.path.join(ev, it['image']))
        r = res[0]; j = r.json if hasattr(r, 'json') else r
        j = j.get('res', j)
        texts, boxes = j['rec_texts'], j['rec_boxes']
        # reading order: group into lines by y, then x
        rows = sorted(zip(texts, boxes), key=lambda tb: (tb[1][1], tb[1][0]))
        lines, cur, cy = [], [], None
        for t, b in rows:
            yc = (b[1] + b[3]) / 2; h = b[3] - b[1]
            if cy is not None and abs(yc - cy) > max(8, 0.5 * h):
                lines.append(' '.join(x for x, _ in sorted(cur, key=lambda tb: tb[1][0]))); cur = []
            cur.append((t, b)); cy = yc if cy is None or not cur[:-1] else (cy + yc) / 2
        if cur: lines.append(' '.join(x for x, _ in sorted(cur, key=lambda tb: tb[1][0])))
        text = '\n'.join(lines)
    except Exception as e:
        err = repr(e)[:500]
    json.dump({'id': it['id'], 'engine': 'paddleocr', 'text': text, 'latency_s': round(time.time() - t1, 2), 'error': err}, open(dst, 'w'))
w = time.time() - t0
json.dump({'engine': 'paddleocr', 'pages': len(items), 'wall_s': round(w, 1), 'pages_per_min': round(len(items) / w * 60, 2), 'device': 'droplet CPU, 8 threads, sequential'}, open(os.path.join(out, '_run.json'), 'w'))
print('done', w)
