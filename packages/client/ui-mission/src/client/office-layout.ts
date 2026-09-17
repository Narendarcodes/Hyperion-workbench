/**
 * Office layout definitions, station geometries, and floor zones for the Hyperion Mission View.
 * @module @deepseek-ai/dsh-client-ui-mission/client/office-layout
 */

import type { Point2D, Rect2D } from './movement-geometry.ts'
import type { MissionStationId } from './mission-vocabulary.ts'

/** Layout descriptor for a specialist station or work area in the office. */
export interface StationGeometry {
  readonly id: MissionStationId
  readonly label: string
  readonly role: string
  readonly desk: Point2D
  readonly seat: Point2D
  readonly zone: Rect2D
}

/** Layout descriptor for an agent's personal cabin. */
export interface CabinGeometry {
  readonly id: string
  readonly cabinNumber: number
  readonly desk: Point2D
  readonly seat: Point2D
  readonly zone: Rect2D
}

/** Layout descriptor for a shared work area with multiple seats. */
export interface SharedAreaGeometry {
  readonly id: string
  readonly label: string
  readonly zone: Rect2D
  readonly desk: Point2D
  readonly seats: readonly Point2D[]
  readonly waiting: Point2D
}

/** Complete office canvas dimensions matching the visual reference. */
export const OFFICE_DIMENSIONS = {
  width: 960,
  height: 600,
  floor: { x: 20, y: 20, w: 920, h: 560 } satisfies Rect2D,
  entrance: { x: 480, y: 555 } satisfies Point2D,
  corridorY: 285,
  cabinCorridorY: 450,
}
/** 6 Specialist Stations catalog in 2 rows of 3 columns. */
export const OFFICE_STATIONS: Readonly<Record<MissionStationId, StationGeometry>> = {
  documents: {
    id: 'documents',
    label: 'DOCUMENTS',
    role: 'Document Specialist',
    desk: { x: 175, y: 210 },
    seat: { x: 175, y: 220 },
    zone: { x: 40, y: 140, w: 275, h: 140 },
  },
  knowledge: {
    id: 'knowledge',
    label: 'KNOWLEDGE BASE',
    role: 'Knowledge Specialist',
    desk: { x: 480, y: 210 },
    seat: { x: 480, y: 220 },
    zone: { x: 340, y: 140, w: 280, h: 140 },
  },
  analysis: {
    id: 'analysis',
    label: 'ANALYSIS',
    role: 'Analysis Specialist',
    desk: { x: 780, y: 210 },
    seat: { x: 780, y: 220 },
    zone: { x: 645, y: 140, w: 275, h: 140 },
  },
  code: {
    id: 'code',
    label: 'TOOLS / CODE',
    role: 'Coding Specialist',
    desk: { x: 175, y: 375 },
    seat: { x: 175, y: 385 },
    zone: { x: 40, y: 300, w: 275, h: 145 },
  },
  testing: {
    id: 'testing',
    label: 'TESTING',
    role: 'Test Specialist',
    desk: { x: 480, y: 375 },
    seat: { x: 480, y: 385 },
    zone: { x: 340, y: 300, w: 280, h: 145 },
  },
  verification: {
    id: 'verification',
    label: 'VERIFICATION',
    role: 'Verification Specialist',
    desk: { x: 175, y: 80 },
    seat: { x: 175, y: 85 },
    zone: { x: 40, y: 30, w: 275, h: 95 },
  },
  report: {
    id: 'report',
    label: 'REPORT / DELIVERY',
    role: 'Report Specialist',
    desk: { x: 780, y: 375 },
    seat: { x: 780, y: 385 },
    zone: { x: 645, y: 300, w: 275, h: 145 },
  },
  orchestrator: {
    id: 'orchestrator',
    label: 'HYPERION ORCHESTRATOR',
    role: 'Orchestrator',
    desk: { x: 480, y: 85 },
    seat: { x: 480, y: 85 },
    zone: { x: 390, y: 30, w: 180, h: 95 },
  },
  cabin: {
    id: 'cabin',
    label: 'CABIN',
    role: 'Specialist Cabin',
    desk: { x: 95, y: 520 },
    seat: { x: 95, y: 520 },
    zone: { x: 40, y: 475, w: 125, h: 90 },
  },
}

