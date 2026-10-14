#!/usr/bin/env python3
"""MinerU2.5 (two-step layout+recognition) via mineru-vl-utils http client against vLLM on :8110."""
import sys, os, json, time, inspect
from PIL import Image
from mineru_vl_utils import MinerUClient
ev, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
kw = dict(backend='http-client', server_url='http://127.0.0.1:8110')
sig = inspect.signature(MinerUClient.__init__).parameters
if 'model_name' in sig: kw['model_name'] = 'ocr'
if 'max_concurrency' in sig: kw['max_concurrency'] = 32
client = MinerUClient(**kw)
items = [json.loads(l) for l in open(os.path.join(ev, 'manifest.jsonl'))]
imgs = [Image.open(os.path.join(ev, it['image'])).convert('RGB') for it in items]
t0 = time.time()
try:
    res = client.batch_two_step_extract(imgs); err = None
except Exception as e:
    import traceback; traceback.print_exc(); res = [None] * len(items); err = repr(e)[:500]
w = time.time() - t0
for it, blocks in zip(items, res):
    parts = []
    for b in blocks or []:
        d = b if isinstance(b, dict) else getattr(b, '__dict__', {})
        c = d.get('content') or ''
        if c: parts.append(c)
    json.dump({'id': it['id'], 'engine': 'mineru25', 'text': '\n\n'.join(parts), 'error': err, 'latency_s': None,
               'blocks': [{k: (v if isinstance(v, (str, int, float, list)) else str(v)) for k, v in ((b if isinstance(b, dict) else b.__dict__).items())} for b in (blocks or [])][:400]},
              open(os.path.join(out, it['id'] + '.json'), 'w'), ensure_ascii=False)
json.dump({'engine': 'mineru25', 'pages': len(items), 'wall_s': round(w, 1), 'pages_per_min': round(len(items) / w * 60, 2), 'concurrency': kw.get('max_concurrency')}, open(os.path.join(out, '_run.json'), 'w'))
print('done', w, err)
