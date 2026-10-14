#!/usr/bin/env python3
"""Send every eval page to the OCR server, save raw outputs + timing. usage: run_vlm.py <engine> <evalset_dir> <out_dir> [concurrency]"""
import sys, json, base64, io, time, os, concurrent.futures as cf, urllib.request
from PIL import Image
engine, ev, out = sys.argv[1], sys.argv[2], sys.argv[3]
conc = int(sys.argv[4]) if len(sys.argv) > 4 else 16
URL = os.environ.get('OCR_URL', 'http://127.0.0.1:8110/v1/chat/completions')
OLMOCR_PROMPT = ("Attached is one page of a document that you must process. Just return the plain text representation of this document "
  "as if you were reading it naturally. Convert equations to LateX and tables to HTML.\nIf there are any figures or charts, label them with "
  "the following markdown syntax ![Alt text describing the contents of the figure](page_startx_starty_width_height.png)\nReturn your output as "
  "markdown, with a front matter section on top specifying values for the primary_language, is_rotation_valid, rotation_correction, is_table, "
  "and is_diagram parameters.")
QWEN_PROMPT = ("Transcribe all text on this scanned page in natural reading order as Markdown. Render every table as a Markdown table "
  "(one table row per line, one cell per column). Copy equipment tags, codes, numbers, units and symbols exactly as printed. "
  "For diagrams, transcribe the visible labels and tags. Output only the transcription.")
CFG = {
  'qwen3vl': dict(prompt=QWEN_PROMPT, longest=1600, max_tokens=6000, temperature=0.0),
  'olmocr': dict(prompt=OLMOCR_PROMPT, longest=1288, max_tokens=7000, temperature=0.1),
  'deepseekocr': dict(prompt='Convert the document to markdown.', longest=1280, max_tokens=6000, temperature=0.0,
                      extra={'skip_special_tokens': False, 'vllm_xargs': {'ngram_size': 30, 'window_size': 90, 'whitelist_token_ids': [128821, 128822]}}),
}[engine]
os.makedirs(out, exist_ok=True)
items = [json.loads(l) for l in open(os.path.join(ev, 'manifest.jsonl'))]
def enc(path):
    im = Image.open(path).convert('RGB'); s = CFG['longest'] / max(im.size)
    if s < 1: im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'PNG'); return base64.b64encode(b.getvalue()).decode()
def one(it):
    dst = os.path.join(out, it['id'] + '.json')
    if os.path.exists(dst): return json.load(open(dst))
    img = enc(os.path.join(ev, it['image']))
    body = {'model': 'ocr', 'temperature': CFG['temperature'], 'max_tokens': CFG['max_tokens'],
            'messages': [{'role': 'user', 'content': [{'type': 'image_url', 'image_url': {'url': 'data:image/png;base64,' + img}},
                                                       {'type': 'text', 'text': CFG['prompt']}]}]}
    body.update(CFG.get('extra', {}))
    t0 = time.time(); err = None; text = ''; usage = {}
    try:
        r = urllib.request.urlopen(urllib.request.Request(URL, json.dumps(body).encode(), {'Content-Type': 'application/json'}), timeout=900)
        d = json.loads(r.read()); text = d['choices'][0]['message']['content'] or ''; usage = d.get('usage', {})
        fin = d['choices'][0].get('finish_reason')
    except Exception as e:
        err = repr(e)[:500]; fin = None
    rec = {'id': it['id'], 'engine': engine, 'text': text, 'latency_s': round(time.time() - t0, 2), 'error': err, 'usage': usage, 'finish_reason': fin}
    json.dump(rec, open(dst, 'w'), ensure_ascii=False); return rec
t0 = time.time()
with cf.ThreadPoolExecutor(conc) as ex: recs = list(ex.map(one, items))
wall = time.time() - t0
summ = {'engine': engine, 'pages': len(recs), 'errors': sum(1 for r in recs if r['error']), 'wall_s': round(wall, 1),
        'pages_per_min': round(len(recs) / wall * 60, 2), 'concurrency': conc}
json.dump(summ, open(os.path.join(out, '_run.json'), 'w')); print(json.dumps(summ))
