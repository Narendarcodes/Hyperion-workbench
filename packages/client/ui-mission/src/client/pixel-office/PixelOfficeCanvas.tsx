/**
 * Native Gather-style 2D pixel office canvas component for Hyperion Mission View.
 * Renders the full Hermes HQ pixel map, animated agents, speech bubbles,
 * furniture, and zones directly on an HTML5 2D canvas with 60fps performance
 * and a visual pacing engine for human-readable action durations.
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
const MIN_ACTION_LINGER_MS = 4000
const BUBBLE_LINGER_MS = 4500

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
  { id: 'lead', name: 'Orchestrator', role: 'Lead Architect', color: '#f59e0b' },
  { id: 'analyst', name: 'Analyst', role: 'Domain Specialist', color: '#3b82f6' },
  { id: 'engineer', name: 'Engineer', role: 'Implementation Specialist', color: '#10b981' },
  { id: 'verifier', name: 'Verifier', role: 'Safety & Verification', color: '#ec4899' },
]

interface AgentVisualMemory {
  latchedStatus: 'working' | 'idle' | 'error'
  latchedBubble: string | null
  latchedHold: PixelAgentInput['hold']
  latchedUntilMs: number
  bubbleUntilMs: number
}

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
  const visualMemoryRef = useRef<Map<string, AgentVisualMemory>>(new Map())

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

    const isOrchestratorActive = orchestrator.status !== 'idle' && orchestrator.status !== 'completed'
    const isOrchestratorCompleted = orchestrator.status === 'completed'
    const isOrchestratorBlocked = orchestrator.status === 'blocked' || orchestrator.status === 'failed'

    // Check roadmap phase states
    const isPlanning = snapshot.phases.plan.status === 'real' || orchestrator.status === 'planning' || orchestrator.status === 'listening'
    const isRetrieving = snapshot.phases.retrieve.status === 'real' || orchestrator.status === 'searching'
    const isExecuting = snapshot.phases.execute.status === 'real' || orchestrator.status === 'working' || orchestrator.status === 'executing' || orchestrator.status === 'delegating'
    const isVerifying = snapshot.phases.verify.status === 'real' || orchestrator.status === 'verifying' || snapshot.verification.some(v => v.status === 'pending')

    const orchestratorInput: PixelAgentInput = {
      id: 'lead',
      name: 'Orchestrator',
      status: isOrchestratorBlocked ? 'error' : isOrchestratorActive ? 'working' : 'idle',
      color: '#f59e0b',
      bubble: orchestrator.bubble || (isOrchestratorActive ? 'Coordinating mission…' : 'Ready for mission'),
      streaming: isOrchestratorActive,
      thinking: orchestrator.status === 'searching' || orchestrator.status === 'waiting',
      awaitingApproval: isVerifying,
      dancing: isOrchestratorCompleted,
      hold: isOrchestratorActive ? 'orchestrator' : null,
      standup: false,
      skill: null,
      plan: null,
    }

    if (workers.length === 0) {
      // Return full default squad (Orchestrator + Analyst + Engineer + Verifier)
      const squad = DEFAULT_AGENTS.map((item) => {
        if (item.id === 'lead') return orchestratorInput

        let status: 'working' | 'idle' | 'error' = 'idle'
        let hold: PixelAgentInput['hold'] = null
        let bubble: string | null = null

        if (item.id === 'analyst') {
          const active = isOrchestratorActive && (isPlanning || isRetrieving)
          status = active ? 'working' : 'idle'
          hold = isRetrieving ? 'library' : null
          bubble = active ? (isRetrieving ? 'Searching references…' : 'Analyzing requirements…') : null
        } else if (item.id === 'engineer') {
          const active = isOrchestratorActive && isExecuting
          status = active ? 'working' : 'idle'
          hold = active ? 'qa_lab' : null
          bubble = active ? (orchestrator.bubble || 'Executing task…') : null
        } else if (item.id === 'verifier') {
          const active = isOrchestratorActive && isVerifying
          status = active ? 'working' : 'idle'
          hold = isVerifying ? 'phone_booth' : null
          bubble = active ? 'Checking verification…' : null
        }

        return {
          id: item.id,
          name: item.name,
          status,
          color: item.color,
          bubble,
          streaming: status === 'working',
          thinking: orchestrator.status === 'searching' || orchestrator.status === 'waiting',
          awaitingApproval: isVerifying,
          dancing: isOrchestratorCompleted,
          hold,
          standup: false,
          skill: null,
          plan: null,
        }
      })
      return squad
    }

    // Workers spawned: Orchestrator + all specialist workers
    const workerColors = ['#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316']
    const workerInputs = workers.map((worker, idx) => {
      const isWorking = worker.status === 'working' || worker.status === 'executing'
      const isSearching = worker.status === 'searching'
      const isWaiting = worker.status === 'waiting'
      const isBlocked = worker.status === 'blocked' || worker.status === 'failed'
      const status: 'working' | 'idle' | 'error' = (isWorking || isSearching) ? 'working' : isBlocked ? 'error' : 'idle'
      let hold: PixelAgentInput['hold'] = null
      if (worker.currentTool === 'web_search') hold = 'library'
      else if (worker.currentTool === 'bash' || worker.currentTool === 'terminal') hold = 'qa_lab'
      else if (worker.currentTool === 'skill') hold = 'gym'
      else if (isWaiting) hold = 'phone_booth'

      const workerColor = workerColors[idx % workerColors.length] ?? '#3b82f6'

      return {
        id: worker.id,
        name: worker.label,
        status,
        color: workerColor,
        bubble: worker.bubble,
        streaming: isWorking,
        thinking: isSearching || isWaiting,
        awaitingApproval: isWaiting || snapshot.verification.some(v => v.status === 'pending'),
        dancing: isOrchestratorCompleted,
        hold,
        standup: false,
        skill: null,
        plan: null,
      }
    })

    return [orchestratorInput, ...workerInputs]
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

  // Animation Loop with Visual Pacing Engine
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

      // Visual Pacing Engine: update latched memories
      const pacedInputs: PixelAgentInput[] = agentInputs.map((input) => {
        let mem = visualMemoryRef.current.get(input.id)
        if (!mem) {
          mem = {
            latchedStatus: input.status,
            latchedBubble: input.bubble ?? null,
            latchedHold: input.hold,
            latchedUntilMs: input.status === 'working' ? now + MIN_ACTION_LINGER_MS : 0,
            bubbleUntilMs: input.bubble ? now + BUBBLE_LINGER_MS : 0,
          }
          visualMemoryRef.current.set(input.id, mem)
        }

        // Check for new activity trigger
        if (input.status === 'working' || input.status === 'error') {
          mem.latchedStatus = input.status
          mem.latchedUntilMs = now + MIN_ACTION_LINGER_MS
          if (input.hold) mem.latchedHold = input.hold
        }

        if (input.bubble && input.bubble.trim().length > 0 && input.bubble !== mem.latchedBubble) {
          mem.latchedBubble = input.bubble
          mem.bubbleUntilMs = now + BUBBLE_LINGER_MS
        }

        const isHoldingWork = now < mem.latchedUntilMs
        const effectiveStatus = isHoldingWork ? mem.latchedStatus : input.status
        const effectiveHold = isHoldingWork && mem.latchedHold ? mem.latchedHold : input.hold
        const effectiveBubble = now < mem.bubbleUntilMs ? mem.latchedBubble : (input.bubble ?? null)

        return {
          ...input,
          status: effectiveStatus,
          hold: effectiveHold,
          bubble: effectiveBubble,
          streaming: input.streaming || isHoldingWork,
        }
      })

      // Update simulation with paced inputs
      if (simRef.current) {
        posesRef.current = simRef.current.tick({
          inputs: pacedInputs,
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
        const input = pacedInputs.find(a => a.id === pose.id) ?? {
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

            ctx.fillStyle = input.id === 'lead' ? 'rgba(30, 27, 75, 0.92)' : 'rgba(15, 23, 42, 0.88)'
            ctx.beginPath()
            ctx.roundRect(tagX, tagY - 12, textWidth + 16, 16, 4)
            ctx.fill()

            // Status indicator dot
            ctx.fillStyle = STATUS_COLOR[input.status] || '#64748b'
            ctx.beginPath()
            ctx.arc(tagX + 6, tagY - 4, 3, 0, Math.PI * 2)
            ctx.fill()

            ctx.fillStyle = input.id === 'lead' ? '#fde047' : '#f8fafc'
            ctx.fillText(input.name, tagX + 13, tagY - 1)

            // Render Speech / Thought Bubble if present
            const bubbleText = input.bubble

            if (bubbleText && bubbleText.length > 0) {
              const displayBubble = bubbleText.length > 36 ? `${bubbleText.slice(0, 33)}...` : bubbleText
              ctx.font = 'bold 11px system-ui, -apple-system, sans-serif'
              const bubbleWidth = ctx.measureText(displayBubble).width + 18
              const bubbleX = Math.round(pose.x - bubbleWidth / 2)
              const bubbleY = tagY - 26

              // Bubble backdrop with slight shadow
              ctx.fillStyle = '#ffffff'
              ctx.beginPath()
              ctx.roundRect(bubbleX, bubbleY - 14, bubbleWidth, 22, 6)
              ctx.fill()

              ctx.strokeStyle = input.color || '#3b82f6'
              ctx.lineWidth = 1.5
              ctx.stroke()

              // Bubble tail
              ctx.fillStyle = '#ffffff'
              ctx.beginPath()
              ctx.moveTo(pose.x - 5, bubbleY + 8)
              ctx.lineTo(pose.x + 5, bubbleY + 8)
              ctx.lineTo(pose.x, bubbleY + 13)
              ctx.closePath()
              ctx.fill()

              ctx.fillStyle = '#0f172a'
              ctx.fillText(displayBubble, bubbleX + 9, bubbleY + 2)
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
  }, [agentInputs, getCharacterFrames, map])

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
