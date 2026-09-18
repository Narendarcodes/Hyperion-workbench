/**
 * Mission snapshot builder: folds durable session events and transient live chunks into immutable MissionSnapshots.
 * @module @deepseek-ai/dsh-client-ui-mission/client/mission-snapshot-builder
 */

import type {
  SessionEventLike,
  SessionEventLikeEntry,
} from '@deepseek-ai/dsh-api-session-controller/client'
import type {
  ConversationTimelineSnapshot,
  ConversationViewBuilder,
  ConversationViewDefinition,
  ConversationViewNode,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { Context } from '@deepseek-ai/cordis'
import type {
  MissionActivityEntry,
  MissionCabin,
  MissionDeliverable,
  MissionOfficeState,
  MissionSnapshot,
  MissionTask,
  MissionVerificationItem,
  MissionWorker,
} from './mission-contract.ts'
import { EMPTY_MISSION_SNAPSHOT } from './mission-contract.ts'
import type {
  MissionAgentStatus,
  MissionPhase,
  PhaseState,
} from './mission-vocabulary.ts'
import {
  bubbleText,
  classifyTool,
} from './mission-vocabulary.ts'

interface MutablePhases {
  input: { status: 'real' | 'derived' | 'future'; evidenceSeqs: number[] }
  understand: { status: 'real' | 'derived' | 'future'; evidenceSeqs: number[] }
  plan: { status: 'real' | 'derived' | 'future'; evidenceSeqs: number[] }
  retrieve: { status: 'real' | 'derived' | 'future'; evidenceSeqs: number[] }
  execute: { status: 'real' | 'derived' | 'future'; evidenceSeqs: number[] }
  verify: { status: 'real' | 'derived' | 'future'; evidenceSeqs: number[] }
  deliver: { status: 'real' | 'derived' | 'future'; evidenceSeqs: number[] }
}

/**
 * Extracts a target path from tool arguments JSON.
 *
 * @param argsRaw - The unparsed JSON string of arguments.
 * @returns The extracted path string, or undefined.
 */
function extractPathFromArgs(argsRaw: unknown): string | undefined {
  if (typeof argsRaw !== 'string' || argsRaw.trim().length === 0) return undefined
  try {
    const parsed = JSON.parse(argsRaw) as Record<string, unknown>
    if (typeof parsed.path === 'string' && parsed.path.trim().length > 0) return parsed.path
    if (typeof parsed.file === 'string' && parsed.file.trim().length > 0) return parsed.file
    if (typeof parsed.filename === 'string' && parsed.filename.trim().length > 0) return parsed.filename
    if (typeof parsed.target === 'string' && parsed.target.trim().length > 0) return parsed.target
  } catch {
    // Ignore JSON parse errors
  }
  return undefined
}

/**
 * Unwraps an event item from a SessionEventLikeEntry or bare SessionEventLike.
 * @returns The inner event object.
 */
function unwrapEvent(item: SessionEventLikeEntry | SessionEventLike): SessionEventLike {
  if ('type' in item && typeof item.type === 'string') {
    if (item.type === 'event' && 'event' in item) {
      return item.event
    }
    if (item.type === 'transient' && 'event' in item) {
      return item.event
    }
  }
  return item
}

/**
 * Pure function to build a complete MissionSnapshot from an array of session events.
 *
 * @param entries - Raw session events or event entries.
 * @returns An immutable, consistent MissionSnapshot.
 */
export function buildMissionSnapshot(
  entries: readonly (SessionEventLikeEntry | SessionEventLike)[],
): MissionSnapshot {
  const phases: MutablePhases = {
    input: { status: 'future', evidenceSeqs: [] },
    understand: { status: 'future', evidenceSeqs: [] },
    plan: { status: 'future', evidenceSeqs: [] },
    retrieve: { status: 'future', evidenceSeqs: [] },
    execute: { status: 'future', evidenceSeqs: [] },
    verify: { status: 'future', evidenceSeqs: [] },
    deliver: { status: 'future', evidenceSeqs: [] },
  }

  let orchestratorStatus: MissionAgentStatus = 'idle'
  let orchestratorBubble = 'Ready'
  const workersMap = new Map<string, MissionWorker>()
  const cabinsMap = new Map<string, MissionCabin>()
  const agentCabinMap = new Map<string, string>()
  const tasksMap = new Map<string, MissionTask>()
  let cabinCounter = 0
  const activity: MissionActivityEntry[] = []
  const deliverables: MissionDeliverable[] = []
  const verification: MissionVerificationItem[] = []
  const mutationCalls = new Map<string, string>()

  const ensureCabinForWorker = (
    workerId: string,
    initialLabel: string,
    status: MissionAgentStatus = 'working',
  ): string => {
    let cabinId = agentCabinMap.get(workerId)
    if (cabinId === undefined) {
      cabinCounter++
      cabinId = `cabin-${cabinCounter}`
      agentCabinMap.set(workerId, cabinId)
    }
    const existingCabin = cabinsMap.get(cabinId)
    const dynamicLabel = initialLabel && initialLabel.trim().length > 0
      ? initialLabel.trim()
      : existingCabin?.label ?? `Specialist 0${cabinCounter}`
    cabinsMap.set(cabinId, {
      id: cabinId,
      agentId: workerId,
      label: dynamicLabel,
      status,
      seatIndex: cabinCounter,
    })
    return cabinId
  }

  const updateWorkerCabin = (workerId: string, label?: string, status?: MissionAgentStatus) => {
    const cabinId = agentCabinMap.get(workerId)
    if (cabinId === undefined) return
    const existing = cabinsMap.get(cabinId)
    if (existing === undefined) return
    cabinsMap.set(cabinId, {
      ...existing,
      label: label && label.trim().length > 0 ? label.trim() : existing.label,
      status: status ?? existing.status,
    })
  }
  let sandboxMode = 'standard'
  let approvalPolicy = 'prompt'
  let provider: string | null = null
  let model: string | null = null

  let lastActiveWorkerId: string | undefined

  for (const item of entries) {
    const event = unwrapEvent(item)
    const seq = 'seq' in event ? Number(event.seq) : 0
    const time = 'time' in event && typeof event.time === 'number' ? event.time : 0
    const evType: string = event.type
    const rawData = 'data' in event ? (event.data as Record<string, unknown>) : {}

    switch (evType) {
      case 'user/message': {
        phases.input.status = 'real'
        phases.input.evidenceSeqs.push(seq)
        orchestratorStatus = 'listening'
        orchestratorBubble = 'Listening to instructions…'

        let textDetail = ''
        const content = rawData.content
        if (Array.isArray(content)) {
          for (const block of content) {
            if (typeof block === 'object' && block !== null && (block as { type?: string }).type === 'text') {
              const textVal = (block as { text?: unknown }).text
              if (typeof textVal === 'string') {
                textDetail = textVal.slice(0, 80)
                break
              }
            }
          }
        }
        activity.push({
          id: `act-${seq}`,
          seq,
          time,
          agentId: 'user',
          label: 'User Prompt',
          status: 'idle',
          detail: textDetail,
        })
        break
      }

      case 'request/header': {
        phases.understand.status = 'real'
        phases.understand.evidenceSeqs.push(seq)
        const header = rawData.header as { config?: { provider?: unknown; model?: unknown } } | undefined
        if (typeof header?.config?.provider === 'string') {
          provider = header.config.provider
        }
        if (typeof header?.config?.model === 'string') {
          model = header.config.model
        }
        break
      }

      case 'request/context': {
        phases.understand.status = 'real'
        phases.understand.evidenceSeqs.push(seq)
        if (typeof rawData.provider === 'string') provider = rawData.provider
        if (typeof rawData.model === 'string') model = rawData.model
        break
      }

      case 'plan/mode': {
        if (rawData.active === true) {
          phases.plan.status = 'real'
          phases.plan.evidenceSeqs.push(seq)
          orchestratorStatus = 'planning'
          orchestratorBubble = 'Structuring mission plan…'
        }
        break
      }

      case 'todo/write': {
        phases.plan.status = 'real'
        phases.plan.evidenceSeqs.push(seq)
        orchestratorStatus = 'planning'
        orchestratorBubble = 'Updating task plan…'
        break
      }

      case 'sandbox/mode': {
        if (typeof rawData.mode === 'string') sandboxMode = rawData.mode
        break
      }

      case 'approval/policy': {
        if (typeof rawData.policy === 'string') approvalPolicy = rawData.policy
        break
      }

      case 'approval/asked': {
        phases.verify.status = 'real'
        phases.verify.evidenceSeqs.push(seq)
        const toolName = typeof rawData.toolName === 'string' ? rawData.toolName : undefined
        verification.push({
          kind: 'approval',
          status: 'pending',
          seq,
          title: toolName,
        })
        orchestratorStatus = 'verifying'
        orchestratorBubble = 'Waiting for verification…'
        if (lastActiveWorkerId !== undefined) {
          const currentWorker = workersMap.get(lastActiveWorkerId)
          if (currentWorker !== undefined) {
            workersMap.set(lastActiveWorkerId, {
              ...currentWorker,
              status: 'verifying',
              currentLocation: { kind: 'shared', zone: 'verification' },
              bubble: 'Waiting for approval…',
              evidenceSeqs: [...currentWorker.evidenceSeqs, seq],
            })
            updateWorkerCabin(lastActiveWorkerId, undefined, 'verifying')
          }
        }
        break
      }

      case 'approval/decided': {
        phases.verify.status = 'real'
        phases.verify.evidenceSeqs.push(seq)
        verification.push({
          kind: 'approval',
          status: 'decided',
          seq,
        })
        if (lastActiveWorkerId !== undefined) {
          const currentWorker = workersMap.get(lastActiveWorkerId)
          if (currentWorker !== undefined) {
            workersMap.set(lastActiveWorkerId, {
              ...currentWorker,
              status: 'working',
              currentLocation: { kind: 'shared', zone: currentWorker.station },
              bubble: 'Verification granted',
              evidenceSeqs: [...currentWorker.evidenceSeqs, seq],
            })
            updateWorkerCabin(lastActiveWorkerId, undefined, 'working')
          }
        }
        break
      }

      case 'goal/change': {
        const goalData = rawData as { phase?: string; blockedReason?: { message?: string } }
        if (goalData.phase === 'blocked') {
          phases.verify.status = 'real'
          phases.verify.evidenceSeqs.push(seq)
          verification.push({
            kind: 'goal',
            status: 'pending',
            seq,
            title: goalData.blockedReason?.message,
          })
          orchestratorStatus = 'blocked'
          orchestratorBubble = bubbleText('blocked', undefined, goalData.blockedReason?.message)
        }
        break
      }

      case 'subagent/descriptor': {
        phases.execute.status = 'real'
        phases.execute.evidenceSeqs.push(seq)
        const subData = rawData as {
          agentId?: string
          label?: string
          persona?: string
        }
        const workerId = subData.agentId ?? `worker-${seq}`
        const label = subData.label ?? ''
        const cabinId = ensureCabinForWorker(workerId, label, 'working')
        const station = subData.persona ? classifyTool(subData.persona).station : 'code'
        workersMap.set(workerId, {
          id: workerId,
          role: label || 'Specialist',
          capabilities: ['read', 'retrieve', 'analyze', 'write', 'execute', 'test', 'verify'],
          cabinId,
          label,
          station,
          status: 'working',
          bubble: 'Starting subtask…',
          currentLocation: { kind: 'cabin', zone: cabinId, seatId: 'seat-1' },
          evidenceSeqs: [seq],
        })
        lastActiveWorkerId = workerId
        orchestratorStatus = 'delegating'
        orchestratorBubble = 'Coordinating subagent…'
        break
      }

      case 'tool-workflow/run-start': {
        phases.execute.status = 'real'
        phases.execute.evidenceSeqs.push(seq)
        orchestratorStatus = 'delegating'
        const runName = typeof rawData.name === 'string' ? rawData.name : 'workflow'
        orchestratorBubble = `Starting workflow ${runName}…`
        break
      }

      case 'tool-workflow/agent-start': {
        phases.execute.status = 'real'
        phases.execute.evidenceSeqs.push(seq)
        const wfAgentData = rawData as { childId?: unknown; seq?: unknown; label?: unknown; phase?: unknown }
        const childId = typeof wfAgentData.childId === 'string' || typeof wfAgentData.childId === 'number' ? String(wfAgentData.childId) : undefined
        const seqVal = typeof wfAgentData.seq === 'string' || typeof wfAgentData.seq === 'number' ? String(wfAgentData.seq) : undefined
        const workerId = childId ?? seqVal ?? String(seq)
        const label = typeof wfAgentData.label === 'string' ? wfAgentData.label : ''
        const cabinId = ensureCabinForWorker(workerId, label, 'working')
        const phaseStr = typeof wfAgentData.phase === 'string' ? wfAgentData.phase : undefined
        const station = phaseStr ? classifyTool(phaseStr).station : 'code'
        workersMap.set(workerId, {
          id: workerId,
          role: label || 'Workflow Specialist',
          capabilities: ['read', 'retrieve', 'analyze', 'write', 'execute', 'test', 'verify'],
          cabinId,
          label,
          station,
          status: 'working',
          bubble: 'Executing workflow step…',
          currentLocation: { kind: 'cabin', zone: cabinId, seatId: 'seat-1' },
          evidenceSeqs: [seq],
        })
        lastActiveWorkerId = workerId
        break
      }
      case 'tool-workflow/agent-end': {
        phases.execute.status = 'real'
        phases.execute.evidenceSeqs.push(seq)
        const wfEndData = rawData as { seq?: unknown; outcome?: unknown }
        const seqVal = typeof wfEndData.seq === 'string' || typeof wfEndData.seq === 'number' ? String(wfEndData.seq) : undefined
        const workerId = seqVal ?? String(seq)
        const existing = workersMap.get(workerId)
        if (existing !== undefined) {
          const nextStatus: MissionAgentStatus = wfEndData.outcome === 'completed' ? 'completed' : 'failed'
          workersMap.set(workerId, {
            ...existing,
            status: nextStatus,
            bubble: bubbleText(nextStatus, existing.label),
            currentLocation: { kind: 'cabin', zone: existing.cabinId ?? 'cabin-1', seatId: 'seat-1' },
            evidenceSeqs: [...existing.evidenceSeqs, seq],
          })
          updateWorkerCabin(workerId, undefined, nextStatus)
        }
        break
      }

      case 'tool-workflow/run-end': {
        phases.execute.status = 'real'
        phases.execute.evidenceSeqs.push(seq)
        orchestratorBubble = 'Workflow finished'
        break
      }

      case 'tool/call': {
        const toolCallData = rawData as { name?: unknown; callId?: unknown; arguments?: unknown }
        const toolName = typeof toolCallData.name === 'string' ? toolCallData.name : 'unknown'
        const classified = classifyTool(toolName)
        const callId = typeof toolCallData.callId === 'string' || typeof toolCallData.callId === 'number' ? String(toolCallData.callId) : ''
        const targetPath = extractPathFromArgs(toolCallData.arguments)

        if (classified.family === 'dispatch') {
          phases.execute.status = 'real'
          phases.execute.evidenceSeqs.push(seq)
          orchestratorStatus = 'delegating'
          orchestratorBubble = 'Planning next steps…'

          if (toolName === 'subagent' || toolName === 'subagent_fork') {
            const workerId = `sub-${callId}`
            const cabinId = ensureCabinForWorker(workerId, classified.tag, 'working')
            workersMap.set(workerId, {
              id: workerId,
              role: classified.tag,
              capabilities: ['read', 'retrieve', 'analyze', 'write', 'execute', 'test', 'verify'],
              cabinId,
              label: classified.tag,
              station: classified.station,
              status: 'working',
              bubble: 'Starting subagent…',
              currentLocation: { kind: 'cabin', zone: cabinId, seatId: 'seat-1' },
              evidenceSeqs: [seq],
            })
            lastActiveWorkerId = workerId
          }
        } else if (classified.family === 'documents' || classified.family === 'knowledge') {
          phases.retrieve.status = 'real'
          phases.retrieve.evidenceSeqs.push(seq)
        } else if (classified.family === 'code' || classified.family === 'analysis' || classified.family === 'testing' || classified.family === 'report') {
          phases.execute.status = 'real'
          phases.execute.evidenceSeqs.push(seq)
        } else if (classified.family === 'verification') {
          phases.verify.status = 'real'
          phases.verify.evidenceSeqs.push(seq)
          verification.push({
            kind: 'question',
            status: 'pending',
            seq,
            title: toolName,
          })
        }

        const nextStatus: MissionAgentStatus = classified.family === 'knowledge' ? 'searching' : 'working'
        const nextBubble = bubbleText(nextStatus, toolName, targetPath)

        if (lastActiveWorkerId !== undefined) {
          const currentWorker = workersMap.get(lastActiveWorkerId)
          if (currentWorker !== undefined) {
            workersMap.set(lastActiveWorkerId, {
              ...currentWorker,
              status: nextStatus,
              station: classified.station,
              currentLocation: { kind: 'shared', zone: classified.station },
              currentTool: toolName,
              currentActivity: {
                kind: classified.family,
                label: classified.tag,
                tool: toolName,
                file: targetPath,
                status: nextStatus,
                evidenceSeqs: [seq],
              },
              bubble: nextBubble,
              evidenceSeqs: [...currentWorker.evidenceSeqs, seq],
            })
            updateWorkerCabin(lastActiveWorkerId, undefined, nextStatus)
          }
        } else {
          orchestratorStatus = nextStatus
          orchestratorBubble = nextBubble
        }

        if (targetPath !== undefined && (toolName === 'write' || toolName === 'edit' || toolName === 'str_replace_editor')) {
          mutationCalls.set(callId, targetPath)
        }

        activity.push({
          id: `act-${seq}`,
          seq,
          time,
          agentId: lastActiveWorkerId ?? 'root',
          label: classified.tag,
          status: nextStatus,
          detail: targetPath ?? toolName,
        })
        break
      }

      case 'tool/result': {
        const toolResData = rawData as {
          message?: { content?: { isError?: boolean }[]; source?: { callId?: unknown } }
          error?: { name?: string }
        }
        const resultMsg = toolResData.message
        const callId = typeof resultMsg?.source?.callId === 'string' || typeof resultMsg?.source?.callId === 'number' ? String(resultMsg.source.callId) : ''
        const mutatedPath = mutationCalls.get(callId)
        const isError = resultMsg?.content?.[0]?.isError === true || toolResData.error !== undefined

        if (!isError && mutatedPath !== undefined) {
          phases.deliver.status = 'real'
          phases.deliver.evidenceSeqs.push(seq)
          deliverables.push({ path: mutatedPath, seq })

          if (lastActiveWorkerId !== undefined) {
            const currentWorker = workersMap.get(lastActiveWorkerId)
            if (currentWorker !== undefined) {
              workersMap.set(lastActiveWorkerId, {
                ...currentWorker,
                bubble: 'Result ready',
                currentLocation: { kind: 'orchestrator', zone: 'orchestrator' },
                evidenceSeqs: [...currentWorker.evidenceSeqs, seq],
              })
            }
          }
        }

        if (isError) {
          const errDetail = toolResData.error?.name ?? 'execution error'
          if (lastActiveWorkerId !== undefined) {
            const currentWorker = workersMap.get(lastActiveWorkerId)
            if (currentWorker !== undefined) {
              workersMap.set(lastActiveWorkerId, {
                ...currentWorker,
                status: 'blocked',
                bubble: bubbleText('blocked', undefined, errDetail),
                evidenceSeqs: [...currentWorker.evidenceSeqs, seq],
              })
              updateWorkerCabin(lastActiveWorkerId, undefined, 'blocked')
            }
          } else {
            orchestratorStatus = 'blocked'
            orchestratorBubble = bubbleText('blocked', undefined, errDetail)
          }
        }
        break
      }

      case 'assistant/live-chunk': {
        orchestratorStatus = 'thinking'
        orchestratorBubble = 'Analyzing context…'
        break
      }

      case 'turn/end': {
        const turnEndData = rawData as { reason?: { kind?: string } }
        const reasonKind = turnEndData.reason?.kind
        if (reasonKind === 'completed') {
          orchestratorStatus = 'completed'
          orchestratorBubble = 'Delivery ready'
          for (const [wId, w] of workersMap.entries()) {
            if (w.status === 'working' || w.status === 'searching' || w.status === 'executing' || w.status === 'verifying') {
              workersMap.set(wId, {
                ...w,
                status: 'completed',
                bubble: bubbleText('completed', w.label),
                currentLocation: { kind: 'cabin', zone: w.cabinId ?? 'cabin-1', seatId: 'seat-1' },
              })
              updateWorkerCabin(wId, undefined, 'completed')
            }
          }
        } else if (reasonKind === 'failed' || reasonKind === 'error') {
          orchestratorStatus = 'failed'
          orchestratorBubble = 'Execution failed'
          for (const [wId, w] of workersMap.entries()) {
            if (w.status === 'working' || w.status === 'searching' || w.status === 'executing' || w.status === 'verifying') {
              workersMap.set(wId, {
                ...w,
                status: 'failed',
                bubble: bubbleText('failed', w.label),
                currentLocation: { kind: 'cabin', zone: w.cabinId ?? 'cabin-1', seatId: 'seat-1' },
              })
              updateWorkerCabin(wId, undefined, 'failed')
            }
          }
        }
        break
      }
    }
  }

  // Derive phase status rules
  if (phases.input.status === 'real' && phases.understand.status !== 'real') {
    phases.understand = { status: 'derived', evidenceSeqs: [] }
  }
  if (phases.execute.status === 'real' && phases.plan.status !== 'real') {
    phases.plan = { status: 'derived', evidenceSeqs: [] }
  }
  if (deliverables.length > 0) {
    phases.deliver = { status: 'real', evidenceSeqs: deliverables.map(d => d.seq) }
  }

  const finalPhases: Record<MissionPhase, PhaseState> = {
    input: phases.input,
    understand: phases.understand,
    plan: phases.plan,
    retrieve: phases.retrieve,
    execute: phases.execute,
    verify: phases.verify,
    deliver: phases.deliver,
  }

  const office: MissionOfficeState = {
    orchestrator: {
      status: orchestratorStatus,
      bubble: orchestratorBubble,
    },
    workers: [...workersMap.values()],
    cabins: [...cabinsMap.values()],
    tasks: [...tasksMap.values()],
  }

  return {
    phases: finalPhases,
    office,
    activity,
    deliverables,
    verification,
    sovereignty: {
      sandboxMode,
      approvalPolicy,
      provider,
      model,
      egress: 'unavailable',
    },
  }
}

/** Node definition contribution for Conversation view registration. */
export interface MissionConversationViewNode extends ConversationViewNode {
  readonly target: 'mission'
  readonly anchorSeq: number
  readonly data: unknown
}

/** ConversationViewBuilder implementation for the Mission view target. */
export class MissionSnapshotBuilder implements ConversationViewBuilder<
  MissionConversationViewNode,
  MissionSnapshot
> {
  private currentSnapshot: MissionSnapshot = EMPTY_MISSION_SNAPSHOT
  readonly empty: MissionSnapshot = EMPTY_MISSION_SNAPSHOT

  replace(_input: {
    readonly nodes: readonly MissionConversationViewNode[]
    readonly timeline: ConversationTimelineSnapshot
  }): MissionSnapshot {
    return this.currentSnapshot
  }

  apply(_input: {
    readonly upserts: readonly MissionConversationViewNode[]
    readonly timeline: ConversationTimelineSnapshot
  }): MissionSnapshot {
    return this.currentSnapshot
  }

  /**
   * Updates and returns the latest snapshot from raw session events.
   *
   * @param entries - The session event entries.
   * @returns The newly computed MissionSnapshot.
   */
  updateFromEntries(entries: readonly (SessionEventLikeEntry | SessionEventLike)[]): MissionSnapshot {
    this.currentSnapshot = buildMissionSnapshot(entries)
    return this.currentSnapshot
  }
}

/** Mission view target definition. */
export const missionViewDefinition: ConversationViewDefinition<
  MissionConversationViewNode,
  MissionSnapshot
> = {
  target: 'mission',
  create: () => new MissionSnapshotBuilder(),
  isActive: (snapshot: MissionSnapshot) => snapshot.phases.input.status === 'real' || snapshot.office.workers.length > 0,
}

/**
 * Registers the Mission view target builder into the Conversation views registry.
 *
 * @param ctx - The Cordis plugin context.
 */
export function registerMissionConversationView(ctx: Context): void {
  ctx.uiConversation.views.register(missionViewDefinition)
}
