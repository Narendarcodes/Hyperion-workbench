# Hyperion RAG benchmark — EmbeddingGemma 2 hybrid retrieval

Package: `packages/tool/tool-hyperion-rag` (branch `feat/rag-embeddinggemma2`).
Run date: 14 Oct 2026, AMD MI300X droplet (container `hx-rag`, ROCm torch 2.11,
transformers 5.19, sentence-transformers 6.1). Answering model and judge:
gpt-oss-120b (vLLM, `127.0.0.1:8001`, reasoning effort low, temperature 0).

Labels: **verified** = measured in this run, numbers below; **proposed** = a
recommendation not yet measured; **unresolved** = open question.

## Pipeline (verified: implemented and exercised by the runs below)

1. **Ingest** — JSONL (`hyperion_eval/documents.jsonl`), refinery
   `corpus/processed/*.json` (`page_text`), HTML capture (DOC-009), per-page
   dirs. Empty scanned pages are skipped. OCR output in any of these shapes
   drops in (list the OCR dir first).
2. **Chunking** — section-aware (markdown / bold-numbered / all-caps OCR /
   CFR `1910.119(k)` headings), ≤1600 chars, table-row-safe splits, every
   chunk an exact `page.text[char_start:char_end]` slice.
3. **Retrieval** — BM25 (tag-aware tokenizer + light stemming) and
   `google/embeddinggemma-2` (text-only load, bf16, `task: question answering`
   query prefix, `title: … | text: …` documents, Matryoshka 768/256 with
   re-normalisation), fused with RRF (k=60); `BAAI/bge-reranker-v2-m3` reranks
   the top 30 (50 for reports).
4. **Answer** — top-5 chunks + same-document neighbours (≤8 blocks) to
   gpt-oss-120b; JSON answer with block-level quotes.
5. **Citations** — each quote is located on the cited page (exact →
   normalised → ellipsis segments → token-window fuzzy with every numeric token
   required). Citation = doc id + page + char span + verbatim page text, with a
   footnote in the citation-pdf-viewer format
   (`[^n]: [DOC](path#page=N) p. N, chars a-b: "…"`).
6. **Abstention** — no evidence; optional rerank-score gate; model abstains;
   or no cited quote verifies (answer withheld).

## Model facts (verified on the HF card, https://huggingface.co/google/embeddinggemma-2, read 14 Oct 2026)

Apache-2.0, not gated; 740M total (270M text = 130M backbone + 140M embedder;
vision 170M, audio 300M, selectively loadable); shared 768-d space for text,
image, video, audio; 8,192-token context; MRL 512/256/128; bf16/fp32 only
(fp16 gives NaN). Needs transformers ≥ 5.19 (5.15 in the stock `rocm:latest`
image does not know `embedding_gemma2`; upgraded inside `hx-rag` only). The
gated `google/embeddinggemma-300m` fallback was **not** needed (and would have
failed: 401 gated without an HF token).

## Benchmark 1 — synthetic `hyperion_eval` (verified)

300 synthetic docs (100 equipment manuals, 100 SOPs, 100 fault logs), 600
answerable questions (300 lookup / 300 reasoning, gold answer + evidence quote)
and 300 unanswerable questions. Answers are judged by gpt-oss-120b against the
gold answer (partial = 0.5); abstaining on an answerable question scores 0.
"Accuracy" is after the citation gate (an answer whose quotes do not verify is
withheld).

Dataset: 300 docs → 2929 chunks; 600 answerable + 300 unanswerable questions. Embedder `google/embeddinggemma-2`, reranker `BAAI/bge-reranker-v2-m3`, corpus embed 11.4 s, peak VRAM 2.45 GB.

**Retrieval — Original questions (name their doc id), n=600**

