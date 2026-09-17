/**
 * Agent Virtual Office (AVO)
 * Copyright (c) 2024
 * Licensed under the MIT License.
 * Adapted for Hyperion Mission View: pure geometry and path calculations.
 * @module @deepseek-ai/dsh-client-ui-mission/client/movement-geometry
 */

/** 2D point representation. */
export interface Point2D {
  readonly x: number
  readonly y: number
}

/** 2D rectangle representation. */
export interface Rect2D {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/**
 * Computes Euclidean distance between two points.
 *
 * @param a - Start point.
 * @param b - End point.
 * @returns Distance in units.
 */
export function distance(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Checks if a point is contained within a rectangle.
 *
 * @param p - Point to test.
 * @param r - Rectangle boundaries.
 * @returns True if point is inside rectangle.
 */
export function pointInRect(p: Point2D, r: Rect2D): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
}

/**
 * Clamps a position inside floor zones.
 *
 * @param pos - Requested position.
 * @param floor - Floor rectangle bounds.
 * @returns Clamped safe coordinates.
 */
export function clampToFloor(pos: Point2D, floor: Rect2D): Point2D {
  return {
    x: Math.max(floor.x, Math.min(floor.x + floor.w, pos.x)),
    y: Math.max(floor.y, Math.min(floor.y + floor.h, pos.y)),
  }
}

/**
 * Linearly interpolates between current and target position given velocity and delta time.
 *
 * @param current - Current position.
 * @param target - Target destination.
 * @param speed - Pixels per second.
 * @param deltaSeconds - Elapsed seconds since last frame.
 * @returns New position and whether destination was reached.
 */
export function interpolatePosition(
  current: Point2D,
  target: Point2D,
  speed: number,
  deltaSeconds: number,
): { pos: Point2D; reached: boolean } {
  const dist = distance(current, target)
  const maxStep = speed * deltaSeconds

  if (dist <= maxStep || dist < 1.0) {
    return { pos: target, reached: true }
  }

  const ratio = maxStep / dist
  return {
    pos: {
      x: current.x + (target.x - current.x) * ratio,
      y: current.y + (target.y - current.y) * ratio,
    },
    reached: false,
  }
}

/**
 * Calculates intermediate corridor waypoints between two points to route around center obstacles.
 *
 * @param start - Starting position.
 * @param destination - Target position.
 * @param corridorY - Preferred horizontal corridor line Y coordinate.
 * @returns Array of waypoints to follow in sequence.
 */
export function calculatePath(
  start: Point2D,
  destination: Point2D,
  corridorY = 310,
): readonly Point2D[] {
  // If in direct vertical alignment or close, direct path
  if (Math.abs(start.x - destination.x) < 20 || Math.abs(start.y - destination.y) < 20) {
    return [destination]
  }

  // Two-segment or three-segment path through main corridor
  const waypoints: Point2D[] = [
    { x: start.x, y: corridorY },
    { x: destination.x, y: corridorY },
    destination,
  ]
  return waypoints
}
