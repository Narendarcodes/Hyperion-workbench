# benchmarks/ocr

OCR engine benchmark for scanned plant documents (results and method: `docs/benchmarks/ocr.md`).

- `build_evalset.py`: builds the 83-page eval set (64 synthetic scanned pages with exact ground truth,
  17 real public pages with text-layer ground truth, 2 DOC-011 scan pages). Inputs: the Hyperion eval set v1
  `documents.jsonl` and the public refinery corpus. Edit the `EVAL`/`CORPUS` paths at the top.
- `doc011_facts.json`: key-fact ground truth for the DOC-011 scan (agent-read, pending human check).
- `score.py`: CER, bag-of-words F1, table-cell F1, tag recall, DOC-011 facts, pages/min.
- `droplet/`: vLLM serve scripts and clients for Qwen3-VL, olmOCR-2, DeepSeek-OCR, MinerU2.5, and PaddleOCR (CPU),
  plus `ocr_corpus_via_sidecar.py` for bulk OCR through the production sidecar.
- `run_tesseract.py`: CPU baseline. `render_corpus.py`: renders all 300 synthetic docs as scanned PDFs.
- `guard_check.mts` / `guard_doc.mts`: run outputs through the same OCR guard `read_pdf` uses.
- `results/`: summary JSON, per-page CSV, and the score table from the 14 Oct 2026 run.
