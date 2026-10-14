# @deepseek-ai/dsh-tool-hyperion-rag

Document RAG for Hyperion: section-aware chunking, **EmbeddingGemma 2** dense
retrieval (Matryoshka 768/512/256/128) fused with **BM25**, a cross-encoder
reranker (`BAAI/bge-reranker-v2-m3`), grounded answers from **gpt-oss-120b**
(OpenAI-compatible endpoint, default `http://127.0.0.1:8001/v1`), verified
citations (doc id + page + character span) and explicit abstention.

Two model-facing tools:

- `hyperion_rag_search` — ranked evidence chunks with `doc_id`, `page`,
  `char_start`/`char_end`, `section`, `text`, `href` (`<path>#page=N`).
- `hyperion_rag_answer` — grounded answer or `abstain: true`; `report: true`
  gives a claim-by-claim multi-document brief. Every citation's quote is
  checked against the cited page; unverifiable claims are withheld.

## Citation contract (Chat | PDF viewer, PR #11)

Each citation carries `doc_id`, 1-based `page`, `char_start`/`char_end` into
that page's text, the verbatim `quote`, `quote_verified`, `href` and a ready
footnote:

```
[^1]: [HYP-FAU-011](/data/docs/HYP-FAU-011.md#page=1) p. 1, chars 812-861: "Grease GRE-SYN-A-7 (PN: GR-A7-001)"
```

`citation-target.ts` resolves the link destination and the `#page=` / `p. N`
page hint, so the viewer opens the cited page. The character span is extra
precision for highlighting.

## Corpus ingest

`rag.py index --corpus <paths...>` accepts, per path:

| Source | Shape | Pages |
|---|---|---|
| JSONL | `{doc_id, text, ...}` per line (`hyperion_eval/documents.jsonl`) | `\f` / `<!-- page N -->` markers, else page 1 |
| `*.md` / `*.txt` dir | one file per doc (`doc_id` = stem) | same markers |
| `*.json` dir | `{doc_id or document_id, pages or page_text: [{page, text}]}` (refinery-corpus `corpus/processed`) | as given; empty (unscanned) pages skipped |
| page dirs | `<DOC>/page_0001.txt ...` | one file per page |
| `*.html` | visible text of a captured page (e.g. DOC-009 OSHA 1910.119) | page 1 |

**OCR hand-off (`/workspace/work/out/ocr/corpus_text/`, `.../refinery_ocr/`):**
any of the JSON / page-dir / marker shapes above works. List the OCR dir
*before* the processed dir so OCR text replaces empty scanned pages (first
document id wins).

## Build an index

```bash
pip install -r requirements.txt   # transformers >= 5.19 for EmbeddingGemma 2
python3 scripts/rag.py index --corpus /data/hyperion_eval/documents.jsonl --out ./index --embed
echo '{"question":"…","answer":true}' | python3 scripts/rag.py query --index ./index
```

Without `--embed` (or without torch) the index is BM25-only and queries
degrade to `bm25` with a `degraded` note, never silently.

## Resource notes

- EmbeddingGemma 2 is loaded text-only (`vision_config`/`audio_config` = None,
  270M effective) in bf16 (fp16 is unsafe per the model card). The process
  caps its VRAM with `HYPERION_RAG_VRAM_GB` (default 6).
- `HYPERION_LLM_MAX_WAIT_S` (default 900): connection errors / 5xx from the
  LLM are retried with exponential backoff, then raised as `LLMUnavailable`
  (infrastructure failure, not an answer).

## Tests

```bash
python3 scripts/test_hyperion_rag.py          # stdlib, BM25 path, fake LLM
pnpm vitest run packages/tool/tool-hyperion-rag # real Loader + mock LLM endpoint
```

## Benchmarks

`bench/run_bench.py` (synthetic hyperion_eval: 300 docs, 600 QA, 300
unanswerable), `bench/run_refinery.py` (public refinery corpus, human ground
truth, scoring_schema metrics), `bench/pid_image_probe.py` (image-chunk
embedding of P&ID training pages). Results: `docs/benchmarks/rag.md`.

## Known limitations

- The synthetic eval questions name their document id, which makes lexical
  lookup easy; the benchmark also reports a de-identified variant.
- Answering uses the same model family as the synthetic judge (gpt-oss-120b);
  treat synthetic accuracy as indicative. The refinery benchmark uses human
  ground truth only, scored deterministically.
- No `./invariant`: correctness is pinned by `tests/loader-composition.spec.ts`
  and `scripts/test_hyperion_rag.py`.
