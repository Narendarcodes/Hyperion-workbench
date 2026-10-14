# @deepseek-ai/dsh-ocr-guard

Guard for OCR/VLM page transcriptions. `processOcrPipeline(raw)` parses the raw completion
(JSON detections or plain lines), truncates ungrounded runaway sequences
(`c1 Creation, c2 Creation, …`), drops spatial/sequence duplicates, and `validateOcrResponse`
rejects empty output. `read_pdf`'s OCR provider (`@deepseek-ai/dsh-tool-fs`) runs every OCR'd
page through it before text reaches the model. Tests: `packages/guard/tests/ocr-pipeline.spec.ts`.
