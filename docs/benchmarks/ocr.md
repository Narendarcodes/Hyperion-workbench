# OCR benchmark (Hyperion, MRPL track)

Run 14 Oct 2026 on the AMD MI300X droplet (ROCm, `vllm/vllm-openai-rocm:v0.27.1`), each GPU engine capped
at about 18 GiB of VRAM (inside the 20 GB OCR budget), one engine at a time, next to other tenants on the same GPU.

Labels: **verified** = measured here; **proposed** = recommendation; **unresolved** = not established.

## Result (verified)

**Winner: Qwen3-VL-8B-Instruct-FP8** behind `read_pdf` via the OCR sidecar. It is the most accurate engine
on every slice (CER 0.043, table-cell F1 0.965, tag recall 0.998). It runs at 41.5 pages/min at 16-way
concurrency in the benchmark. DeepSeek-OCR is the throughput pick (76 pages/min) if speed matters more than
the last 2-3 points of accuracy. The sidecar supports both through presets.

| engine (all on the MI300X unless noted) | CER ↓ | bag-of-words F1 ↑ | table-cell F1 ↑ | tag recall ↑ | pages/min ↑ | vLLM VRAM cap |
|---|---|---|---|---|---|---|
| **Qwen3-VL-8B-Instruct-FP8** (vLLM) | **0.043** | **0.976** | 0.965 | **0.998** | 41.5 | 18.2 GiB |
| olmOCR-2-7B-1025-FP8 (vLLM, olmOCR prompt) | 0.055 | 0.962 | 0.949 | 0.977 | 50.5 | 18.2 GiB |
| DeepSeek-OCR (vLLM, base mode 1280 px) | 0.067 | 0.955 | 0.914 | 0.978 | **76.0** | 18.2 GiB |
| MinerU2.5-2509-1.2B (vLLM + mineru-vl-utils two-step) | 0.071 | 0.948 | **0.966** | 0.979 | 40.2 | 11.5 GiB |
| PaddleOCR PP-OCRv5 server (CPU, 8 threads) | 0.238 | 0.650 | 0.000* | 0.936 | 11.5 | CPU |
| Tesseract 5.5 (CPU, 4 workers, sandbox) | 0.370 | 0.758 | 0.006* | 0.693 | 66.7 | CPU |