| config | doc hit@1 | hit@3 | hit@5 | hit@10 | MRR@10 | evidence chunk hit@5 |
|---|---|---|---|---|---|---|
| bm25 | 99.5% | 99.8% | 100.0% | 100.0% | 0.997 | 91.0% |
| dense@768 | 58.7% | 78.3% | 85.7% | 90.2% | 0.695 | 74.3% |
| dense@256 | 53.3% | 72.0% | 81.7% | 87.3% | 0.646 | 68.8% |
| hybrid@768 | 89.7% | 95.5% | 97.7% | 98.7% | 0.929 | 89.5% |
| hybrid@256 | 87.7% | 94.0% | 96.3% | 98.5% | 0.914 | 88.2% |
| hybrid_rerank@768 | 94.2% | 99.2% | 99.2% | 99.7% | 0.964 | 93.7% |
| hybrid_rerank@256 | 94.5% | 99.7% | 99.7% | 99.8% | 0.968 | 94.3% |

**Retrieval — De-identified questions (doc ids removed), n=600**

| config | doc hit@1 | hit@3 | hit@5 | hit@10 | MRR@10 | evidence chunk hit@5 |
|---|---|---|---|---|---|---|
| bm25 | 94.0% | 97.7% | 98.5% | 99.3% | 0.961 | 83.2% |
| dense@768 | 49.2% | 70.5% | 77.0% | 85.8% | 0.610 | 66.0% |
| dense@256 | 43.8% | 64.5% | 72.3% | 79.7% | 0.560 | 61.8% |
| hybrid@768 | 77.3% | 89.2% | 92.3% | 96.3% | 0.838 | 82.7% |
| hybrid@256 | 73.3% | 86.5% | 90.7% | 94.3% | 0.808 | 81.0% |
| hybrid_rerank@768 | 85.7% | 94.8% | 97.0% | 98.5% | 0.904 | 88.2% |
| hybrid_rerank@256 | 85.5% | 96.0% | 97.3% | 98.8% | 0.906 | 88.5% |

**Answers (gpt-oss-120b, judge gpt-oss-120b in batches of 10, partial = 0.5; abstaining on an answerable question = 0)**

| config | accuracy | lookup | reasoning | acc. before citation gate | abstention P | abstention R | false abstain (answerable) | cited doc correct | cite in gold-evidence chunk | all quotes verified | p50 latency | excluded infra errors |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bm25 | 82.8% | 89.0% | 76.5% | 86.8% | 81.6% | 94.7% | 10.7% | 99.8% | 93.5% | 96.8% | 21.84 s | 0 |
| dense@768 | 61.2% | 71.3% | 51.0% | 63.8% | 59.0% | 97.3% | 33.8% | 99.8% | 96.0% | 97.5% | 19.81 s | 0 |
| hybrid@768 | 78.2% | 85.7% | 70.8% | 81.9% | 77.1% | 95.7% | 14.2% | 99.8% | 94.8% | 97.9% | 20.63 s | 0 |
| hybrid_rerank@768 | 83.6% | 90.7% | 76.5% | 87.8% | 82.5% | 94.3% | 10.0% | 99.8% | 95.2% | 96.9% | 27.99 s | 0 |
| hybrid_rerank@256 | 84.0% | 92.2% | 75.8% | 87.8% | 84.0% | 94.3% | 9.0% | 99.8% | 95.0% | 96.5% | 26.98 s | 0 |
| noexp:hybrid_rerank@768 | 83.8% | 92.0% | 75.5% | 85.5% | 83.5% | 92.7% | 9.2% | 99.8% | 95.0% | 98.4% | 22.75 s | 0 |
| deid:hybrid_rerank@768 | 75.5% | 82.8% | 68.2% | 78.8% | 74.1% | 94.3% | 16.5% | 96.6% | 92.2% | 96.4% | 26.47 s | 0 |

**Retrieval-gate sweep (post hoc, hybrid_rerank@768; abstain if top rerank score < gate)**

| gate | accuracy | abstention P | abstention R |
|---|---|---|---|
| 0.0 | 83.6% | 82.5% | 94.3% |
| 0.01 | 83.6% | 82.5% | 94.3% |
| 0.02 | 83.6% | 82.5% | 94.3% |
| 0.05 | 83.6% | 82.5% | 94.3% |
| 0.1 | 83.6% | 82.5% | 94.3% |
| 0.2 | 83.6% | 82.5% | 94.3% |
| 0.3 | 83.6% | 82.5% | 94.3% |


