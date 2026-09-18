/**
 * Robust OCR Pipeline & Spatial Deduplication Harness for HYPERION Workbench.
 *
 * Prevents model-generated repetition loops from local llama-server / GGUF OCR models
 * while preserving exact text recognition, spatial bounding box coordinates, and
 * legitimate repeated labels at different locations on engineering drawings.
 *
 * @module @deepseek-ai/dsh-guard/ocr-pipeline
 */

/** Bounding box coordinates in format [x1, y1, x2, y2] (0..1000 scale or pixel scale) */
export type BoundingBox = [number, number, number, number]

export interface OcrDetection {
  text: string
  bbox?: BoundingBox
  confidence?: number
  uncertaintyMarkerUsed?: boolean
}

export interface OcrResult {
  detections: OcrDetection[]
  rawOutput?: string
  parsedOutput?: OcrDetection[]
  deduplicatedOutput?: OcrDetection[]
  repetitionDetected?: boolean
  duplicateCount?: number
}

export interface OcrPipelineOptions {
  /** Maximum Intersection-over-Union (IoU) threshold to treat identical text as spatial duplicate (default: 0.5) */
  iouThreshold?: number
  /** Enable debug logging stage outputs (default: true) */
  debugLog?: boolean
  /** Custom logger function (default: console.log) */
  logger?: (stage: string, payload: unknown) => void
}

/**
 * Compute Intersection over Union (IoU) of two bounding boxes [x1, y1, x2, y2].
 */
export function calculateIoU(boxA: BoundingBox, boxB: BoundingBox): number {
  const [aX1, aY1, aX2, aY2] = boxA
  const [bX1, bY1, bX2, bY2] = boxB

  const interX1 = Math.max(aX1, bX1)
  const interY1 = Math.max(aY1, bY1)
  const interX2 = Math.min(aX2, bX2)
  const interY2 = Math.min(aY2, bY2)

  const interWidth = Math.max(0, interX2 - interX1)
  const interHeight = Math.max(0, interY2 - interY1)
  const interArea = interWidth * interHeight

  const areaA = Math.max(0, aX2 - aX1) * Math.max(0, aY2 - aY1)
  const areaB = Math.max(0, bX2 - bX1) * Math.max(0, bY2 - bY1)

  const unionArea = areaA + areaB - interArea
  if (unionArea <= 0) return 0

  return interArea / unionArea
}

/**
 * Parse raw model completion string into structured OcrDetection objects.
 * Supports structured JSON formats as well as plaintext line fallback.
 */
export function parseRawOcrOutput(raw: string): OcrDetection[] {
  if (!raw || raw.trim().length === 0) return []

  const trimmed = raw.trim()

  // Attempt 1: Standard JSON object with "detections" key
  try {
    const jsonStart = trimmed.indexOf('{')
    const jsonEnd = trimmed.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonCandidate = trimmed.substring(jsonStart, jsonEnd + 1)
      const parsed = JSON.parse(jsonCandidate)
      if (parsed && Array.isArray(parsed.detections)) {
        return parsed.detections.map((item: any) => normalizeDetection(item)).filter(Boolean) as OcrDetection[]
      }
    }
  } catch {
    // Fall through to line-based parsing
  }

  // Attempt 2: Array of detections
  try {
    const arrStart = trimmed.indexOf('[')
    const arrEnd = trimmed.lastIndexOf(']')
    if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
      const parsedArr = JSON.parse(trimmed.substring(arrStart, arrEnd + 1))
      if (Array.isArray(parsedArr)) {
        return parsedArr.map((item: any) => normalizeDetection(item)).filter(Boolean) as OcrDetection[]
      }
    }
  } catch {
    // Fall through to plain text parsing
  }

  // Fallback: Parse plaintext lines into individual text detections
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
  return lines.map(line => ({
    text: line,
    uncertaintyMarkerUsed: line.includes('?'),
  }))
}

function normalizeDetection(item: any): OcrDetection | null {
  if (!item || (typeof item !== 'object' && typeof item !== 'string')) return null

  if (typeof item === 'string') {
    return { text: item, uncertaintyMarkerUsed: item.includes('?') }
  }

  const text = typeof item.text === 'string' ? item.text.trim() : (typeof item.label === 'string' ? item.label.trim() : '')
  if (!text) return null

  let bbox: BoundingBox | undefined
  if (Array.isArray(item.bbox) && item.bbox.length === 4 && item.bbox.every((n: any) => typeof n === 'number')) {
    bbox = [item.bbox[0], item.bbox[1], item.bbox[2], item.bbox[3]]
  }

  const confidence = typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : undefined

  return {
    text,
    ...(bbox ? { bbox } : {}),
    ...(confidence !== undefined ? { confidence } : {}),
    uncertaintyMarkerUsed: text.includes('?'),
  }
}

