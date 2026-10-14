/**
 * Compatibility shim: the OCR pipeline guard now lives in the
 * `@deepseek-ai/dsh-ocr-guard` workspace package (packages/guard/ocr-guard) so
 * `read_pdf`'s OCR provider can depend on it. This path keeps existing imports working.
 * @module @deepseek-ai/dsh-guard/ocr-pipeline
 */
export * from '../ocr-guard/src/ocr-pipeline.ts'
