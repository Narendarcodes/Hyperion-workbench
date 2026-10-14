// Name tags / bubbles must not overlap once every agent has finished and
// gathered in the same zone (the "all done" pile-up in Mission View).
import { describe, expect, it } from 'vitest'
import { layoutLabels, type LabelBox } from '../src/client/pixel-office/labelLayout.ts'

const overlaps = (a: LabelBox & { dy: number }, b: LabelBox & { dy: number }): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y + a.dy < b.y + b.dy + b.h && b.y + b.dy < a.y + a.dy + a.h

describe('layoutLabels', () => {
  it('leaves separated labels where they are', () => {
    const out = layoutLabels([{ id: 'a', x: 0, y: 100, w: 60, h: 16 }, { id: 'b', x: 200, y: 100, w: 60, h: 16 }])
    expect(out.get('a')).toBe(0)
    expect(out.get('b')).toBe(0)
  })

  it('stacks six finished agents standing on the same tile without any overlap', () => {
    const boxes: LabelBox[] = ['lead', 'research', 'ocr', 'rag', 'stt', 'qa'].map((id, i) => ({ id, x: 300 + (i % 2) * 6, y: 200 + (i % 3), w: 70, h: 16 }))
    const out = layoutLabels(boxes)
    const placed = boxes.map(b => ({ ...b, dy: out.get(b.id) ?? 0 }))
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) expect(overlaps(placed[i]!, placed[j]!)).toBe(false)
    }
    // moved up (towards the top of the canvas), never down over the sprites
    for (const p of placed) expect(p.dy).toBeLessThanOrEqual(0)
  })

  it('is deterministic for the same input order', () => {
    const boxes: LabelBox[] = [{ id: 'x', x: 10, y: 50, w: 40, h: 16 }, { id: 'y', x: 15, y: 52, w: 40, h: 16 }]
    expect([...layoutLabels(boxes)]).toEqual([...layoutLabels(boxes)])
  })
})