/**
 * Perform spatial & sequence deduplication on detected OCR items.
 *
 * Rules:
 * 1. If detections include bounding boxes:
 *    - Identical text + IoU > iouThreshold (overlapping position) => DUPLICATE generation artifact -> REMOVE
 *    - Identical text + IoU <= iouThreshold (different physical locations on schematic) => PRESERVE BOTH
 * 2. If bounding boxes are absent:
 *    - Sliding sequence N-gram deduplication to suppress identical multi-line repeated output blocks without dropping legitimate single-word repetitions.
 */
export function deduplicateOcrDetections(
  detections: readonly OcrDetection[],
  options?: OcrPipelineOptions
): { deduplicated: OcrDetection[]; duplicateCount: number } {
  const iouThreshold = options?.iouThreshold ?? 0.5
  if (!detections || detections.length === 0) {
    return { deduplicated: [], duplicateCount: 0 }
  }

  const hasBboxCount = detections.filter(d => d.bbox !== undefined).length
  const isSpatial = hasBboxCount > 0

  if (isSpatial) {
    const deduplicated: OcrDetection[] = []
    let duplicateCount = 0

    for (const det of detections) {
      if (!det.bbox) {
        deduplicated.push(det)
        continue
      }

      // Check if an existing detection has exact text AND overlapping spatial bbox
      const isDuplicate = deduplicated.some(existing => {
        if (!existing.bbox) return false
        if (existing.text.trim().toLowerCase() !== det.text.trim().toLowerCase()) return false
        const iou = calculateIoU(existing.bbox, det.bbox!)
        return iou > iouThreshold
      })

      if (isDuplicate) {
        duplicateCount++
      } else {
        deduplicated.push(det)
      }
    }

    return { deduplicated, duplicateCount }
  }

  // Non-spatial fallback: Detect repeated block cycles (e.g. A, B, C, A, B, C)
  const deduplicated: OcrDetection[] = []
  let duplicateCount = 0
  const seenSequences = new Set<string>()

  // Check for repeated sequence loops of size K (from K=1 to K=10)
  const textList = detections.map(d => d.text.trim())
  const n = textList.length

  let loopLength = 0
  for (let k = 1; k <= Math.min(10, Math.floor(n / 2)); k++) {
    let matches = 0
    for (let i = 0; i < n - k; i++) {
      if (textList[i] === textList[i + k]) {
        matches++
      }
    }
    if (matches >= k * 2 && matches > n * 0.4) {
      loopLength = k
      break
    }
  }

  if (loopLength > 0) {
    // Keep only the first cycle of length loopLength
    for (let i = 0; i < Math.min(n, loopLength); i++) {
      deduplicated.push(detections[i])
    }
    duplicateCount = n - deduplicated.length
    return { deduplicated, duplicateCount }
  }

  // Consecutive exact line deduplication fallback
  for (let i = 0; i < detections.length; i++) {
    const curr = detections[i]
    if (i > 0 && curr.text.trim().toLowerCase() === detections[i - 1].text.trim().toLowerCase()) {
      duplicateCount++
    } else {
      deduplicated.push(curr)
    }
  }

  return { deduplicated, duplicateCount }
}

/**
 * Execute full 3-stage OCR Pipeline with stage debug logging.
 */
export function processOcrPipeline(
  rawOutput: string,
  options?: OcrPipelineOptions
): OcrResult {
  const logger = options?.logger ?? ((stage, payload) => {
    if (options?.debugLog !== false) {
      console.log(`[OCR Pipeline - ${stage}]`, JSON.stringify(payload, null, 2))
    }
  })

  // Stage 1: Raw Output
  logger('RAW MODEL OUTPUT', rawOutput)

  // Stage 2: Parsed Detections
  const parsedOutput = parseRawOcrOutput(rawOutput)
  logger('PARSED OCR OUTPUT', parsedOutput)

  // Stage 3: Spatial Deduplication
  const { deduplicated, duplicateCount } = deduplicateOcrDetections(parsedOutput, options)
  logger('DEDUPLICATED OCR OUTPUT', deduplicated)

  return {
    detections: deduplicated,
    rawOutput,
    parsedOutput,
    deduplicatedOutput: deduplicated,
    repetitionDetected: duplicateCount > 0,
    duplicateCount,
  }
}

/**
 * Validate OCR output to ensure non-empty, non-garbage result.
 */
export function validateOcrResponse(result: OcrResult): boolean {
  if (!result || !Array.isArray(result.detections)) return false
  if (result.detections.length === 0) return false
  return result.detections.some(d => d.text && d.text.trim().length > 0)
}
