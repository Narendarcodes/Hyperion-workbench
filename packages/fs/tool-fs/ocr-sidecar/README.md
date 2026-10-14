# Hyperion OCR sidecar

Stdlib HTTP service that turns scanned PDFs into page text for `read_pdf`. It renders the
requested page window with PyMuPDF and sends each page to a vision-language model behind an
OpenAI-compatible endpoint (vLLM on the AMD MI300X droplet). Raw page text goes back to the
caller; `read_pdf` (`src/ocr-provider.ts`) runs every page through the OCR guard
(`@deepseek-ai/dsh-ocr-guard`) before the model sees it.

Default engine: **Qwen3-VL-8B-Instruct-FP8** (winner of `docs/benchmarks/ocr.md`). Alternatives
via `OCR_ENGINE`: `olmocr` (olmOCR-2-7B-1025-FP8), `deepseekocr` (DeepSeek-OCR, fastest).

## Run on the droplet
```bash
OCR_ENGINE=qwen3vl deploy/launch.sh start    # hx-ocr-vlm (vLLM :8110, ~18 GiB VRAM) + hx-ocr-sidecar (:8111)
deploy/launch.sh status
deploy/launch.sh stop
```
Containers: `hx-ocr-vlm` from `vllm/vllm-openai-rocm:v0.27.1`, `hx-ocr-sidecar` from the same
image (PyMuPDF installed into a named volume on first start). Both bind 127.0.0.1 only.

## Point Hyperion at it
```bash
export HYPERION_OCR_PROVIDER=sidecar
export HYPERION_OCR_URL=http://127.0.0.1:8111     # tunnel from a laptop: ssh -L 8111:127.0.0.1:8111 root@<droplet>
export HYPERION_OCR_API_KEY=...                   # only if the sidecar was started with OCR_API_KEY
```
Native-text PDFs never touch the sidecar; only PDFs with no text layer do.

## API
- `GET /health` → `{ok, model, preset, upstream_ok}`
- `POST /v1/ocr/pdf` `{pdf_base64, page_offset=1, page_limit=10}` → `{page_count, model, preset, pages:[{number, text, latency_s}], wall_s}`
- `POST /v1/ocr/image` `{image_base64}` → same shape, one page

## Tests
`python -m pytest test_ocr_sidecar.py` (needs `pymupdf`, `pillow`, `pytest`; no GPU or network).
