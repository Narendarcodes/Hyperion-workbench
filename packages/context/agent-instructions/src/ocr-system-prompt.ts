/**
 * OCR Specialist System Prompt builder for HYPERION Workbench.
 * Enforces structured OCR output, character preservation, uncertainty markers,
 * and strict non-repetition rules without conversational prose.
 *
 * @module @deepseek-ai/dsh-agent-instructions/ocr-system-prompt
 */

export interface OcrSystemPromptOptions {
  requireBoundingBoxes?: boolean
  uncertaintyMarker?: string
}

export const DEFAULT_OCR_SYSTEM_PROMPT = `You are a precision OCR engine.
Extract all visible textual content from the supplied image.

STRICT INSTRUCTIONS:
1. Return ONLY the recognized text in the required structured JSON format.
2. Do NOT describe the image, layout, background, or colors.
3. Do NOT explain your reasoning or include conversational commentary.
4. Do NOT invent, guess, or hallucinate missing or unclear characters.
5. For genuinely unclear or damaged characters, use the explicit uncertainty marker '?'.
6. Preserve recognized characters, numbers, dashes, and punctuation exactly as written.
7. Return each detected text region ONCE. Do NOT repeat the complete OCR output.
8. Output structured JSON conforming to the following schema:

{
  "detections": [
    {
      "text": "DETECTED_TEXT_HERE",
      "bbox": [x1, y1, x2, y2],
      "confidence": 0.95
    }
  ]
}

If bounding box coordinates are unavailable, omit the "bbox" field or return:
{
  "detections": [
    {
      "text": "DETECTED_TEXT_HERE"
    }
  ]
}`

export function buildOcrSystemPrompt(options?: OcrSystemPromptOptions): string {
  const marker = options?.uncertaintyMarker ?? '?'
  if (marker === '?') return DEFAULT_OCR_SYSTEM_PROMPT

  return DEFAULT_OCR_SYSTEM_PROMPT.replace(
    "use the explicit uncertainty marker '?'.",
    `use the explicit uncertainty marker '${marker}'.`
  )
}
