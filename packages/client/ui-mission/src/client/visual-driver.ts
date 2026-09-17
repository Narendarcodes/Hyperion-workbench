/**
 * Visual driver: RAF movement interpolation loop and worker position tracking for the office simulation.
 * @module @deepseek-ai/dsh-client-ui-mission/client/visual-driver
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Point2D } from './movement-geometry.ts'
import {
  calculatePath,
  interpolatePosition,
} from './movement-geometry.ts'
import type { MissionOfficeState, MissionWorker } from './mission-contract.ts'
import {
  OFFICE_DIMENSIONS,
  ORCHESTRATOR_GEOMETRY,
  allocateSharedSeat,
  getCabinGeometry,
} from './office-layout.ts'
import type { MissionCabin } from './mission-contract.ts'
import { deriveVisualBehavior, type VisualBehavior } from './visual-behavior.ts'

/** Renderable state of one animated worker in the office. */
export interface RenderWorker {
  readonly id: string
  readonly label: string
  readonly characterKey: string
  readonly status: MissionWorker['status']
  readonly pos: Point2D
  readonly targetPos: Point2D
  readonly frame: number
  readonly isMoving: boolean
  readonly bubble: string | null
  readonly visualBehavior: VisualBehavior
}

/** Renderable state of the orchestrator. */
export interface RenderOrchestrator {
  readonly pos: Point2D
  readonly status: MissionOfficeState['orchestrator']['status']
  readonly bubble: string
}

/** Complete render state for the office scene. */
export interface RenderOfficeState {
  readonly orchestrator: RenderOrchestrator
  readonly workers: readonly RenderWorker[]
  readonly activeBubbles: readonly { id: string; x: number; y: number; text: string; status: string }[]
}

interface WorkerMovementRecord {
  pos: Point2D
  targetPos: Point2D
  waypoints: readonly Point2D[]
  waypointIndex: number
  frame: number
  stepTimer: number
  previousStation?: string
}

/** Resolves the deterministic target position for a worker figure. */
function resolveWorkerTarget(
  worker: MissionWorker,
  allWorkers: readonly MissionWorker[],
  cabins: readonly MissionCabin[] = [],
): Point2D {
  const loc = worker.currentLocation
  if (loc !== undefined) {
    if (loc.kind === 'cabin') {
      const cabin = cabins.find(c => c.id === loc.zone || c.agentId === worker.id)
      const cabinNum = cabin?.seatIndex ?? (worker.cabinId ? Number.parseInt(worker.cabinId.replace(/\D/g, ''), 10) || 1 : 1)
      return getCabinGeometry(cabinNum).seat
    }
    if (loc.kind === 'orchestrator') {
      const concurrent = allWorkers
        .filter(w => w.currentLocation?.kind === 'orchestrator')
        .map(w => w.id)
      return allocateSharedSeat('orchestrator', worker.id, concurrent)
    }
    if (loc.kind === 'shared') {
      const zone = loc.zone
      const concurrent = allWorkers
        .filter(w => w.currentLocation?.zone === zone || (!w.currentLocation && w.station === zone))
        .map(w => w.id)
      return allocateSharedSeat(zone, worker.id, concurrent)
    }
  }
  const concurrent = allWorkers
    .filter(w => w.station === worker.station)
    .map(w => w.id)
  return allocateSharedSeat(worker.station, worker.id, concurrent)
}

const SPEED_PX_PER_SEC = 60
const WALK_FRAME_INTERVAL_SEC = 0.15

/**
 * Custom React hook driving the RAF interpolation loop over Mission office state.
 *
 * @param officeState - The domain mission office state from snapshot.
 * @param reducedMotion - Whether user prefers reduced motion (skips RAF animation).
 * @returns Synchronized renderable office state.
 */