Reading (verified from the tables): BM25 alone is near-perfect on doc-id
retrieval because every original question names its document; the hybrid +
reranker stack is what holds up when ids are removed (doc hit@5 97.0 % vs 92.3 %
hybrid without rerank, 77.0 % dense only). hybrid_rerank@256 matches @768 within
noise, so the 256-d Matryoshka index is a safe 3× storage saving (**proposed**
as the default only after a second run confirms it). The rerank-score gate
changes nothing up to 0.3 (the model already abstains), so it stays off.

## Benchmark 2 — OCR → RAG end to end (verified)

Same 600 + 300 questions, but the index is built from the **OCR output** of the
same 300 documents rendered as image-only scanned PDFs (light/medium scan
noise), OCR'd through the production path (Hyperion OCR sidecar,
Qwen3-VL-8B-Instruct-FP8, OCR guard; 956 pages, mean CER 0.014; see
`docs/benchmarks/ocr.md` on `feat/ocr-benchmark`). Pages are split on the OCR
hand-off markers (`--- page N ---`). Only `hybrid_rerank@768` was run for
answers; retrieval tables cover every config. gpt-oss-120b at 128 concurrent
requests (wall 184 s for 900 answers + judging).

Dataset: 300 docs → 2259 chunks; 600 answerable + 300 unanswerable questions. Embedder `google/embeddinggemma-2`, reranker `BAAI/bge-reranker-v2-m3`, corpus embed 17.6 s, peak VRAM 2.45 GB.

**Retrieval — Original questions (name their doc id), n=600**

| config | doc hit@1 | hit@3 | hit@5 | hit@10 | MRR@10 | evidence chunk hit@5 |
|---|---|---|---|---|---|---|
| bm25 | 99.5% | 99.8% | 99.8% | 100.0% | 0.997 | 94.0% |
| dense@768 | 59.7% | 78.7% | 85.2% | 90.2% | 0.704 | 69.2% |
| dense@256 | 53.5% | 72.5% | 79.0% | 85.3% | 0.646 | 64.5% |
| hybrid@768 | 90.7% | 96.7% | 98.3% | 99.3% | 0.939 | 86.7% |
| hybrid@256 | 87.5% | 95.0% | 97.7% | 98.5% | 0.917 | 84.0% |
| hybrid_rerank@768 | 95.8% | 99.2% | 99.3% | 100.0% | 0.975 | 93.8% |
| hybrid_rerank@256 | 96.0% | 99.2% | 99.5% | 100.0% | 0.976 | 94.5% |

**Retrieval — De-identified questions (doc ids removed), n=600**

| config | doc hit@1 | hit@3 | hit@5 | hit@10 | MRR@10 | evidence chunk hit@5 |
|---|---|---|---|---|---|---|
| bm25 | 94.2% | 98.0% | 98.8% | 99.2% | 0.962 | 82.2% |
| dense@768 | 43.2% | 61.7% | 70.2% | 77.3% | 0.544 | 56.2% |
| dense@256 | 37.0% | 57.2% | 65.5% | 72.8% | 0.485 | 52.5% |
| hybrid@768 | 68.8% | 82.8% | 88.7% | 93.5% | 0.772 | 73.3% |
| hybrid@256 | 63.3% | 81.3% | 87.7% | 92.7% | 0.736 | 71.8% |
| hybrid_rerank@768 | 87.3% | 94.5% | 96.7% | 97.5% | 0.914 | 87.7% |
| hybrid_rerank@256 | 87.5% | 95.3% | 96.7% | 98.2% | 0.916 | 86.8% |

**Answers (gpt-oss-120b, judge gpt-oss-120b in batches of 10, partial = 0.5; abstaining on an answerable question = 0)**

| config | accuracy | lookup | reasoning | acc. before citation gate | abstention P | abstention R | false abstain (answerable) | cited doc correct | cite in gold-evidence chunk | all quotes verified | p50 latency | excluded infra errors |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hybrid_rerank@768 | 80.6% | 85.7% | 75.5% | 86.0% | 80.9% | 93.0% | 11.0% | 99.8% | 94.2% | 94.8% | 19.52 s | 0 |

**Retrieval-gate sweep (post hoc, hybrid_rerank@768; abstain if top rerank score < gate)**

