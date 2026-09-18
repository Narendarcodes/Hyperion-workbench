/**
 * Pure fold from normalized session events to the hyperion envelope.
 * Mirrors the Studio demo-gateway shape so the office renders live runs
 * exactly like the scripted scenarios it replaces.
 * @module @deepseek-ai/dsh-host-hyperion-bridge/envelope
 */

import type { HyperionEnvelope, HyperionPlanLine, HyperionSourceEvent } from './shared.ts'

type TaskType = HyperionEnvelope['taskType']

const ZONES: Record<TaskType, HyperionEnvelope['zones']> = {
  // ponytail: one map per PRD use case; keep in sync with the Studio taskZones module.
  inspection: {
    analysis: 'Document Analysis',
    verification: 'Verification',
    review: 'Manager Review',
    deliverable: 'Approval Note',
  },
  calculation: {
    analysis: 'Calculation Bench',
    verification: 'Sandbox Test',
    review: 'Verification',
    deliverable: 'Working Result',
  },
  pid: {
    analysis: 'P&ID Review',
    verification: 'Cross-Reference',
    review: 'Verification',
    deliverable: 'Marked-up Drawing',
  },
  knowledge: {
    analysis: 'Knowledge Search',
    verification: 'Evidence Check',
    review: 'Verification',
    deliverable: 'Grounded Answer',
  },
  generic: {
    analysis: 'Document Analysis',
    verification: 'Verification',
    review: 'Review',
    deliverable: 'Deliverable',
  },
}

/** Keyword task-type detection over user prompt text (same rules as Studio). */
export function detectTaskType(text: string | null | undefined): TaskType {
  const value = (text ?? '').toLowerCase()
  if (/p[& ]?id|piping|instrumentation|drawing|pfd/.test(value)) return 'pid'
  if (/calculat|comput|sandbox|code|spreadsheet|xlsx/.test(value)) return 'calculation'
  if (/inspect|report|approval note|finding|ocr|scan/.test(value)) return 'inspection'
  if (/sop|manual|procedure|knowledge|which page|section/.test(value)) return 'knowledge'
  return 'generic'
}

/**
 * Fold normalized session events into the current hyperion envelope.
 * Last-write-wins per signal, exactly like the durable log projections.
 */
export function foldHyperionEnvelope(events: readonly HyperionSourceEvent[]): HyperionEnvelope {
  let taskType: TaskType = 'generic'
  let taskTypeLocked = false
  let todos: readonly { readonly content: string; readonly status: string }[] = []
  let skill: string | null = null
  const asked = new Map<string, { tool: string; reason?: string }>()
  const decided = new Set<string>()
  let sandboxMode = 'standard'
  let approvalPolicy = 'prompt'

  for (const event of events) {
    switch (event.type) {
      case 'user/message':
        if (!taskTypeLocked && event.text) {
          const detected = detectTaskType(event.text)
          if (detected !== 'generic') {
            taskType = detected
            taskTypeLocked = true
          }
        }
        break
      case 'todo/write':
        if (event.todos) todos = event.todos
        break
      case 'tool/call':
        if (event.skill) skill = event.skill
        break
      case 'approval/asked':
        if (event.approvalId) {
          asked.set(event.approvalId, {
            tool: event.approvalTool ?? 'operation',
            ...(event.approvalReason === undefined ? {} : { reason: event.approvalReason }),
          })
        }
        break
      case 'approval/decided':
        if (event.approvalId) decided.add(event.approvalId)
        break
      case 'sandbox/mode':
        if (event.sandboxMode) sandboxMode = event.sandboxMode
        break
      case 'approval/policy':
        if (event.approvalPolicy) approvalPolicy = event.approvalPolicy
        break
      default:
        break
    }
  }

  const plan: HyperionPlanLine[] = todos.map((todo, index) => ({
    label: todo.content,
    state: todo.status === 'completed'
      ? 'done'
      : todos.slice(0, index).every(item => item.status === 'completed')
        ? 'current'
        : 'queued',
  }))
  const doneCount = plan.filter(line => line.state === 'done').length
  const stage = plan.length === 0 ? 0 : Math.min(doneCount + 1, plan.length)

  const verification = [...asked.entries()]
    .filter(([id]) => !decided.has(id))
    .map(([id, ask]) => ({
      id,
      tool: ask.tool,
      ...(ask.reason === undefined ? {} : { reason: ask.reason }),
    }))

  return {
    taskType,
    zones: ZONES[taskType],
    stage,
    stageCount: plan.length,
    plan,
    skill,
    // ponytail: orchestrator-assigned crew names ride here once the
    // orchestrator publishes them; Studio falls back to gateway names.
    crew: {},
    verification,
    sovereignty: { sandboxMode, approvalPolicy },
  }
}
