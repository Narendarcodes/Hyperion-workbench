/**
2D grid-based A* pathfinding for PixelOffice.
*/

export type NavGrid2D = {
  cells: Uint8Array
  cols: number
  rows: number
  cellSize: number
}

export type Waypoint = { x: number; y: number }

export function astar2D(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  grid: NavGrid2D,
): Waypoint[] {
  const { cells, cols, rows, cellSize } = grid

  const toCell = (x: number, y: number) => ({
    c: clamp(Math.floor(x / cellSize), 0, cols - 1),
    r: clamp(Math.floor(y / cellSize), 0, rows - 1),
  })
  const cellCenter = (c: number, r: number): Waypoint => ({
    x: c * cellSize + cellSize / 2,
    y: r * cellSize + cellSize / 2,
  })

  let { c: sc, r: sr } = toCell(sx, sy)
  let { c: ec, r: er } = toCell(ex, ey)

  // If start or end is inside a blocked cell, find the nearest free cell.
  const startFree = findFreeCell(sc, sr, cells, cols, rows)
  const endFree = findFreeCell(ec, er, cells, cols, rows)
  if (!startFree || !endFree) return []
  sc = startFree.c
  sr = startFree.r
  ec = endFree.c
  er = endFree.r

  if (sc === ec && sr === er) return [{ x: ex, y: ey }]

  // A* with binary-heap open set
  const nodeCount = cols * rows
  const gCost = new Float32Array(nodeCount).fill(Infinity)
  const parent = new Int32Array(nodeCount).fill(-1)
  const visited = new Uint8Array(nodeCount)
  const startIdx = sr * cols + sc
  const endIdx = er * cols + ec
  gCost[startIdx] = 0

  const open: [number, number][] = []
  heapPush(open, [startIdx, heuristic(sc, sr, ec, er)])

  const DIRS: [number, number, number][] = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.414],
    [1, -1, 1.414],
    [-1, 1, 1.414],
    [-1, -1, 1.414],
  ]

  while (open.length > 0) {
    const entry = heapPop(open)
    if (!entry) break
    const [current] = entry
    if (visited[current]) continue
    visited[current] = 1

    if (current === endIdx) {
      // Reconstruct path
      const path: Waypoint[] = []
      let node = current
      while (node !== startIdx && node >= 0) {
        const c = node % cols
        const r = Math.floor(node / cols)
        path.push(cellCenter(c, r))
        node = parent[node] ?? -1
      }
      path.reverse()
      // Replace the last waypoint with the exact destination
      if (path.length > 0) {
        path[path.length - 1] = { x: ex, y: ey }
      } else {
        path.push({ x: ex, y: ey })
      }
      return path
    }

    const cc = current % cols
    const cr = Math.floor(current / cols)

    for (const [dc, dr, cost] of DIRS) {
      const nc = cc + dc
      const nr = cr + dr
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue
      const ni = nr * cols + nc
      if (visited[ni] || cells[ni]) continue

      // Prevent diagonal corner-cutting
      if (dc !== 0 && dr !== 0) {
        if (cells[cr * cols + (cc + dc)] || cells[(cr + dr) * cols + cc]) {
          continue
        }
      }

      const currentCost = gCost[current] ?? 0
      const ng = currentCost + cost
      const targetCost = gCost[ni] ?? Infinity
      if (ng < targetCost) {
        gCost[ni] = ng
        parent[ni] = current
        heapPush(open, [ni, ng + heuristic(nc, nr, ec, er)])
      }
    }
  }

  // No path found — return empty (caller should not fall back to direct movement)
  return []
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function heuristic(c1: number, r1: number, c2: number, r2: number): number {
  return Math.hypot(c2 - c1, r2 - r1)
}

function findFreeCell(
  c: number,
  r: number,
  cells: Uint8Array,
  cols: number,
  rows: number,
): { c: number; r: number } | null {
  if (!cells[r * cols + c]) return { c, r }
  for (let dist = 1; dist < 12; dist++) {
    for (let dr = -dist; dr <= dist; dr++) {
      for (let dc = -dist; dc <= dist; dc++) {
        if (Math.abs(dr) !== dist && Math.abs(dc) !== dist) continue
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
        if (!cells[nr * cols + nc]) return { c: nc, r: nr }
      }
    }
  }
  return null
}

function heapPush(heap: [number, number][], entry: [number, number]): void {
  heap.push(entry)
  let i = heap.length - 1
  while (i > 0) {
    const pi = Math.floor((i - 1) / 2)
    const parentEntry = heap[pi]
    if (!parentEntry || parentEntry[1] <= entry[1]) break
    heap[i] = parentEntry
    i = pi
  }
  heap[i] = entry
}

function heapPop(heap: [number, number][]): [number, number] | null {
  if (heap.length === 0) return null
  const first = heap[0] ?? null
  const last = heap.pop()
  if (!last || heap.length === 0) return first
  let i = 0
  while (true) {
    const li = i * 2 + 1
    const ri = li + 1
    if (li >= heap.length) break
    let si = li
    const leftEntry = heap[li]
    const rightEntry = heap[ri]
    if (rightEntry && leftEntry && rightEntry[1] < leftEntry[1]) si = ri
    const selectedEntry = heap[si]
    if (!selectedEntry || selectedEntry[1] >= last[1]) break
    heap[i] = selectedEntry
    i = si
  }
  heap[i] = last
  return first
}
