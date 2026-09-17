/**
 * WorkerFigure: pixel-art specialist agent character figure with status rings and badge glyphs.
 * @module @deepseek-ai/dsh-client-ui-mission/client/WorkerFigure
 */

import { useMemo } from 'react'
import type { MissionAgentStatus } from './mission-vocabulary.ts'
import { generateCharacterPixels } from './sprite-grid.ts'
import { CHARACTERS, type CharacterStyle } from './characters.ts'

/** Props for WorkerFigure. */
export interface WorkerFigureProps {
  readonly x: number
  readonly y: number
  readonly characterKey: string
  readonly status?: MissionAgentStatus | undefined
  readonly glyph?: 'document' | 'loupe' | 'terminal' | 'idle' | 'alert' | 'check' | undefined
  readonly frame?: number | undefined
  readonly scale?: number | undefined
  readonly isOrchestrator?: boolean | undefined
}

/**
 * Renders an agent figure using pixel-matrix rendering and status indicators.
 *
 * @param props - Position, character identity, status, and animation frame.
 * @returns SVG group rendering pixel figure and aura rings.
 */
export function WorkerFigure({
  x,
  y,
  characterKey,
  status = 'idle',
  frame = 0,
  scale = 2.2,
  isOrchestrator = false,
}: WorkerFigureProps) {
  const config: CharacterStyle = CHARACTERS[characterKey] ?? CHARACTERS.code ?? {
    role: 'Agent',
    color: '#059669',
    hairColor: '#064e3b',
    accessory: 'glasses',
    station: 'code',
  }

  const pixels = useMemo(() => {
    return generateCharacterPixels(config.color, config.hairColor, config.accessory, frame)
  }, [config.color, config.hairColor, config.accessory, frame])

  // If this is the orchestrator, render the glowing holographic crystal orb
  if (isOrchestrator) {
    return (
      <g className="orchestrator-orb" transform={`translate(${x}, ${y})`}>
        {/* Hologram Projection Beam Base */}
        <ellipse cx={0} cy={12} rx={22} ry={7} fill="#6366f1" fillOpacity={0.4} />
        {/* Crystal Orb Core */}
        <circle cx={0} cy={-2} r={18} fill="#3b82f6" fillOpacity={0.85} />
        <circle cx={0} cy={-2} r={14} fill="#8b5cf6" fillOpacity={0.9} />
        <circle cx={-4} cy={-6} r={5} fill="#ffffff" fillOpacity={0.8} />
        {/* Energy Rings */}
        <ellipse cx={0} cy={-2} rx={24} ry={8} fill="none" stroke="#38bdf8" strokeWidth={1.5} strokeOpacity={0.7} />
        <ellipse cx={0} cy={-2} rx={20} ry={14} fill="none" stroke="#c084fc" strokeWidth={1} strokeOpacity={0.6} />
      </g>
    )
  }

  const pixelSize = scale
  const offset = (16 * pixelSize) / 2
  const figureX = x - offset
  const figureY = y - offset

  return (
    <g className="worker-figure" data-agent={characterKey} data-status={status}>
      {/* Ground Shadow */}
      <ellipse
        cx={x}
        cy={y + offset - 2}
        rx={offset * 0.85}
        ry={offset * 0.3}
        fill="#000000"
        fillOpacity={0.25}
      />

      {/* Pixel Art Sprite Matrix */}
      <g transform={`translate(${figureX}, ${figureY})`}>
        {pixels.map((p, idx) => (
          <rect
            key={`${idx}-${p.x}-${p.y}`}
            x={p.x * pixelSize}
            y={p.y * pixelSize}
            width={pixelSize + 0.15}
            height={pixelSize + 0.15}
            fill={p.color}
          />
        ))}
      </g>
    </g>
  )
}
