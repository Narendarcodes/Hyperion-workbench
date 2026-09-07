import type { CSSProperties } from 'react'
import type { IconProps } from './icons/props.ts'

/** Hyperion navy chip backing the cream mark on any surface. */
const HYPERION_NAVY = '#0B1220'

/**
 * Render the Hyperion product mark.
 * The approved transparent artwork cannot sit directly on light surfaces,
 * so it rides a navy chip (presentation backing, not a logo redraw).
 * Decorative — hidden from the accessibility tree; the adjacent brand
 * name or headline carries the accessible name.
 * @param props.size - square edge in px (default 24).
 * @param props.className - extra class for layout placement.
 * @returns the Hyperion mark element.
 */
export function HyperionMark({ size = 24, className }: IconProps) {
  const edge = Math.round(size * 0.78)
  const chip: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    borderRadius: Math.max(4, Math.round(size * 0.24)),
    background: HYPERION_NAVY,
    overflow: 'hidden',
    flex: 'none',
  }
  return (
    <span className={className} style={chip} aria-hidden="true">
      <img
        src="/hyperion.svg"
        alt=""
        width={edge}
        height={edge}
        style={{ display: 'block' }}
        draggable={false}
      />
    </span>
  )
}