n = 81 scored pages per engine (83-page set minus the 2 DOC-011 pages, which are scored separately below).
Throughput: wall clock for all 83 pages at 16 concurrent requests (MinerU 32). It is the same for every GPU
engine but measured on a shared GPU, so treat it as indicative, ±20%.
\* PP-OCRv5 and Tesseract emit lines, not table structure, so structured cell F1 is ~0 by construction.
PP-StructureV3 (Paddle's table pipeline) was not run.

### By slice (CER / cell F1)

| slice | n | Qwen3-VL | olmOCR-2 | DeepSeek-OCR | MinerU2.5 | PP-OCRv5 | Tesseract |
|---|---|---|---|---|---|---|---|
| synthetic, light scan | 22 | 0.044 / 0.988 | 0.052 / 0.967 | 0.056 / 0.974 | 0.053 / 0.993 | 0.282 / 0 | 0.315 / 0.02 |
| synthetic, medium scan | 22 | 0.032 / 0.974 | 0.038 / 0.961 | 0.044 / 0.946 | 0.063 / 0.989 | 0.168 / 0 | 0.317 / 0.00 |
| synthetic, heavy scan | 20 | 0.012 / 0.966 | 0.033 / 0.950 | 0.027 / 0.896 | 0.077 / 0.958 | 0.275 / 0 | 0.590 / 0.00 |
| real: CSB report tables | 6 | 0.047 / 0.884 | 0.055 / 0.856 | 0.062 / 0.791 | 0.050 / 0.852 | 0.246 / 0 | 0.195 / 0 |
| real: Kuphaldt P&ID / loop / symbol pages | 9 | 0.132 / 0.918 | 0.147 / 0.918 | 0.231 / 0.661 | 0.140 / 0.917 | 0.213 / 0 | 0.195 / 0.01 |
| real: MRPL gasoline spec (DOC-010) | 2 | 0.073 / – | 0.077 / – | 0.115 / – | 0.056 / – | 0.250 / – | 0.679 / – |

Lower CER on "heavy" than "light" pages comes from which documents landed in each slice (degradation is
assigned round-robin by document, and long fault-log tables dominate some slices). It is not a sign that
noise helps. Compare engines within a row, not rows within an engine.

### DOC-011: real scanned IOCL HSD spec (IS 1460:2017 Table 1), 2 pages

| engine | row facts (21) | phrases (11) |
|---|---|---|
| Qwen3-VL-8B-FP8 | 21/21 | 11/11 |
| MinerU2.5 | 21/21 | 11/11 |
| olmOCR-2 | 21/21 | 10/11 |
| DeepSeek-OCR | 21/21 | 8/11 |
| PP-OCRv5 | 18/21 | 10/11 |
| Tesseract | 7/21 | 11/11 |

A row fact counts when the characteristic and its BS-IV/BS-VI requirement value land on the same output row,
for example "Total sulphur … 50 … 10". The facts were read by the agent from the scan; status **proposed**,
pending a human spot-check (`benchmarks/ocr/doc011_facts.json`). The 21 facts don't separate the four VLMs.
A manual read of the winner's DOC-011 output found the requirement values right but the
**Method-of-Test column shifted by one row** in rows vi-ix and xv-xvii (the cells sit too close together on
the scan). Treat OCR'd test-method references as unverified until checked against the image.

## Eval set (verified)

83 page images (`benchmarks/ocr/build_evalset.py`, seeded, rebuilt in about 2 min):

- **64 synthetic pages** from 44 fictional Hyperion plant documents (16 equipment-manual excerpts, 14 SOPs,
  14 fault logs, from the Hyperion eval set v1). Each was rendered from markdown to a clean PDF (ruled tables,
  6-9 pt text, landscape for wide fault-log tables) and then degraded like a scan: rotation ±0.6/1.8/3.2°,
  perspective warp, uneven lighting, Gaussian blur, noise, salt and pepper, resolution loss, and JPEG
  q80/55/35 for light, medium and heavy. 22 light, 22 medium, 20 heavy pages.
  Ground truth is **exact**: text from the clean PDF page, table cells from its ruled tables (3,840 cells across
  the set), and equipment tags/IDs by regex (959 tags, e.g. `MTR-LT-02-A01`, `ALM-VFD-04`).
- **17 real pages** from the public refinery corpus, rasterised at 200 dpi plus a light or medium scan:
  DOC-010 MRPL gasoline spec (2 pages), DOC-012 Kuphaldt *Lessons in Industrial Instrumentation*
  ch. 7 (CC-BY-4.0, training diagrams, not as-built; PDF pages 560, 562, 564, 566, 572, 579, 586-588: PFD, P&ID, loop
  diagram, symbols and tag pages), and CSB DOC-007 (pp. 116-118) and DOC-008 (pp. 79, 100, 145) table pages (US public
  domain). Ground truth is **silver**: the embedded text layer, whose reading order differs from what you see on
  diagram pages, which inflates CER there for every engine alike.
- **2 real scanned pages**: DOC-011 (IOCL-hosted IS 1460:2017 table), no text layer, scored by key facts.

Only synthetic and public data. Page images are not committed; rebuild with the script.

## Metrics

- **CER**: character edit distance / ground-truth length after normalisation (NFKC, dashes and quotes unified,
  markdown/HTML markup stripped, whitespace collapsed), capped at 1.0 per page and averaged over pages.
- **Bag-of-words F1**: order-free token F1, robust to reading-order differences on diagrams.
- **Table-cell F1**: multiset F1 between ground-truth cells and cells parsed from the output's markdown
  (`| … |`) or HTML (`<td>`) tables, whitespace-insensitive. Pages without ruled tables are excluded
  (69 pages counted).
- **Tag recall**: share of ground-truth hyphenated tags/IDs found verbatim in the output (65 pages counted).
- **pages/min**: pages / wall time for the whole set from a client on the droplet.

## Engines on ROCm (verified unless marked)

| engine | ran on ROCm? | notes |
|---|---|---|
| Qwen3-VL-8B-Instruct-FP8 | yes, vLLM 0.27.1 | needs `GLOO_SOCKET_IFNAME=lo VLLM_HOST_IP=127.0.0.1` in the container (gloo can't find an interface otherwise) |
| olmOCR-2-7B-1025-FP8 | yes, vLLM | model only, with the olmOCR v0.4 no-anchoring prompt at 1288 px. The `olmocr` toolkit (anchor text, rotation retry, fallbacks) was not used, so this may understate olmOCR |
| DeepSeek-OCR | yes, vLLM native support | `NGramPerReqLogitsProcessor`, `skip_special_tokens=false`, base 1280 px mode (no Gundam tiling). 1/83 page hit max_tokens |
| MinerU2.5-2509-1.2B | yes, vLLM + `mineru-vl-utils` 2.0.7 | VLM two-step backend only. The full `mineru` pipeline package (torch layout, formula and table models) was not tried (**unresolved**) |
| PaddleOCR PP-OCRv5 | CPU only | paddlepaddle 3.2.0 CPU wheel. A ROCm/DCU Paddle GPU build isn't in the droplet images and wasn't attempted (**unresolved**) |
| Tesseract 5.5 | CPU (sandbox, 4 workers) | baseline |

No engine failed outright. vLLM's startup memory profiling on the shared GPU is not deterministic. In one sidecar
launch it counted other tenants' allocations as "consumed" and left only 2.15 GiB of KV cache, which halved
throughput. `deploy/launch.sh` now pins `--kv-cache-memory` to 2.75 GiB (20k tokens). Measured footprint
of the deployed Qwen3-VL engine was **19.98 GB** (rocm-smi), inside the 20 GB budget. A 4.5 GiB KV cache (21.6 GB)
gave about 5x the generation throughput on the corpus run (832 vs about 150 tok/s at 2.15 GiB), which is the lever if
the budget grows.

Benchmark-run VRAM: the GPU engines ran with `--gpu-memory-utilization 0.095` (an 18.2 GiB cap by vLLM's
accounting; MinerU 0.06 = 11.5 GiB). Per-process VRAM was not captured during those runs (**unresolved**), and
vLLM's accounting can under-count on a shared GPU, as noted above.

## OCR guard (verified)

Every OCR'd page goes through `@deepseek-ai/dsh-ocr-guard` (formerly `packages/guard/src/ocr-pipeline.ts`):
runaway-sequence truncation, repeated-block dedup, and empty-output rejection. On benign benchmark outputs it
changed nothing measurable: Qwen3-VL with the guard scored CER 0.043, cell F1 0.965, tag recall 0.998, the same as
without it, with 0 pages flagged. On DeepSeek-OCR it flagged 1 page and dropped 1 duplicate line. Its value is the
failure mode it guards against (repetition loops), which unit tests cover.

## Integration (verified)

- `read_pdf` (`packages/fs/tool-fs`) still parses native text layers in-process. Only when a PDF has **no text
  layer** and `HYPERION_OCR_PROVIDER=sidecar` is set does it send the requested page window to the sidecar. Each
  page then passes the OCR guard, and the output gets a `<source>ocr (…)</source>` line plus an `ocr` summary
  object. With no provider, the existing loud error (now also naming the env var) is unchanged. The tool's
  parameters and description are unchanged, so the snapshots are untouched.
- Sidecar: `packages/fs/tool-fs/ocr-sidecar/` (stdlib HTTP, PyMuPDF render, parallel per-page VLM calls, optional
  bearer auth). `deploy/launch.sh start` brings up `hx-ocr-vlm` (vLLM :8110) and `hx-ocr-sidecar` (:8111) on 127.0.0.1.
- End to end: DOC-011 (real scan) through sidecar plus guard gave both pages, with the values above: 21/21 row
  facts, but the Method-of-Test column is shifted in rows vi-ix and xv-xvii (see the DOC-011 section).

## Corpus run through the production path (verified)

The 300-document synthetic Hyperion corpus (100 equipment manuals, 100 SOPs, 100 fault logs; 956 pages) was
rendered as image-only PDFs with light/medium scan degradation and OCR'd end to end through the deployed path:
`hx-ocr-sidecar` -> Qwen3-VL-8B-FP8 (KV cache pinned, 19.98 GB footprint) -> OCR guard. The text feeds the RAG stream.

| measure | value |
|---|---|
| documents / pages | 300 / 956 |
| final (resumed) run | 729 pages in 1,128 s = **38.8 pages/min** (the remaining 227 pages were OCR'd in an earlier pass of the same run) |
| mean CER vs source text | **0.014** |
| median CER | **0.006** |
| bag-of-words F1 | **0.988** |
| tag recall (micro) | **0.998** |
| docs with CER > 0.10 | 3: HYP-EQU-132 (0.33), HYP-EQU-063 (0.27), HYP-SOP-139 (0.15) |
| guard | 1 page flagged, 0 empty pages |

Corpus CER is lower than the benchmark's synthetic-slice CER (0.030) because the corpus used only light and medium
degradation. The three high-CER documents are worth a manual look before they are used as RAG evidence
(**unresolved**: cause not yet diagnosed). Throughput was measured on the shared MI300X, like the benchmark.

## Reproduce

```bash
python benchmarks/ocr/build_evalset.py evalset                      # 83 pages + manifest (needs pymupdf reportlab opencv-python-headless)
# on the droplet, per engine:
benchmarks/ocr/droplet/serve_vlm.sh qwen3vl && benchmarks/ocr/droplet/run_client.sh qwen3vl 16
python benchmarks/ocr/score.py evalset runs qwen3vl olmocr deepseekocr mineru25 paddleocr tesseract
npx tsx benchmarks/ocr/guard_check.mts runs/qwen3vl runs/qwen3vl+guard
```
Per-page scores: `benchmarks/ocr/results/per_page.csv`; summary: `benchmarks/ocr/results/scores_summary.json`.

## Caveats

- Synthetic pages come from one renderer and font family (DejaVu), so a real scanned plant archive (handwriting,
  stamps, faded carbon copies, A3 drawings) will be harder. The real-page slice is small (17 pages plus 2).
- The P&ID pages are textbook training diagrams. No public as-built refinery P&ID was available. Tag recall on
  real pages rests on 1 page with hyphenated tags.
- Throughput was measured on a shared MI300X while other tenants were running.
