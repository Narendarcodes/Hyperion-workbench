/**
 * Native Gather-style 2D pixel office canvas component for Hyperion Mission View.
 * Renders the full Hermes HQ pixel map, animated agents, speech bubbles,
 * furniture, and zones directly on an HTML5 2D canvas with 60fps performance.
 * @module @deepseek-ai/dsh-client-ui-mission/client/pixel-office/PixelOfficeCanvas
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MissionSnapshot } from '../mission-contract.ts'
import {
  CHARACTER_HEIGHT,
  CHARACTER_WIDTH,
  OBJECT_FOOTPRINT,
  PIXEL_TILE_SIZE,
  type CharacterFrameName,
  type CharacterFrameSet,
  type CharacterLook,
  type PixelAgentInput,
  type PixelAgentPose,
  type PixelOfficeMap,
  type PixelSprite,
} from './types.ts'
import {
  buildCharacterFrames,
  buildFurnitureSprites,
  buildGroundTileSprites,
  paintSpriteToContext,
} from './art/index.ts'
import { buildHermesHqMap } from './map/hermesHqMap.ts'
import { createPixelSimulation, type PixelSimulation } from './sim/agentSimulation.ts'
import css from './PixelOfficeCanvas.module.css'

const TILE = PIXEL_TILE_SIZE
const WALK_FRAME_MS = 140
const DANCE_FRAME_MS = 260

const STATUS_COLOR: Record<string, string> = {
  working: '#10b981',
  searching: '#06b6d4',
  waiting: '#f59e0b',
  blocked: '#ef4444',
  error: '#ef4444',
  completed: '#22c55e',
  idle: '#64748b',
}

export interface PixelOfficeCanvasProps {
  readonly snapshot: MissionSnapshot
}

const DEFAULT_AGENTS = [
  { id: 'lead', name: 'Lead Architect', role: 'Orchestrator', color: '#f59e0b' },
  { id: 'analyst', name: 'Domain Analyst', role: 'Specification', color: '#3b82f6' },
  { id: 'engineer', name: 'Core Engineer', role: 'Implementation', color: '#10b981' },
  { id: 'verifier', name: 'Safety Officer', role: 'Verification', color: '#ec4899' },
]

export function PixelOfficeCanvas({ snapshot }: PixelOfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [zoom, setZoom] = useState<number>(0.75)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const map = useMemo<PixelOfficeMap>(() => buildHermesHqMap(), [])
  const simRef = useRef<PixelSimulation | null>(null)
  if (simRef.current === null) {
    simRef.current = createPixelSimulation(map)
  }

  // Pre-rendered ground canvas
  const groundCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const furnitureSpritesRef = useRef<Record<string, PixelSprite>>({})
  const characterFrameSetsRef = useRef<Map<string, CharacterFrameSet>>(new Map())

  // Pan / drag state
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const zoomRef = useRef<number>(0.75)

  panRef.current = pan
  zoomRef.current = zoom

  // Initial center on the main product pod / orchestrator
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.width / 2 - (28 * TILE) * zoomRef.current
      const centerY = rect.height / 2 - (20 * TILE) * zoomRef.current
      setPan({ x: centerX, y: centerY })
    }
  }, [])

  // Build ground layer offscreen canvas once
  useEffect(() => {
    const tileSprites = buildGroundTileSprites()
    const groundMap: Record<string, PixelSprite> = {}
    for (const s of tileSprites) {
      groundMap[s.key.replace(/^tile_/, '')] = s
    }

    const furnitureSprites = buildFurnitureSprites()
    const furnMap: Record<string, PixelSprite> = {}
    for (const s of furnitureSprites) {
      furnMap[s.key.replace(/^furn_/, '')] = s
    }
    furnitureSpritesRef.current = furnMap

    const offscreen = document.createElement('canvas')
    offscreen.width = map.cols * TILE
    offscreen.height = map.rows * TILE
    const ctx = offscreen.getContext('2d')

    if (ctx) {
      for (let y = 0; y < map.rows; y++) {
        for (let x = 0; x < map.cols; x++) {
          const tileKind = map.ground[y * map.cols + x]
          if (tileKind) {
            const sprite = groundMap[tileKind]
            if (sprite) {
              paintSpriteToContext(sprite, ctx, x * TILE, y * TILE)
            }
          }
        }
      }
    }
    groundCanvasRef.current = offscreen
  }, [map])

  // Derive agent inputs from snapshot
  const agentInputs = useMemo<PixelAgentInput[]>(() => {
    const workers = snapshot.office.workers
    const orchestrator = snapshot.office.orchestrator

    if (workers.length === 0) {
      // Map default squad
      return DEFAULT_AGENTS.map((item, idx) => {
        const isLead = idx === 0
        const isWorking = isLead ? orchestrator.status === 'working' : false

        return {
          id: item.id,
          name: item.name,
          status: isWorking ? 'working' : 'idle',
          color: item.color,
          streaming: isWorking,
          thinking: orchestrator.status === 'searching' || orchestrator.status === 'waiting',
          awaitingApproval: snapshot.verification.some(v => v.status === 'pending'),
          dancing: orchestrator.status === 'completed',
          hold: isLead ? 'orchestrator' : null,
          standup: false,
          skill: null,
          plan: null,
        }
      })
    }

    return workers.map((worker) => {
      const isWorking = worker.status === 'working' || worker.status === 'executing'
      const isSearching = worker.status === 'searching'
      const isWaiting = worker.status === 'waiting'
      const isBlocked = worker.status === 'blocked' || worker.status === 'failed'

      let hold: PixelAgentInput['hold'] = null
      if (worker.currentTool === 'web_search') hold = 'library'
      else if (worker.currentTool === 'bash' || worker.currentTool === 'terminal') hold = 'qa_lab'
      else if (worker.currentTool === 'skill') hold = 'gym'
      else if (isWaiting) hold = 'phone_booth'

      return {
        id: worker.id,
        name: worker.label,
        status: isWorking || isSearching ? 'working' : isBlocked ? 'error' : 'idle',
        color: worker.id === 'lead' ? '#f59e0b' : '#3b82f6',
        streaming: isWorking,
        thinking: isSearching || isWaiting,
        awaitingApproval: isWaiting || snapshot.verification.some(v => v.status === 'pending'),
        dancing: orchestrator.status === 'completed',
        hold,
        standup: false,
        skill: null,
        plan: null,
      }
    })
  }, [snapshot])

  // Get cached character frames
  const getCharacterFrames = useCallback((agentId: string, color: string): CharacterFrameSet => {
    let set = characterFrameSetsRef.current.get(agentId)
    if (!set) {
      const look: CharacterLook = {
        seed: agentId,
        accentColor: color,
      }
      set = buildCharacterFrames(look)
      characterFrameSetsRef.current.set(agentId, set)
    }
    return set
  }, [])

  // Animation Loop
  const posesRef = useRef<PixelAgentPose[]>([])

  useEffect(() => {
    let animationFrameId: number
    let lastTime = performance.now()

    const render = (now: number) => {
      const dt = Math.min(now - lastTime, 100)
      lastTime = now

      const canvas = canvasRef.current
      if (!canvas) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      // Update simulation
      if (simRef.current) {
        posesRef.current = simRef.current.tick({
          inputs: agentInputs,
          nowMs: now,
          dtMs: dt,
          cleaningActive: false,
        })
      }

      // Clear Canvas
      ctx.fillStyle = '#1a1d26'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.save()
      // Apply Camera Pan and Zoom
      ctx.translate(panRef.current.x, panRef.current.y)
      ctx.scale(zoomRef.current, zoomRef.current)

      // 1. Draw Ground Layer
      if (groundCanvasRef.current) {
        ctx.drawImage(groundCanvasRef.current, 0, 0)
      }

      // 2. Collect render items for depth sorting (Y-sort)
      type RenderItem =
        | { kind: 'furniture'; y: number; obj: typeof map.objects[0]; sprite: PixelSprite }
        | { kind: 'agent'; y: number; pose: PixelAgentPose; input: PixelAgentInput }

      const items: RenderItem[] = []

      // Furniture items
      if (furnitureSpritesRef.current) {
        for (const obj of map.objects) {
          const sprite = furnitureSpritesRef.current[obj.kind]
          if (sprite) {
            const footprint = OBJECT_FOOTPRINT[obj.kind]
            const fh = footprint ? footprint[1] : 1
            const ySort = (obj.ty + fh) * TILE
            items.push({ kind: 'furniture', y: ySort, obj, sprite })
          }
        }
      }

      // Agent items
      for (const pose of posesRef.current) {
        const input = agentInputs.find(a => a.id === pose.id) ?? {
          id: pose.id,
          name: pose.id,
          status: 'idle' as const,
          color: '#3b82f6',
          streaming: false,
          thinking: false,
          awaitingApproval: false,
          dancing: false,
          hold: null,
          standup: false,
          skill: null,
          plan: null,
        }
        items.push({ kind: 'agent', y: pose.y, pose, input })
      }

      // Sort by Y coordinate for correct perspective
      items.sort((a, b) => a.y - b.y)

      // 3. Render Depth-Sorted Items
      for (const item of items) {
        if (item.kind === 'furniture') {
          paintSpriteToContext(item.sprite, ctx, item.obj.tx * TILE, item.obj.ty * TILE)
        } else {
          const { pose, input } = item
          const frames = getCharacterFrames(input.id, input.color || '#3b82f6')

          // Determine frame name
          let frameName: CharacterFrameName = `idle_${pose.facing}`
          if (pose.activity === 'walking') {
            const walkStep = Math.floor((now / WALK_FRAME_MS) % 2)
            frameName = walkStep === 0 ? `walk_${pose.facing}_a` : `walk_${pose.facing}_b`
          } else if (pose.activity === 'sitting_desk') {
            frameName = `sit_${pose.facing}`
          } else if (pose.activity === 'dancing') {
            const danceStep = Math.floor((now / DANCE_FRAME_MS) % 2)
            frameName = danceStep === 0 ? 'dance_a' : 'dance_b'
          }

          const sprite = frames[frameName] || frames[`idle_${pose.facing}`]
          if (sprite) {
            const drawX = Math.round(pose.x - CHARACTER_WIDTH / 2)
            const drawY = Math.round(pose.y - CHARACTER_HEIGHT + 8)

            // Draw subtle drop shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
            ctx.beginPath()
            ctx.ellipse(pose.x, pose.y - 2, 14, 6, 0, 0, Math.PI * 2)
            ctx.fill()

            // Paint character sprite
            paintSpriteToContext(sprite, ctx, drawX, drawY)

            // Render name tag & status dot
            ctx.font = 'bold 11px system-ui, sans-serif'
            const textWidth = ctx.measureText(input.name).width
            const tagX = Math.round(pose.x - textWidth / 2 - 8)
            const tagY = drawY - 8

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
            ctx.beginPath()
            ctx.roundRect(tagX, tagY - 12, textWidth + 16, 16, 4)
            ctx.fill()

            // Status indicator dot
            ctx.fillStyle = STATUS_COLOR[input.status] || '#64748b'
            ctx.beginPath()
            ctx.arc(tagX + 6, tagY - 4, 3, 0, Math.PI * 2)
            ctx.fill()

            ctx.fillStyle = '#f8fafc'
            ctx.fillText(input.name, tagX + 13, tagY - 1)

            // Render Speech / Thought Bubble if present
            const workerInfo = snapshot.office.workers.find(w => w.id === input.id)
            const bubbleText = workerInfo?.bubble || (input.id === 'lead' ? snapshot.office.orchestrator.bubble : null)

            if (bubbleText && bubbleText.length > 0) {
              const displayBubble = bubbleText.length > 40 ? `${bubbleText.slice(0, 37)}...` : bubbleText
              ctx.font = '10.5px system-ui, sans-serif'
              const bubbleWidth = ctx.measureText(displayBubble).width + 16
              const bubbleX = Math.round(pose.x - bubbleWidth / 2)
              const bubbleY = tagY - 24

              ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
              ctx.strokeStyle = '#3b82f6'
              ctx.lineWidth = 1.5
              ctx.beginPath()
              ctx.roundRect(bubbleX, bubbleY - 14, bubbleWidth, 20, 6)
              ctx.fill()
              ctx.stroke()

              // Bubble tail
              ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
              ctx.beginPath()
              ctx.moveTo(pose.x - 4, bubbleY + 6)
              ctx.lineTo(pose.x + 4, bubbleY + 6)
              ctx.lineTo(pose.x, bubbleY + 11)
              ctx.closePath()
              ctx.fill()

              ctx.fillStyle = '#0f172a'
              ctx.fillText(displayBubble, bubbleX + 8, bubbleY)
            }
          }
        }
      }

      ctx.restore()
      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [agentInputs, getCharacterFrames, map, snapshot])

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        canvasRef.current.width = rect.width
        canvasRef.current.height = rect.height
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Mouse / Touch Event Handlers for Panning and Clicking
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    isDraggingRef.current = false
    // Check if click was on an agent
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const clickX = (e.clientX - rect.left - pan.x) / zoom
      const clickY = (e.clientY - rect.top - pan.y) / zoom

      for (const pose of posesRef.current) {
        const dist = Math.hypot(clickX - pose.x, clickY - pose.y)
        if (dist < 28) {
          setSelectedAgentId(pose.id)
          return
        }
      }
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    const newZoom = Math.max(0.35, Math.min(2.0, zoom * zoomFactor))
    setZoom(newZoom)
  }

  const handleResetCamera = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setZoom(0.75)
      setPan({
        x: rect.width / 2 - (28 * TILE) * 0.75,
        y: rect.height / 2 - (20 * TILE) * 0.75,
      })
    }
  }

  const selectedAgent = agentInputs.find(a => a.id === selectedAgentId)
  const selectedWorker = snapshot.office.workers.find(w => w.id === selectedAgentId)

  return (
    <div ref={containerRef} className={css.canvasContainer}>
      <canvas
        ref={canvasRef}
        className={css.canvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Top HUD Overlay */}
      <div className={css.hudOverlay}>
        <div className={css.hudLeft}>
          <span className={css.hudTitle}>2D Gather Office</span>
          <span className={css.hudBadge}>Live Simulation</span>
        </div>

        <div className={css.hudControls}>
          <button type="button" className={css.hudButton} onClick={() => setZoom(z => Math.min(2.0, z * 1.15))}>
            + Zoom
          </button>
          <button type="button" className={css.hudButton} onClick={() => setZoom(z => Math.max(0.35, z * 0.85))}>
            - Zoom
          </button>
          <button type="button" className={css.hudButton} onClick={handleResetCamera}>
            Reset View
          </button>
        </div>
      </div>

      {/* Selected Agent Inspection Card */}
      {selectedAgent && (
        <div className={css.agentInspectCard}>
          <div className={css.inspectHeader}>
            <span className={css.inspectName}>{selectedAgent.name}</span>
            <span
              className={css.inspectStatus}
              style={{
                backgroundColor: `${STATUS_COLOR[selectedAgent.status] || '#64748b'}20`,
                color: STATUS_COLOR[selectedAgent.status] || '#64748b',
              }}
            >
              {selectedAgent.status}
            </span>
          </div>
          <div className={css.inspectRole}>
            {selectedWorker?.role || (selectedAgent.id === 'lead' ? 'Lead Orchestrator' : 'Specialist Agent')}
          </div>
          {(selectedWorker?.bubble || (selectedAgent.id === 'lead' && snapshot.office.orchestrator.bubble)) && (
            <div className={css.inspectBubble}>
              "{selectedWorker?.bubble || snapshot.office.orchestrator.bubble}"
            </div>
          )}
          {selectedWorker?.currentTool && (
            <div className={css.inspectTool}>
              Active Tool: <code>{selectedWorker.currentTool}</code>
            </div>
          )}
          <button
            type="button"
            className={css.hudButton}
            style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
            onClick={() => setSelectedAgentId(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
