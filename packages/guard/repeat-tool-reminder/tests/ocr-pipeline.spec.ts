import { describe, expect, it } from 'vitest'
import {
  calculateIoU,
  deduplicateOcrDetections,
  detectRunawaySequences,
  parseRawOcrOutput,
  processOcrPipeline,
  validateOcrResponse,
} from '../../src/ocr-pipeline.ts'

describe('OCR Pipeline, Spatial Deduplication & Runaway Sequence Detector', () => {
  it('TEST 1: Parses normal OCR image detections cleanly', () => {
    const rawInput = JSON.stringify({
      detections: [
        { text: 'M6-052-00540', bbox: [100, 200, 250, 230], confidence: 0.98 },
        { text: 'FLH 17668', bbox: [300, 400, 420, 430], confidence: 0.95 },
        { text: '052 PG 0026', bbox: [500, 600, 650, 630], confidence: 0.92 },
      ],
    })

    const result = processOcrPipeline(rawInput, { debugLog: false })
    expect(validateOcrResponse(result)).toBe(true)
    expect(result.detections.length).toBe(3)
    expect(result.repetitionDetected).toBe(false)
    expect(result.runawaySequenceDetected).toBe(false)
    expect(result.detections[0].text).toBe('M6-052-00540')
    expect(result.detections[1].text).toBe('FLH 17668')
    expect(result.detections[2].text).toBe('052 PG 0026')
  })

  it('TEST 2: Engineering drawing with REPEATED labels at DIFFERENT coordinates (preserves both)', () => {
    const rawInput = JSON.stringify({
      detections: [
        { text: 'FLH 17668', bbox: [100, 200, 200, 230], confidence: 0.96 },
        { text: 'FLH 17668', bbox: [700, 800, 800, 830], confidence: 0.95 }, // Distinct physical location!
      ],
    })

    const result = processOcrPipeline(rawInput, { debugLog: false })
    expect(result.detections.length).toBe(2)
    expect(result.repetitionDetected).toBe(false)
    expect(result.duplicateCount).toBe(0)
    expect(result.detections[0].bbox).toEqual([100, 200, 200, 230])
    expect(result.detections[1].bbox).toEqual([700, 800, 800, 830])
  })

  it('TEST 3: Preserves uncertainty markers on obscured/unclear characters', () => {
    const rawInput = JSON.stringify({
      detections: [
        { text: 'FLH 176?8', bbox: [100, 200, 200, 230], confidence: 0.75 },
        { text: '052 PG 00?6', bbox: [300, 400, 420, 430], confidence: 0.68 },
      ],
    })

    const parsed = parseRawOcrOutput(rawInput)
    expect(parsed[0].uncertaintyMarkerUsed).toBe(true)
    expect(parsed[0].text).toBe('FLH 176?8')
    expect(parsed[1].text).toBe('052 PG 00?6')
  })

  it('TEST 4: Catches and removes DUPLICATE generation loop artifacts (overlapping bbox)', () => {
    const rawInput = JSON.stringify({
      detections: [
        { text: 'M6-052-00540', bbox: [100, 200, 250, 230], confidence: 0.98 },
        { text: 'FLH 17668', bbox: [300, 400, 420, 430], confidence: 0.95 },
        // Exact duplicate generation artifact (overlapping bounding box)
        { text: 'M6-052-00540', bbox: [102, 201, 251, 231], confidence: 0.97 },
        { text: 'FLH 17668', bbox: [301, 401, 421, 431], confidence: 0.94 },
      ],
    })

    const result = processOcrPipeline(rawInput, { debugLog: false })
    expect(result.repetitionDetected).toBe(true)
    expect(result.duplicateCount).toBe(2)
    expect(result.detections.length).toBe(2)
    expect(result.detections[0].text).toBe('M6-052-00540')
    expect(result.detections[1].text).toBe('FLH 17668')
  })

  it('TEST 5: RUNAWAY SEQUENCE DETECTOR catches and truncates artificial c1 -> c100 completion loops', () => {
    const rawInput = `Section 5
a1 Error Inspection
b1 Error Inspection
c1 Creation
c2 Creation
c3 Creation
c4 Creation
c5 Creation
c6 Creation
c7 Creation
c8 Creation`

    const result = processOcrPipeline(rawInput, { debugLog: false })
    expect(result.runawaySequenceDetected).toBe(true)
    // Should preserve 'c1 Creation' and truncate the artificial 'c2', 'c3', 'c4'... loop
    const textList = result.detections.map(d => d.text)
    expect(textList).toContain('c1 Creation')
    expect(textList).not.toContain('c2 Creation')
    expect(textList).not.toContain('c3 Creation')
  })

  it('Calculates Intersection over Union (IoU) correctly', () => {
    const box1: [number, number, number, number] = [0, 0, 10, 10]
    const box2: [number, number, number, number] = [0, 0, 10, 10]
    expect(calculateIoU(box1, box2)).toBe(1.0)

    const box3: [number, number, number, number] = [20, 20, 30, 30]
    expect(calculateIoU(box1, box3)).toBe(0.0)
  })
})