export function useOfficeVisualDriver(
  officeState: MissionOfficeState,
  reducedMotion = false,
): RenderOfficeState {
  const movementRef = useRef<Map<string, WorkerMovementRecord>>(new Map())
  const [, setFrameTick] = useState(0)

  // Synchronize target positions with new domain workers
  const syncTargets = useCallback(() => {
    const movements = movementRef.current
    const activeIds = new Set<string>()

    for (const worker of officeState.workers) {
      activeIds.add(worker.id)
      const targetSeat = resolveWorkerTarget(worker, officeState.workers, officeState.cabins)
      const corridorY = targetSeat.y > 450 ? OFFICE_DIMENSIONS.cabinCorridorY : OFFICE_DIMENSIONS.corridorY

      const existing = movements.get(worker.id)
      if (existing === undefined) {
        // Spawn at entrance and route path to assigned seat
        const startPos = { ...OFFICE_DIMENSIONS.entrance }
        const path = reducedMotion ? [targetSeat] : calculatePath(startPos, targetSeat, corridorY)
        movements.set(worker.id, {
          pos: reducedMotion ? targetSeat : startPos,
          targetPos: targetSeat,
          waypoints: path,
          waypointIndex: 0,
          frame: 0,
          stepTimer: 0,
          previousStation: worker.station,
        })
      } else if (
        existing.previousStation !== worker.station ||
        existing.targetPos.x !== targetSeat.x ||
        existing.targetPos.y !== targetSeat.y
      ) {
        // Station or target seat changed: plan route from current position to new seat
        const path = reducedMotion ? [targetSeat] : calculatePath(existing.pos, targetSeat, corridorY)
        existing.targetPos = targetSeat
        existing.waypoints = path
        existing.waypointIndex = 0
        existing.previousStation = worker.station
      }
    }

    // Clean up unseated or removed workers
    for (const id of movements.keys()) {
      if (!activeIds.has(id)) {
        movements.delete(id)
      }
    }
  }, [officeState.workers, officeState.cabins, reducedMotion])

  useEffect(() => {
    syncTargets()
  }, [syncTargets])

  // RAF movement animation frame loop
  useEffect(() => {
    if (reducedMotion) return

    let animationFrameId: number
    let lastTime = performance.now()

    const loop = (time: number) => {
      const deltaSec = Math.min(0.1, (time - lastTime) / 1000)
      lastTime = time

      let hasMotion = false
      const movements = movementRef.current

      for (const record of movements.values()) {
        if (record.waypointIndex < record.waypoints.length) {
          const currentWaypoint = record.waypoints[record.waypointIndex]
          if (currentWaypoint !== undefined) {
            const { pos, reached } = interpolatePosition(record.pos, currentWaypoint, SPEED_PX_PER_SEC, deltaSec)
            record.pos = pos
            hasMotion = true

            // Advance walk frame
            record.stepTimer += deltaSec
            if (record.stepTimer >= WALK_FRAME_INTERVAL_SEC) {
              record.stepTimer = 0
              record.frame = record.frame === 1 ? 2 : 1
            }

            if (reached) {
              record.waypointIndex++
              if (record.waypointIndex >= record.waypoints.length) {
                record.frame = 0
              }
            }
          }
        }
      }

      if (hasMotion) {
        setFrameTick(t => t + 1)
      }

      animationFrameId = requestAnimationFrame(loop)
    }

    animationFrameId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [reducedMotion])

  // Compose render state
  const movements = movementRef.current
  const renderWorkers: RenderWorker[] = officeState.workers.map((worker) => {
    const targetSeat = resolveWorkerTarget(worker, officeState.workers, officeState.cabins)
    const record = movements.get(worker.id)
    const pos = record ? record.pos : targetSeat
    const frame = record ? record.frame : 0
    const isMoving = record ? record.waypointIndex < record.waypoints.length : false
    const visualBehavior = deriveVisualBehavior(worker)

    return {
      id: worker.id,
      label: worker.label,
      characterKey: worker.station,
      status: worker.status,
      pos,
      targetPos: targetSeat,
      frame,
      isMoving,
      bubble: worker.bubble,
      visualBehavior,
    }
  })

  // Select up to 3 highest priority active bubbles (orchestrator + 2 workers)
  const bubbles: { id: string; x: number; y: number; text: string; status: string; priority: number }[] = []

  // Orchestrator bubble (Priority 0)
  if (officeState.orchestrator.bubble && officeState.orchestrator.bubble.length > 0) {
    bubbles.push({
      id: 'orchestrator',
      x: ORCHESTRATOR_GEOMETRY.seat.x,
      y: ORCHESTRATOR_GEOMETRY.seat.y,
      text: officeState.orchestrator.bubble,
      status: officeState.orchestrator.status,
      priority: 0,
    })
  }

  // Worker bubbles sorted by visual behavior priority
  const candidateWorkerBubbles = renderWorkers
    .filter(w => w.bubble !== null && w.bubble.length > 0)
    .map(w => ({
      id: w.id,
      x: w.pos.x,
      y: w.pos.y,
      text: w.bubble ?? '',
      status: w.status,
      priority: w.visualBehavior.bubblePriority,
    }))
    .sort((a, b) => a.priority - b.priority)

  // Cap visible bubbles to 3
  const activeBubbles = [
    ...bubbles,
    ...candidateWorkerBubbles.slice(0, Math.max(0, 3 - bubbles.length)),
  ]

  return {
    orchestrator: {
      pos: ORCHESTRATOR_GEOMETRY.seat,
      status: officeState.orchestrator.status,
      bubble: officeState.orchestrator.bubble,
    },
    workers: renderWorkers,
    activeBubbles,
  }
}