/** Predefined personal cabins along the office wing. */
export const PREDEFINED_CABINS: readonly CabinGeometry[] = [
  {
    id: 'cabin-1',
    cabinNumber: 1,
    desk: { x: 100, y: 520 },
    seat: { x: 100, y: 520 },
    zone: { x: 40, y: 470, w: 125, h: 95 },
  },
  {
    id: 'cabin-2',
    cabinNumber: 2,
    desk: { x: 235, y: 520 },
    seat: { x: 235, y: 520 },
    zone: { x: 175, y: 470, w: 125, h: 95 },
  },
  {
    id: 'cabin-3',
    cabinNumber: 3,
    desk: { x: 370, y: 520 },
    seat: { x: 370, y: 520 },
    zone: { x: 310, y: 470, w: 125, h: 95 },
  },
  {
    id: 'cabin-4',
    cabinNumber: 4,
    desk: { x: 590, y: 520 },
    seat: { x: 590, y: 520 },
    zone: { x: 525, y: 470, w: 125, h: 95 },
  },
  {
    id: 'cabin-5',
    cabinNumber: 5,
    desk: { x: 725, y: 520 },
    seat: { x: 725, y: 520 },
    zone: { x: 660, y: 470, w: 125, h: 95 },
  },
  {
    id: 'cabin-6',
    cabinNumber: 6,
    desk: { x: 860, y: 520 },
    seat: { x: 860, y: 520 },
    zone: { x: 795, y: 470, w: 125, h: 95 },
  },
]

/** Shared work areas with multi-seat configurations. */
export const SHARED_WORK_AREAS: Readonly<Record<string, SharedAreaGeometry>> = {
  documents: {
    id: 'documents',
    label: 'DOCUMENTS',
    zone: { x: 40, y: 140, w: 275, h: 140 },
    desk: { x: 175, y: 210 },
    seats: [
      { x: 110, y: 220 },
      { x: 175, y: 220 },
      { x: 240, y: 220 },
    ],
    waiting: { x: 75, y: 250 },
  },
  knowledge: {
    id: 'knowledge',
    label: 'KNOWLEDGE BASE',
    zone: { x: 340, y: 140, w: 280, h: 140 },
    desk: { x: 480, y: 210 },
    seats: [
      { x: 415, y: 220 },
      { x: 480, y: 220 },
      { x: 545, y: 220 },
    ],
    waiting: { x: 375, y: 250 },
  },
  analysis: {
    id: 'analysis',
    label: 'ANALYSIS',
    zone: { x: 645, y: 140, w: 275, h: 140 },
    desk: { x: 780, y: 210 },
    seats: [
      { x: 715, y: 220 },
      { x: 780, y: 220 },
      { x: 845, y: 220 },
    ],
    waiting: { x: 680, y: 250 },
  },
  code: {
    id: 'code',
    label: 'TOOLS / CODE',
    zone: { x: 40, y: 300, w: 275, h: 145 },
    desk: { x: 175, y: 375 },
    seats: [
      { x: 110, y: 385 },
      { x: 175, y: 385 },
      { x: 240, y: 385 },
    ],
    waiting: { x: 75, y: 420 },
  },
  testing: {
    id: 'testing',
    label: 'TESTING',
    zone: { x: 340, y: 300, w: 280, h: 145 },
    desk: { x: 480, y: 375 },
    seats: [
      { x: 415, y: 385 },
      { x: 480, y: 385 },
      { x: 545, y: 385 },
    ],
    waiting: { x: 375, y: 420 },
  },
  verification: {
    id: 'verification',
    label: 'VERIFICATION',
    zone: { x: 40, y: 30, w: 275, h: 95 },
    desk: { x: 175, y: 80 },
    seats: [
      { x: 110, y: 85 },
      { x: 175, y: 85 },
      { x: 240, y: 85 },
    ],
    waiting: { x: 75, y: 105 },
  },
  report: {
    id: 'report',
    label: 'REPORT / DELIVERY',
    zone: { x: 645, y: 300, w: 275, h: 145 },
    desk: { x: 780, y: 375 },
    seats: [
      { x: 715, y: 385 },
      { x: 780, y: 385 },
      { x: 845, y: 385 },
    ],
    waiting: { x: 680, y: 420 },
  },
  orchestrator: {
    id: 'orchestrator',
    label: 'HYPERION ORCHESTRATOR',
    zone: { x: 390, y: 30, w: 180, h: 95 },
    desk: { x: 480, y: 85 },
    seats: [
      { x: 435, y: 105 },
      { x: 480, y: 115 },
      { x: 525, y: 105 },
    ],
    waiting: { x: 480, y: 125 },
  },
}