| gate | accuracy | abstention P | abstention R |
|---|---|---|---|
| 0.0 | 80.6% | 80.9% | 93.0% |
| 0.01 | 80.6% | 80.9% | 93.0% |
| 0.02 | 80.6% | 80.9% | 93.0% |
| 0.05 | 80.6% | 80.9% | 93.0% |
| 0.1 | 80.6% | 80.9% | 93.0% |
| 0.2 | 80.6% | 80.9% | 93.0% |
| 0.3 | 80.6% | 80.9% | 93.0% |


**Clean text vs OCR text (hybrid_rerank@768, same 900 questions):**

| measure | clean text | OCR text | Δ |
|---|---|---|---|
| answer accuracy | 83.6 % | 80.6 % | −3.0 pp |
| lookup / reasoning | 90.7 % / 76.5 % | 85.7 % / 75.5 % | −5.0 / −1.0 pp |
| abstention recall (unanswerable) | 94.3 % | 93.0 % | −1.3 pp |
| all quotes verified | 96.9 % | 94.8 % | −2.1 pp |
| doc hit@1 (orig / de-id) | 94.2 % / 85.7 % | 95.8 % / 87.3 % | +1.6 / +1.6 pp |
| evidence chunk hit@5 (orig) | 93.7 % | 93.8 % | +0.1 pp |

Paired per question (answerable, n=600): OCR better on 56, worse on 73
(net −17; sign test p ≈ 0.16, i.e. not distinguishable from run-to-run LLM
variance at this n). Retrieval is unaffected by OCR; the small loss is in
answer extraction and quote verification on lookup questions (exact part
numbers / values). The three low-quality OCR docs flagged by the OCR stream:

| doc | OCR CER | answerable Qs | clean score | OCR score |
|---|---|---|---|---|
| HYP-EQU-132 | 0.33 | 2 | 1.00 | **0.00** |
| HYP-EQU-063 | 0.27 | 2 | 0.50 | 0.50 |
| HYP-SOP-139 | 0.15 | 2 | 0.75 | 0.75 |

Excluding those three docs: 83.7 % clean vs 81.0 % OCR (n=594).
HYP-EQU-132 is the only doc where OCR quality visibly cost answers
(**unresolved**: why its OCR is poor; owned by the OCR stream).

## Benchmark 3 — public refinery corpus, human ground truth (verified)

13 public documents (3,494+ pages; OSHA/CFR, API/IS standards, Kuphaldt
textbook, a DOC-009 HTML capture) and 10 cases with **human** ground truth
(`refinery_eval/ground_truth.json`). Every metric is deterministic
(string/page matching against the corpus and the human claims; definitions in
`bench/run_refinery.py`). No AI answer is scored against another AI answer.
n = 10 cases, so differences of a few points between configs are within noise.
Report generation retries an infrastructure failure once and excludes (never
scores) a case that still fails; no case was excluded in any run below.

### 3a. Without OCR (DOC-011 is a scanned PDF with no text layer)

Corpus: 12 docs indexed (3642 pages with text, 5812 chunks); 10 cases; DOC-011 OCR text present: False.

| metric | bm25 | hybrid@768 | hybrid_rerank@768 | hybrid_rerank@256 |
|---|---|---|---|---|
| document_retrieval_accuracy | 75.0% | 75.0% | 78.3% | 78.3% |
| all_required_docs_retrieved | 60.0% | 60.0% | 60.0% | 60.0% |
| page_retrieval_accuracy | 59.4% | 58.3% | 67.1% | 66.8% |
| citation_correctness | 53.7% | 56.2% | 64.3% | 63.6% |
| citation_grounded | 86.1% | 95.8% | 96.3% | 88.0% |
| citation_completeness | 57.4% | 55.6% | 66.7% | 64.8% |
| unsupported_claim_rate_pooled | 20.3% | 4.2% | 3.3% | 14.5% |
| procedure_step_coverage | 100.0% | 75.0% | 100.0% | 75.0% |
| safety_control_coverage | 31.7% | 58.4% | 58.4% | 33.4% |
| final_report_factual_accuracy | 63.6% | 66.7% | 90.0% | 90.0% |
| gt_claim_coverage | 48.3% | 41.7% | 53.3% | 46.7% |
| ocr_rule_score | 100.0% | 100.0% | 100.0% | 100.0% |

