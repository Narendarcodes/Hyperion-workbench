/**
 * OCR output guard: parse, runaway-sequence truncation, spatial/sequence dedup,
 * and validation for VLM/OCR completions before they reach the model.
 * @module @deepseek-ai/dsh-ocr-guard
 */
export * from './ocr-pipeline.ts'
