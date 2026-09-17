/**
 * BehaviorBubble: Clean, readable white speech bubble with icon and tail for specialist agents.
 * @module @deepseek-ai/dsh-client-ui-mission/client/BehaviorBubble
 */

/** Props for BehaviorBubble component. */
export interface BehaviorBubbleProps {
  readonly x: number
  readonly y: number
  readonly text: string
  readonly status?: string | undefined
  readonly stationId?: string | undefined
  readonly maxWidth?: number | undefined
  readonly clampBounds?: { minX: number; maxX: number; minY: number; maxY: number } | undefined
}

/**
 * Speech bubble rendering over an agent figure matching the reference design.
 *
 * @param props - Position, text, station, and styling properties.
 * @returns SVG group rendering bubble and text.
 */
export function BehaviorBubble({
  x,
  y,
  text,
  status = 'working',
  stationId,
  maxWidth = 180,
  clampBounds = { minX: 30, maxX: 930, minY: 20, maxY: 570 },
}: BehaviorBubbleProps) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return null
  }

  const charWidth = 5.8
  const paddingLeft = 28 // space for icon
  const paddingRight = 12
  const computedWidth = Math.min(maxWidth, Math.max(80, text.length * charWidth + paddingLeft + paddingRight))
  const computedHeight = 24

  // Position above the agent head
  let bubbleX = x - computedWidth / 2
  let bubbleY = y - 36 - computedHeight

  // Edge-clamp inside canvas bounds
  bubbleX = Math.max(clampBounds.minX, Math.min(clampBounds.maxX - computedWidth, bubbleX))
  bubbleY = Math.max(clampBounds.minY, Math.min(clampBounds.maxY - computedHeight, bubbleY))

  // Tail geometry pointing toward agent head (x, y - 24)
  const tailBaseX = Math.max(bubbleX + 16, Math.min(bubbleX + computedWidth - 16, x))
  const tailPoints = `${tailBaseX - 5},${bubbleY + computedHeight} ${tailBaseX + 5},${bubbleY + computedHeight} ${x},${bubbleY + computedHeight + 7}`

  // Icon type based on station or status
  const iconKind = stationId === 'documents'
    ? 'doc'
    : stationId === 'knowledge'
      ? 'loupe'
      : stationId === 'analysis'
        ? 'chart'
        : stationId === 'code'
          ? 'gear'
          : stationId === 'verification'
            ? 'check'
            : stationId === 'report'
              ? 'report'
              : status === 'searching'
                ? 'loupe'
                : 'doc'

  return (
    <g className="behavior-bubble" pointerEvents="none">
      {/* Drop Shadow */}
      <rect
        x={bubbleX + 1.5}
        y={bubbleY + 1.5}
        width={computedWidth}
        height={computedHeight}
        rx={7}
        fill="#000000"
        fillOpacity={0.18}
      />

      {/* Tail */}
      <polygon points={tailPoints} fill="#ffffff" stroke="#cbd5e1" strokeWidth={1} />

      {/* Bubble Body (Crisp White Rounded Card) */}
      <rect
        x={bubbleX}
        y={bubbleY}
        width={computedWidth}
        height={computedHeight}
        rx={7}
        fill="#ffffff"
        stroke="#cbd5e1"
        strokeWidth={1.2}
      />

      {/* Category Icon Badge on Left */}
      <g transform={`translate(${bubbleX + 13}, ${bubbleY + 12})`}>
        {iconKind === 'doc' && (
          <g>
            <rect x={-5} y={-6} width={10} height={12} rx={1.5} fill="#ecfdf5" stroke="#10b981" strokeWidth={1} />
            <line x1={-3} y1={-3} x2={3} y2={-3} stroke="#10b981" strokeWidth={0.8} />
            <line x1={-3} y1={0} x2={3} y2={0} stroke="#10b981" strokeWidth={0.8} />
            <line x1={-3} y1={3} x2={1} y2={3} stroke="#10b981" strokeWidth={0.8} />
          </g>
        )}
        {iconKind === 'loupe' && (
          <g>
            <circle cx={-1} cy={-1} r={4.5} fill="#f0f9ff" stroke="#0284c7" strokeWidth={1.2} />
            <line x1={2.5} y1={2.5} x2={6} y2={6} stroke="#0284c7" strokeWidth={1.4} strokeLinecap="round" />
          </g>
        )}
        {iconKind === 'chart' && (
          <g>
            <rect x={-6} y={-6} width={12} height={12} rx={1.5} fill="#fffbeb" stroke="#f59e0b" strokeWidth={1} />
            <rect x={-4} y={0} width={2} height={4} fill="#f59e0b" />
            <rect x={-1} y={-3} width={2} height={7} fill="#f59e0b" />
            <rect x={2} y={-5} width={2} height={9} fill="#f59e0b" />
          </g>
        )}
        {iconKind === 'gear' && (
          <g>
            <rect x={-6} y={-6} width={12} height={12} rx={1.5} fill="#f5f3ff" stroke="#7c3aed" strokeWidth={1} />
            <circle cx={0} cy={0} r={3} fill="none" stroke="#7c3aed" strokeWidth={1} />
            <path d="M -2.5 -1.5 L 0 0 L -2.5 1.5" fill="none" stroke="#7c3aed" strokeWidth={1} />
          </g>
        )}
        {iconKind === 'check' && (
          <g>
            <circle cx={0} cy={0} r={5.5} fill="#ecfdf5" stroke="#059669" strokeWidth={1.2} />
            <path d="M -2.5 0 L -0.5 2 L 3 -2" fill="none" stroke="#059669" strokeWidth={1.2} strokeLinecap="round" />
          </g>
        )}
        {iconKind === 'report' && (
          <g>
            <rect x={-5} y={-6} width={10} height={12} rx={1.5} fill="#eff6ff" stroke="#2563eb" strokeWidth={1} />
            <rect x={-2} y={-7} width={4} height={2} rx={0.5} fill="#2563eb" />
            <line x1={-3} y1={-2} x2={3} y2={-2} stroke="#2563eb" strokeWidth={0.8} />
            <line x1={-3} y1={1} x2={3} y2={1} stroke="#2563eb" strokeWidth={0.8} />
          </g>
        )}
      </g>

      {/* Readable High-Contrast Text */}
      <text
        x={bubbleX + paddingLeft}
        y={bubbleY + computedHeight / 2 + 3.5}
        textAnchor="start"
        fill="#0f172a"
        fontSize={9.5}
        fontFamily="sans-serif"
        fontWeight={600}
      >
        {text}
      </text>
    </g>
  )
}