**Per case (hybrid_rerank@768)**

| case | difficulty | docs retrieved | claims kept / dropped | citation correct | completeness | case metric |
|---|---|---|---|---|---|---|
| CASE-001 | easy | 100.0% | 0 / 0 | – | 0.0% | – |
| CASE-002 | easy | 100.0% | 1 / 0 | 100.0% | 100.0% | – |
| CASE-003 | easy | 66.7% | 6 / 0 | 14.3% | 100.0% | – |
| CASE-004 | medium | 100.0% | 5 / 0 | 100.0% | 100.0% | procedure 100.0% |
| CASE-005 | hard | 100.0% | 8 / 0 | 100.0% | 100.0% | – |
| CASE-006 | medium | 100.0% | 17 / 0 | 100.0% | 66.7% | safety 66.7% |
| CASE-007 | hard | 66.7% | 8 / 0 | 0.0% | 0.0% | safety 50.0% |
| CASE-008 | medium | 100.0% | 4 / 1 | 80.0% | 100.0% | procedure 100.0% |
| CASE-009 | medium | 0.0% | 0 / 0 | – | – | ocr 100.0% |
| CASE-010 | hard | 50.0% | 9 / 1 | 20.0% | 33.3% | final 90.0% |

### 3b. With the DOC-011 OCR text (hybrid_rerank@768)

DOC-011 = IS 1460:2017 Table 1 (automotive diesel fuel spec), a real scan.
Its OCR text (Qwen3-VL-8B-FP8 via the sidecar + guard; 21/21 requirement values
checked against the scan by the OCR stream) was added as `ocr_md/DOC-011.md`.
**Caveat: in that OCR text the Method-of-Test column is row-shifted in rows
vi–ix and xv–xvii**, so method references from DOC-011 must not be cited until
re-OCR'd or hand-corrected.

Corpus: 13 docs indexed (3644 pages with text, 5817 chunks); 10 cases; DOC-011 OCR text present: True.

| metric | hybrid_rerank@768 |
|---|---|
| document_retrieval_accuracy | 88.3% |
| all_required_docs_retrieved | 70.0% |
| page_retrieval_accuracy | 73.2% |
| citation_correctness | 71.6% |
| citation_grounded | 96.4% |
| citation_completeness | 73.3% |
| unsupported_claim_rate_pooled | 3.3% |
| procedure_step_coverage | 100.0% |
| safety_control_coverage | 50.0% |
| final_report_factual_accuracy | 92.3% |
| gt_claim_coverage | 56.7% |
| ocr_rule_score | – |

**Per case (hybrid_rerank@768)**

| case | difficulty | docs retrieved | claims kept / dropped | citation correct | completeness | case metric |
|---|---|---|---|---|---|---|
| CASE-001 | easy | 100.0% | 0 / 0 | – | 0.0% | – |
| CASE-002 | easy | 100.0% | 1 / 0 | 100.0% | 100.0% | – |
| CASE-003 | easy | 66.7% | 6 / 0 | 12.5% | 100.0% | – |
| CASE-004 | medium | 100.0% | 5 / 0 | 100.0% | 100.0% | procedure 100.0% |
| CASE-005 | hard | 100.0% | 8 / 1 | 90.9% | 100.0% | – |
| CASE-006 | medium | 100.0% | 21 / 0 | 100.0% | 100.0% | safety 66.7% |
| CASE-007 | hard | 66.7% | 5 / 1 | 22.2% | 50.0% | safety 33.3% |
| CASE-008 | medium | 100.0% | 5 / 0 | 100.0% | 50.0% | procedure 100.0% |
| CASE-009 | medium | 100.0% | 24 / 0 | 100.0% | 100.0% | – |
| CASE-010 | hard | 50.0% | 12 / 1 | 18.8% | 33.3% | final 92.3% |

