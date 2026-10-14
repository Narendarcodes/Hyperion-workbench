# OCR benchmark (Hyperion, MRPL track)

Status: **in progress** (work-in-progress PR; numbers land here as runs finish).

## Goal
Pick an OCR/VLM engine for scanned plant documents (SOPs, fault logs, equipment
datasheets, P&ID-style drawings) that runs on the AMD MI300X droplet inside a
20 GB VRAM budget, and wire it behind `read_pdf` as a configurable provider,
with `packages/guard/src/ocr-pipeline.ts` kept in the loop.

## Plan
1. Eval set (~60-120 pages): synthetic plant documents (fictional, from the
   Hyperion eval corpus) rendered to scanned-looking pages (rotation, blur,
   noise), plus permissively licensed public engineering-drawing/table samples.
   Ground truth: page text, table cells, equipment tags.
2. Candidates on ROCm: Qwen2.5-VL-7B / Qwen3-VL-8B (vLLM), olmOCR, PaddleOCR,
   MinerU, DeepSeek-OCR. Failures are recorded, not hidden.
3. Metrics: CER, table-cell F1, equipment-tag recall, pages/min.
4. Integrate the winner as an OCR provider for `read_pdf` (sidecar on the
   droplet + launch script).
