/**
 * Collision-free placement for the pixel office's name tags and bubbles.
 * Labels are placed bottom-up (closest to the viewer first); a label that
 * would intersect one already placed is lifted just above it. Returns the
 * vertical offset (≤ 0) per label id. Pure, deterministic.
 */
export interface LabelBox {
  readonly id: string
  readonly x: number
  /** Top edge in canvas pixels. */
  readonly y: number
  readonly w: number
  readonly h: number
}

/** Gap kept between stacked labels (px). */
export const LABEL_GAP = 2

export function layoutLabels(boxes: readonly LabelBox[], gap = LABEL_GAP): Map<string, number> {
  const order = boxes.map((b, i) => ({ b, i })).sort((p, q) => (q.b.y - p.b.y) || (p.i - q.i))
  const placed: { x: number; y: number; w: number; h: number }[] = []
  const out = new Map<string, number>()
  for (const { b } of order) {
    let top = b.y
    let moved = true
    while (moved) {
      moved = false
      for (const p of placed) {
        const hx = b.x < p.x + p.w && p.x < b.x + b.w
        const hy = top < p.y + p.h + gap && p.y < top + b.h + gap
        if (hx && hy) {
          top = p.y - b.h - gap
          moved = true
        }
      }
    }
    placed.push({ x: b.x, y: top, w: b.w, h: b.h })
    out.set(b.id, top - b.y)
  }
  return out
}
