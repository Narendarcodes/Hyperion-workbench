#!/usr/bin/env python3
"""Run the Hyperion RAG service (see hyperion_rag/service.py for the API).

    python3 scripts/rag_server.py --corpus /data/refinery/processed /data/refinery/ocr

All settings come from the environment (hyperion_rag/config.py, documented in
the package README). The dense encoder and reranker are loaded once; if either
cannot load as configured the service still starts and reports
``retrieval: bm25`` with the reason in ``degraded`` (never silently).
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hyperion_rag.config import RagConfig  # noqa: E402
from hyperion_rag.pdf import OcrClient  # noqa: E402
from hyperion_rag.pipeline import LLM  # noqa: E402
from hyperion_rag.service import RagService, serve  # noqa: E402


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Hyperion RAG service")
    ap.add_argument("--corpus", nargs="*", default=[], help="corpus paths for the first build (ignored when the index exists)")
    ap.add_argument("--no-dense", action="store_true", help="BM25 only (reported as degraded)")
    ap.add_argument("--no-rerank", action="store_true")
    a = ap.parse_args(argv)
    cfg = RagConfig.from_env()
    degraded: list[str] = []
    encoder = reranker = None
    if a.no_dense:
        degraded.append("dense disabled by --no-dense")
    else:
        try:
            from hyperion_rag.dense import DenseEncoder
            encoder = DenseEncoder(cfg.embed_model)
            if encoder.fallback_reason:
                degraded.append(f"dense fell back to {encoder.model_id}: {encoder.fallback_reason}")
        except Exception as exc:
            degraded.append(f"dense encoder unavailable: {exc}")
    if not a.no_rerank:
        try:
            from hyperion_rag.rerank import Reranker
            reranker = Reranker(cfg.reranker_model)
        except Exception as exc:
            degraded.append(f"reranker unavailable: {exc}")
    ocr = OcrClient(cfg.ocr_url, cfg.ocr_timeout_s, cfg.ocr_concurrency) if cfg.ocr_url else None
    svc = RagService(cfg, encoder=encoder, reranker=reranker, llm=LLM(cfg.llm_url, cfg.llm_model), ocr=ocr,
                     degraded=degraded)
    svc.bootstrap(a.corpus)
    server = serve(svc, cfg.host, cfg.port)
    print(f"hx-rag listening on {cfg.host}:{cfg.port} {svc.health()}", file=sys.stderr, flush=True)
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
