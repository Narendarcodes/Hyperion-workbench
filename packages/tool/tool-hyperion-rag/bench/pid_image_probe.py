#!/usr/bin/env python3
"""Probe: EmbeddingGemma 2 image-chunk embedding of P&ID pages.

  pid_image_probe.py --pdf DOC-012.pdf --processed DOC-012.json --pages 558-590 --out DIR

DOC-012 is Kuphaldt, Lessons In Industrial Instrumentation (CC-BY-4.0), Ch.7
(PFD / P&ID / loop diagrams / symbols / tags). These are TRAINING diagrams,
not as-built plant P&IDs.

Method: each page is rendered to PNG (PyMuPDF, 110 dpi). gpt-oss-120b writes
one short search query per page from that page's extracted text (what an
engineer would type to find the diagram). Retrieval of the right page among
all probe pages is then compared for three page representations in the same
EmbeddingGemma 2 space: (a) page text only, (b) page image only, (c) one
interleaved text+image embedding, plus (d) RRF of (a) and (b).
Small-n probe; queries are text-derived, which favours (a).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))

from hyperion_rag.dense import DenseEncoder, doc_text, search  # noqa: E402
from hyperion_rag.pipeline import LLM, parse_json_obj, rrf  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--processed", required=True)
    ap.add_argument("--pages", default="558-590")
    ap.add_argument("--out", required=True)
    ap.add_argument("--llm-url", default="http://127.0.0.1:8001/v1")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    import fitz  # PyMuPDF
    from PIL import Image

    lo, hi = (int(x) for x in a.pages.split("-"))
    pt = {p["page"]: p["text"] for p in json.load(open(a.processed))["page_text"]}
    pdf = fitz.open(a.pdf)
    pages = [p for p in range(lo, hi + 1) if p <= pdf.page_count and pt.get(p, "").strip()]
    imgs = []
    for p in pages:
        pix = pdf[p - 1].get_pixmap(dpi=110)
        path = os.path.join(a.out, f"DOC-012_p{p}.png")
        pix.save(path)
        imgs.append(Image.open(path).convert("RGB"))
    llm = LLM(a.llm_url)
    queries = []
    for p in pages:
        raw = llm.chat([{"role": "user", "content":
                         "Write ONE short search query (max 15 words) an instrument engineer would type to find "
                         "the diagram/figure on this textbook page. Do not quote headings verbatim. Reply as JSON "
                         "{\"query\": \"...\"}.\n\nPAGE TEXT:\n" + pt[p][:3500]}], max_tokens=800)
        obj = parse_json_obj(raw) or {}
        queries.append(str(obj.get("query") or pt[p][:80]))
    t0 = time.time()
    enc = DenseEncoder(multimodal=True)
    load_s = time.time() - t0
    t1 = time.time()
    e_text = enc.encode_docs([doc_text("DOC-012 Kuphaldt Ch.7", pt[p][:6000]) for p in pages])
    e_img = enc.encode_images(imgs)
    e_mix = enc.encode_images(imgs, captions=[f"DOC-012 page {p}: " + pt[p][:1500].replace("\n", " ") for p in pages])
    emb_s = time.time() - t1
    qv = enc.encode_queries(queries)
    res = {}
    lists = {}
    for name, mat in (("text", e_text), ("image", e_img), ("text+image interleaved", e_mix)):
        lists[name] = [search(mat, qv[i], len(pages)) for i in range(len(pages))]
    lists["rrf(text,image)"] = [rrf([lists["text"][i], lists["image"][i]]) for i in range(len(pages))]
    for name, ls in lists.items():
        r1 = r5 = mrr = 0.0
        for i, lst in enumerate(ls):
            ranks = [j for j, _ in lst]
            r = ranks.index(i) + 1 if i in ranks else 999
            r1 += r <= 1
            r5 += r <= 5
            mrr += 1 / r if r < 999 else 0
        n = len(pages)
        res[name] = {"hit@1": round(r1 / n, 3), "hit@5": round(r5 / n, 3), "mrr": round(mrr / n, 3)}
    import torch

    out = {"pages": pages, "n": len(pages), "queries": queries, "results": res,
           "model": enc.model_id, "multimodal_load_s": round(load_s, 1), "embed_s": round(emb_s, 1),
           "peak_vram_gb": round(torch.cuda.max_memory_allocated() / 2**30, 2) if torch.cuda.is_available() else None}
    json.dump(out, open(os.path.join(a.out, "pid_probe.json"), "w"), indent=1)
    print(json.dumps(res))


if __name__ == "__main__":
    main()