/** Orchestrator dais geometry at top center. */
export const ORCHESTRATOR_GEOMETRY = {
  center: { x: 480, y: 85 } satisfies Point2D,
  dais: { x: 480, y: 85, w: 180, h: 75 },
  seat: { x: 480, y: 85 } satisfies Point2D,
}

/**
 * Returns cabin geometry by 1-based cabin number.
 *
 * @param cabinNumber - The 1-based index of the cabin.
 * @returns Deterministic CabinGeometry.
 */
export function getCabinGeometry(cabinNumber: number): CabinGeometry {
  const idx = Math.max(1, Math.floor(cabinNumber))
  const predefined = PREDEFINED_CABINS.find(c => c.cabinNumber === idx)
  if (predefined !== undefined) return predefined
  // ponytail: overflow cabins wrap to a deterministic second row above the
  // predefined wing (same 125x95 footprint, 10px gaps) so >6 agents never overlap.
  const extra = idx - PREDEFINED_CABINS.length - 1
  const col = extra % PREDEFINED_CABINS.length
  const row = Math.floor(extra / PREDEFINED_CABINS.length) + 1
  const first = PREDEFINED_CABINS[0] ?? {
    id: 'cabin-1',
    cabinNumber: 1,
    desk: { x: 100, y: 520 },
    seat: { x: 100, y: 520 },
    zone: { x: 40, y: 470, w: 125, h: 95 },
  }
  const colX = first.zone.x + col * (first.zone.w + 10)
  const rowY = first.zone.y - row * (first.zone.h + 10)
  const seatYOffset = first.seat.y - (first.zone.y + first.zone.h / 2)
  return {
    id: `cabin-${idx}`,
    cabinNumber: idx,
    desk: { x: colX + first.zone.w / 2, y: rowY + first.zone.h / 2 + seatYOffset },
    seat: { x: colX + first.zone.w / 2, y: rowY + first.zone.h / 2 + seatYOffset },
    zone: { x: colX, y: rowY, w: first.zone.w, h: first.zone.h },
  }
}
/**
 * Allocates a deterministic seat in a shared work area for an agent.
 *
 * @param zoneId - The shared area zone.
 * @param agentId - The agent ID requesting a seat.
 * @param allAgentIdsAtZone - Sorted list of all agent IDs concurrently targeting or at this zone.
 * @returns The 2D coordinates for the allocated seat.
 */
export function allocateSharedSeat(
  zoneId: string,
  agentId: string,
  allAgentIdsAtZone: readonly string[],
): Point2D {
  const area = SHARED_WORK_AREAS[zoneId]
  if (area === undefined) {
    const station = Object.hasOwn(OFFICE_STATIONS, zoneId)
      ? OFFICE_STATIONS[zoneId as MissionStationId]
      : undefined
    return station !== undefined ? station.seat : { x: 480, y: 285 }
  }
  const sorted = [...allAgentIdsAtZone].sort()
  const seatIdx = sorted.indexOf(agentId)
  if (seatIdx >= 0 && seatIdx < area.seats.length) {
    const seat = area.seats[seatIdx]
    if (seat !== undefined) return seat
  }
  if (seatIdx >= area.seats.length) {
    const offset = (seatIdx - area.seats.length + 1) * 16
    return { x: area.waiting.x + offset, y: area.waiting.y }
  }
  return area.seats[0] ?? { x: 480, y: 285 }
}
/** Potted plants decorative coordinates. */
export const PLANT_LOCATIONS: readonly Point2D[] = [
  { x: 45, y: 140 },
  { x: 45, y: 320 },
  { x: 380, y: 140 },
  { x: 580, y: 140 },
  { x: 915, y: 140 },
  { x: 915, y: 370 },
  { x: 915, y: 530 },
]

/**
 * Returns station geometry by ID.
 *
 * @param id - Station identifier.
 * @returns Station geometry configuration.
 */
export function getStationGeometry(id: MissionStationId): StationGeometry {
  return OFFICE_STATIONS[id]
}
