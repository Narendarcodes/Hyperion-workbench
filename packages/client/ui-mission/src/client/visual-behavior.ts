/**
 * Pure visual behavior derivation mapping worker domain state to visual glyphs, motion, and bubble priority.
 * @module @deepseek-ai/dsh-client-ui-mission/client/visual-behavior
 */

import type { MissionStationId } from './mission-vocabulary.ts'
import { classifyTool } from './mission-vocabulary.ts'
import type { MissionWorker } from './mission-contract.ts'

/** Visual representation attributes computed for a worker figure. */
export interface VisualBehavior {
  readonly targetSeat: MissionStationId
  readonly glyph: 'document' | 'loupe' | 'terminal' | 'idle' | 'alert' | 'check'
  readonly motion: 'walk' | 'seated' | 'none'
  readonly bubblePriority: number
}

/**
 * Derives the visual representation, motion state, and glyph for a mission worker.
 *
 * @param worker - The domain mission worker state.
 * @param previousStation - The previous station assigned to this worker, if any.
 * @returns The pure visual behavior attributes for rendering.
 */
export function deriveVisualBehavior(
  worker: MissionWorker,
  previousStation?: MissionStationId,
): VisualBehavior {
  const targetSeat = worker.station

  // Motion rule R1: walk ONLY if station changed from previous or newly spawning
  let motion: VisualBehavior['motion'] = 'seated'
  if (previousStation !== undefined && previousStation !== targetSeat) {
    motion = 'walk'
  }

  // Glyph selection based on tool family and status
  let glyph: VisualBehavior['glyph'] = 'idle'
  if (worker.status === 'searching') {
    glyph = 'loupe'
  } else if (worker.status === 'working' || worker.status === 'executing') {
    if (worker.currentTool !== undefined) {
      const classified = classifyTool(worker.currentTool)
      glyph = classified.family === 'documents' ? 'document' : 'terminal'
    } else {
      glyph = targetSeat === 'documents' ? 'document' : targetSeat === 'knowledge' ? 'loupe' : 'terminal'
    }
  } else if (worker.status === 'blocked' || worker.status === 'failed') {
    glyph = 'alert'
  } else if (worker.status === 'completed') {
    glyph = 'check'
  }

  // Bubble priority: 0 orchestrator, 1 blocked/verifying, 2 active work, 3 idle/completed
  let bubblePriority = 3
  if (worker.status === 'blocked' || worker.status === 'verifying') {
    bubblePriority = 1
  } else if (worker.status === 'working' || worker.status === 'searching' || worker.status === 'executing' || worker.status === 'planning' || worker.status === 'delegating') {
    bubblePriority = 2
  }

  return {
    targetSeat,
    glyph,
    motion,
    bubblePriority,
  }
}