What changed (verified from the per-case tables): CASE-009 ("Extract the HSD
specification table from DOC-011") goes from the correct *OCR-pending*
abstention to a 24-row answer with 24/24 verified page-1 citations and 0
unsupported claims; the answer reports requirement values only and does not
cite any Method-of-Test reference, so the shifted column did not leak in this
run (it is not guarded against in code: **proposed** — a per-document
"do not cite column X" note from the OCR guard). CASE-009's gt_claim_coverage
is 0 because the human ground truth was written for the *OCR-pending* case
(**unresolved**: add a ground-truth variant with the table values). The
+10 pp in document_retrieval_accuracy is exactly CASE-009 (0 → 100 %); the
movements in other cases (e.g. CASE-006 completeness 67 → 100 %, CASE-007
safety 50 → 33 %) are the same retrieval with a different LLM sample, i.e.
run-to-run variance at n = 10.

## Probe — P&ID pages as images (verified, small n)

EmbeddingGemma 2 multimodal (vision tower loaded) on DOC-012 (Kuphaldt,
*Lessons In Industrial Instrumentation*, CC-BY-4.0) chapter 7: PFD / P&ID /
loop diagrams / symbols. These are **training diagrams, not as-built plant
P&IDs**. gpt-oss-120b wrote one search query per page from the page text; the
task is to find that page among the 33.

33 pages (DOC-012 pdf pp 558–590), model `google/embeddinggemma-2` multimodal (load 9.3 s, embed 9.1 s, peak VRAM 1.91 GB).

| page representation | hit@1 | hit@5 | MRR |
|---|---|---|---|
| text | 84.8% | 100.0% | 0.910 |
| image | 84.8% | 100.0% | 0.904 |
| text+image interleaved | 87.9% | 97.0% | 0.914 |
| rrf(text,image) | 84.8% | 100.0% | 0.912 |

Reading: image-only embeddings retrieve these pages as well as their text
(hit@1 84.8 % both), so diagram pages **without** a usable text layer can be
indexed by image. The interleaved text+image vector is marginally best at
hit@1 (87.9 %) but n = 33 and the queries are derived from page text, which
favours the text representation. **Proposed:** index image embeddings for
pages whose OCR/text yield is low; **unresolved:** behaviour on real plant
P&IDs (dense symbols, tag tables), not tested here.

## Resource use (verified)

- Embedding + reranker run on the MI300X under a per-process VRAM cap
  (`HYPERION_RAG_VRAM_GB`, default 6 GB; benches ran at 3 GB). Peak allocated
  2.45 GB (synthetic), 1.91 GB (P&ID multimodal probe). GPU encode/rerank calls
  are serialised so concurrency cannot exceed the cap.
- Embed batch is configurable (`HYPERION_RAG_EMBED_BATCH`, default 16); at a
  3 GB cap with long OCR pages use 4 (16 hit OOM on the 300-doc OCR corpus and
  on 6,000-char P&ID page texts).
- Corpus embedding: 11.4 s (300 docs / 2,929 chunks, clean) and 17.6 s (OCR
  corpus, 2,259 chunks).

## Reproduce

```
# synthetic (clean)
python3 bench/run_bench.py --eval-dir hyperion_eval --out out/synthetic --concurrency 128
# OCR -> RAG end to end
HYPERION_RAG_VRAM_GB=3 HYPERION_RAG_EMBED_BATCH=4 python3 bench/run_bench.py \
  --eval-dir hyperion_eval --corpus ocr_corpus --out out/ocr_e2e \
  --concurrency 128 --gen-configs hybrid_rerank@768
# refinery (+ DOC-011 OCR)
python3 bench/run_refinery.py --processed refinery_eval/processed --html DOC-009.html \
  --eval refinery_eval --out out/ref [--ocr ocr_md --configs hybrid_rerank@768]
# P&ID probe
python3 bench/pid_image_probe.py --pdf DOC-012.pdf --processed refinery_eval/processed/DOC-012.json \
  --pages 558-590 --out out/pid
# tables
python3 bench/make_tables.py --synthetic metrics.json --refinery refinery_metrics.json --pid pid_probe.json
```

## Open items

- **Unresolved:** entity F1, P&ID component F1 and cross-document consistency
  need human annotation of model output; not scored.
- **Unresolved:** refinery ground truth for CASE-009 *with* OCR text.
- **Unresolved:** a second synthetic run to separate the clean-vs-OCR −3 pp
  from LLM sampling variance.
- **Proposed:** surface OCR-guard column warnings (DOC-011 Method-of-Test) to
  the answer step.
