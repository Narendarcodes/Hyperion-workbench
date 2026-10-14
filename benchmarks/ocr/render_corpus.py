#!/usr/bin/env python3
"""Render all 300 Hyperion synthetic docs to scanned-looking, image-only PDFs (light/medium degradation).
usage: render_corpus.py <documents.jsonl> <out_dir> [workers]"""
import sys, os, json, io, random
from multiprocessing import Pool
import numpy as np
sys.argv_saved = list(sys.argv)
import build_evalset as B
from PIL import Image

def one(args):
    k, doc, out = args
    random.seed(k); np.random.seed(k)
    dst = os.path.join(out, doc['doc_id'] + '.pdf')
    if os.path.exists(dst): return doc['doc_id'], -1
    clean = os.path.join(out, '_clean', doc['doc_id'] + '.pdf')
    B.render_doc(doc, clean)
    pdf = B.pymupdf.open(clean)
    imgs = []
    for i in range(pdf.page_count):
        img, _ = B.degrade(B.raster(pdf[i]), (k + i) % 2)
        imgs.append(Image.fromarray(img).convert('RGB'))
    imgs[0].save(dst, save_all=True, append_images=imgs[1:], resolution=B.DPI)
    return doc['doc_id'], pdf.page_count

if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]; W = int(sys.argv[3]) if len(sys.argv) > 3 else 8
    os.makedirs(os.path.join(out, '_clean'), exist_ok=True)
    docs = [json.loads(l) for l in open(src)]
    with Pool(W) as p:
        res = p.map(one, [(k, d, out) for k, d in enumerate(docs)])
    json.dump({d: n for d, n in res}, open(os.path.join(out, '_pages.json'), 'w'))
    print('docs', len(res), 'pages', sum(n for _, n in res if n > 0))
