#!/usr/bin/env python3
"""Hyperion RAG CLI (EmbeddingGemma 2 + BM25 hybrid, reranker, gpt-oss answers).

  rag.py index --corpus PATH [PATH...] --out INDEX_DIR [--embed] [--model ID]
  rag.py query --index INDEX_DIR [REQUEST.json | -]

``query`` reads ``{"question", "mode"?, "k"?, "dim"?, "answer"?, "report"?, "llm_url"?, "gate"?}`` from the
file or stdin and prints one JSON object: ``hits`` (each with doc id, page,
char span, section, text, href) and, when ``answer`` is true, the grounded
answer with verified citations or an abstention. If dense/rerank deps or
vectors are unavailable the request degrades to BM25 and says so in
``degraded`` (never silently). Exit 0 on success, 2 on input/tool error with
``{"error": ...}`` on stdout.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hyperion_rag.pipeline import (LLM, Index, answer, answer_report, named_doc_hits,  # noqa: E402
                                   render_markdown, render_report_markdown, retrieve)

MODES = ("bm25", "dense", "hybrid", "hybrid_rerank", "bm25_rerank")


def fail(msg: str) -> None:
    print(json.dumps({"error": msg}))
    sys.exit(2)


def cmd_index(a) -> None:
    idx = Index.build(a.corpus, a.max_chars, a.min_chars)
    if a.embed:
        from hyperion_rag.dense import DenseEncoder

        idx.embed(DenseEncoder(a.model))
    idx.save(a.out)
    print(json.dumps({"ok": True, **idx.meta}))


def cmd_query(a) -> None:
    raw = sys.stdin.read() if a.request in (None, "-") else open(a.request, encoding="utf-8").read()
    try:
        req = json.loads(raw)
    except Exception:
        fail("request is not JSON")
    q = str(req.get("question", "")).strip()
    if not q:
        fail("question is required")
    mode = req.get("mode", "hybrid_rerank")
    if mode not in MODES:
        fail(f"mode must be one of {MODES}")
    k = int(req.get("k", 5))
    dim = int(req.get("dim", 768))
    if dim not in (128, 256, 512, 768):
        fail("dim must be 128, 256, 512 or 768")
    idx = Index.load(a.index)
    degraded = None
    encoder = reranker = None
    if mode in ("dense", "hybrid", "hybrid_rerank"):
        try:
            if idx.dense is None:
                raise RuntimeError("index has no dense vectors")
            from hyperion_rag.dense import DenseEncoder

            encoder = DenseEncoder(idx.meta.get("embedding_model", "google/embeddinggemma-2"))
        except Exception as exc:
            degraded = f"dense unavailable ({type(exc).__name__}: {str(exc)[:160]}); used bm25"
            mode = "bm25_rerank" if mode == "hybrid_rerank" else "bm25"
    if mode.endswith("_rerank"):
        try:
            from hyperion_rag.rerank import Reranker

            reranker = Reranker()
        except Exception as exc:
            degraded = (degraded + "; " if degraded else "") + f"reranker unavailable ({type(exc).__name__}); no rerank"
            mode = mode.replace("_rerank", "")
    hits = retrieve(idx, q, mode, k, dim, encoder, reranker)
    out = {
        "question": q, "mode": mode, "dim": dim, "degraded": degraded,
        "hits": [{**{key: getattr(idx.chunks[h.idx], key) for key in
                     ("chunk_id", "doc_id", "page", "char_start", "char_end", "section", "text")},
                  "href": f"{idx.chunks[h.idx].source_path}#page={idx.chunks[h.idx].page}",
                  "score": round(h.score, 6)} for h in hits],
    }
    if req.get("report"):
        seen = {h.idx for h in hits}
        hits += [h for h in named_doc_hits(idx, q, reranker) if h.idx not in seen]
        res = answer_report(idx, q, hits, LLM(req.get("llm_url")))
        out["report"] = res
        out["markdown"] = render_report_markdown(res)
    elif req.get("answer"):
        res = answer(idx, q, hits, LLM(req.get("llm_url")), gate=req.get("gate"))
        out["answer"] = res
        out["markdown"] = render_markdown(res)
    print(json.dumps(out, ensure_ascii=False))


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    pi = sub.add_parser("index")
    pi.add_argument("--corpus", nargs="+", required=True)
    pi.add_argument("--out", required=True)
    pi.add_argument("--embed", action="store_true")
    pi.add_argument("--model", default="google/embeddinggemma-2")
    pi.add_argument("--max-chars", type=int, default=1600)
    pi.add_argument("--min-chars", type=int, default=300)
    pq = sub.add_parser("query")
    pq.add_argument("--index", required=True)
    pq.add_argument("request", nargs="?", default="-")
    a = p.parse_args()
    try:
        cmd_index(a) if a.cmd == "index" else cmd_query(a)
    except SystemExit:
        raise
    except Exception as exc:
        fail(f"{type(exc).__name__}: {exc}")


if __name__ == "__main__":
    main()
