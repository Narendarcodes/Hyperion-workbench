/**
 * Pure fold from normalized session events to the hyperion envelope.
 */

import { describe, expect, it } from 'vitest'
import { detectTaskType, foldHyperionEnvelope } from '../src/envelope.ts'
import type { HyperionSourceEvent } from '../src/shared.ts'

const event = (seq: number, type: string, extra: Partial<HyperionSourceEvent> = {}): HyperionSourceEvent => ({
  seq,
  type,
  ...extra,
})

describe('detectTaskType', () => {
  it('routes inspection, calculation, pid, and knowledge prompts', () => {
    expect(detectTaskType('review this inspection report scan')).toBe('inspection')
    expect(detectTaskType('run the engineering calculation')).toBe('calculation')
    expect(detectTaskType('check the P&ID drawing revision')).toBe('pid')
    expect(detectTaskType('which SOP section covers this?')).toBe('knowledge')
    expect(detectTaskType('hello there')).toBe('generic')
    expect(detectTaskType(null)).toBe('generic')
  })

  it('locks the first non-generic user task and ignores later ones', () => {
    const envelope = foldHyperionEnvelope([
      event(0, 'user/message', { text: 'inspect the pump report' }),
      event(1, 'user/message', { text: 'now calculate the load' }),
    ])
    expect(envelope.taskType).toBe('inspection')
    expect(envelope.zones.analysis).toBe('Document Analysis')
  })
})

describe('foldHyperionEnvelope', () => {
  it('starts empty and generic with zero stages', () => {
    const envelope = foldHyperionEnvelope([])
    expect(envelope.taskType).toBe('generic')
    expect(envelope.stage).toBe(0)
    expect(envelope.stageCount).toBe(0)
    expect(envelope.plan).toEqual([])
    expect(envelope.skill).toBeNull()
    expect(envelope.verification).toEqual([])
    expect(envelope.crew).toEqual({})
  })

  it('folds a todo list into plan lines with done/current/queued states', () => {
    const envelope = foldHyperionEnvelope([
      event(0, 'todo/write', {
        todos: [
          { content: 'Ingest report', status: 'completed' },
          { content: 'OCR + vision', status: 'in_progress' },
          { content: 'Ground in SOPs', status: 'pending' },
        ],
      }),
    ])
    expect(envelope.plan).toEqual([
      { label: 'Ingest report', state: 'done' },
      { label: 'OCR + vision', state: 'current' },
      { label: 'Ground in SOPs', state: 'queued' },
    ])
    expect(envelope.stage).toBe(2)
    expect(envelope.stageCount).toBe(3)
  })

  it('last todo/write wins and an all-done list sits on the final stage', () => {
    const envelope = foldHyperionEnvelope([
      event(0, 'todo/write', { todos: [{ content: 'a', status: 'pending' }] }),
      event(1, 'todo/write', {
        todos: [
          { content: 'a', status: 'completed' },
          { content: 'b', status: 'completed' },
        ],
      }),
    ])
    expect(envelope.plan.map(line => line.state)).toEqual(['done', 'done'])
    expect(envelope.stage).toBe(2)
  })

  it('picks the latest skill tool call', () => {
    const envelope = foldHyperionEnvelope([
      event(0, 'tool/call', { tool: 'skill', skill: 'ocr-vision' }),
      event(1, 'tool/call', { tool: 'bash' }),
      event(2, 'tool/call', { tool: 'skill', skill: 'sop-grounding' }),
    ])
    expect(envelope.skill).toBe('sop-grounding')
  })

  it('tracks pending approvals until decided', () => {
    const pending = foldHyperionEnvelope([
      event(0, 'approval/asked', { approvalId: 'a1', approvalTool: 'bash', approvalReason: 'needed' }),
    ])
    expect(pending.verification).toEqual([{ id: 'a1', tool: 'bash', reason: 'needed' }])
    const cleared = foldHyperionEnvelope([
      event(0, 'approval/asked', { approvalId: 'a1', approvalTool: 'bash' }),
      event(1, 'approval/decided', { approvalId: 'a1', approvalOutcome: 'allowed-once' }),
    ])
    expect(cleared.verification).toEqual([])
  })

  it('folds sovereignty policy events with honest defaults', () => {
    expect(foldHyperionEnvelope([]).sovereignty).toEqual({
      sandboxMode: 'standard',
      approvalPolicy: 'prompt',
    })
    const envelope = foldHyperionEnvelope([
      event(0, 'sandbox/mode', { sandboxMode: 'workspace-write' }),
      event(1, 'approval/policy', { approvalPolicy: 'never' }),
    ])
    expect(envelope.sovereignty).toEqual({
      sandboxMode: 'workspace-write',
      approvalPolicy: 'never',
    })
  })

  it('maps zones per task type', () => {
    const pid = foldHyperionEnvelope([event(0, 'user/message', { text: 'review P&ID' })])
    expect(pid.zones.analysis).toBe('P&ID Review')
    const calc = foldHyperionEnvelope([event(0, 'user/message', { text: 'calculate load' })])
    expect(calc.zones.analysis).toBe('Calculation Bench')
  })
})
