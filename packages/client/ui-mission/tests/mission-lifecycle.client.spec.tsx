// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, renderHook } from '@testing-library/react'
import type { AgentLifecycleEvent } from '../src/client/pixel-office/lifecycle/events.ts'
import { asLifecycleEvent, parseLifecycleJsonl } from '../src/client/pixel-office/lifecycle/events.ts'
import {
  EMPTY_LIFECYCLE,
  applyLifecycleEvent,
  agentHold,
  createLifecycleReplay,
  foldLifecycle,
  lifecycleToOffice,
  modelBadge,
  toolHold,
} from '../src/client/pixel-office/lifecycle/state.ts'
import { ROOT_AGENT_ID, lifecycleFromSession } from '../src/client/pixel-office/lifecycle/fromSession.ts'
import { LifecycleReplayBar, useLifecycleOffice } from '../src/client/pixel-office/lifecycle/LifecycleReplayBar.tsx'
import { buildMissionSnapshot } from '../src/client/mission-snapshot-builder.ts'
import { PixelOfficeCanvas } from '../src/client/pixel-office/PixelOfficeCanvas.tsx'
import { EMPTY_MISSION_SNAPSHOT } from '../src/client/mission-contract.ts'

const fixture = (name: string) => readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8')

const TREE: AgentLifecycleEvent[] = [
  { t: 0, kind: 'spawn', agentId: 'root', label: 'Planner', role: 'planner', depth: 0 },
  { t: 5, kind: 'model', agentId: 'root', provider: 'droplet', model: 'llm', source: 'role' },
  { t: 6, kind: 'handoff', agentId: 'root', to: 'a', mode: 'parallel' },
  { t: 6, kind: 'handoff', agentId: 'root', to: 'b', mode: 'parallel' },
  { t: 7, kind: 'spawn', agentId: 'a', parentId: 'root', label: 'Reader', role: 'vision', depth: 1 },
  { t: 7, kind: 'spawn', agentId: 'b', parentId: 'root', label: 'Calc', role: 'code', depth: 1 },
  { t: 8, kind: 'model', agentId: 'a', provider: 'droplet', model: 'llm', source: 'fallback' },
  { t: 8, kind: 'model', agentId: 'b', provider: 'ollama', model: 'qwen3.5:4b', source: 'explicit' },
  { t: 9, kind: 'handoff', agentId: 'b', to: 'c', mode: 'sequential' },
  { t: 10, kind: 'spawn', agentId: 'c', parentId: 'b', label: 'Leaf', role: 'fast', depth: 2 },
  { t: 11, kind: 'tool', agentId: 'c', tool: 'calc.sum', input: '1+2', output: '3' },
  { t: 20, kind: 'done', agentId: 'c', ok: true, tokens: 40, latencyMs: 9 },
  { t: 25, kind: 'error', agentId: 'a', message: 'provider 503' },
  { t: 30, kind: 'done', agentId: 'b', ok: true, tokens: 50 },
  { t: 40, kind: 'done', agentId: 'root', ok: false },
]

describe('lifecycle events', () => {
  it('validates each event kind and rejects malformed values', () => {
    for (const e of TREE) expect(asLifecycleEvent(e)).toBe(e)
    expect(asLifecycleEvent(null)).toBeNull()
    expect(asLifecycleEvent({ kind: 'spawn', t: 1, agentId: 'x' })).toBeNull()
    expect(asLifecycleEvent({ kind: 'nope', t: 1, agentId: 'x' })).toBeNull()
    expect(asLifecycleEvent({ kind: 'done', t: Number.NaN, agentId: 'x', ok: true })).toBeNull()
    expect(asLifecycleEvent({ kind: 'done', t: 1, agentId: '', ok: true })).toBeNull()
    expect(asLifecycleEvent({ kind: 'model', t: 1, agentId: 'x', provider: 'p' })).toBeNull()
    expect(asLifecycleEvent({ kind: 'tool', t: 1, agentId: 'x' })).toBeNull()
    expect(asLifecycleEvent({ kind: 'handoff', t: 1, agentId: 'x', to: 'y', mode: 'tree' })).toBeNull()
    expect(asLifecycleEvent({ kind: 'done', t: 1, agentId: 'x' })).toBeNull()
    expect(asLifecycleEvent({ kind: 'error', t: 1, agentId: 'x' })).toBeNull()
  })

  it('parses a JSONL recording, sorting by time and counting bad lines', () => {
    const text = [JSON.stringify(TREE[1]), '', 'not json', JSON.stringify({ kind: 'x' }), JSON.stringify(TREE[0])].join('\n')
    const { events, rejected } = parseLifecycleJsonl(text)
    expect(events.map(e => e.kind)).toEqual(['spawn', 'model'])
    expect(rejected).toBe(2)
  })

  it('filters a multi-scenario harness recording (real gpt-oss-120b run)', () => {
    const { events, rejected } = parseLifecycleJsonl(fixture('delegation-recording.jsonl'), 'tree-0')
    expect(rejected).toBe(0)
    const state = foldLifecycle(events)
    expect(state.agents).toHaveLength(7)
    expect(Math.max(...state.agents.map(a => a.depth))).toBe(2)
    expect(state.agents.every(a => a.status === 'done' && a.model === 'llm')).toBe(true)
    expect(state.edges).toHaveLength(6)
    expect(state.edges.every(e => e.endedAt !== null)).toBe(true)
  })
})

describe('lifecycle state', () => {
  it('folds spawn/model/tool/handoff/done/error into agents and edges', () => {
    const s = foldLifecycle(TREE)
    expect(s.applied).toBe(TREE.length)
    expect(s.t).toBe(40)
    const byId = Object.fromEntries(s.agents.map(a => [a.id, a]))
    expect(byId.root).toMatchObject({ status: 'error', model: 'llm', depth: 0 })
    expect(byId.a).toMatchObject({ status: 'error', error: 'provider 503', routeSource: 'fallback' })
    expect(byId.b).toMatchObject({ provider: 'ollama', model: 'qwen3.5:4b', status: 'done', tokens: 50 })
    expect(byId.c).toMatchObject({ lastTool: 'calc.sum', toolCount: 1, parentId: 'b', depth: 2, latencyMs: 9 })
    expect(s.edges.map(e => `${e.from}>${e.to}:${e.mode}`)).toEqual(['root>a:parallel', 'root>b:parallel', 'b>c:sequential'])
    expect(s.edges.every(e => e.endedAt !== null)).toBe(true)
  })

  it('tolerates events for unseen agents and spawns without handoffs', () => {
    let s = applyLifecycleEvent(EMPTY_LIFECYCLE, { t: 3, kind: 'tool', agentId: 'ghost', tool: 'bash' })
    expect(s.agents[0]).toMatchObject({ id: 'ghost', label: 'ghost', status: 'working' })
    s = applyLifecycleEvent(s, { t: 4, kind: 'spawn', agentId: 'kid', parentId: 'ghost', label: 'Kid', depth: 1 })
    s = applyLifecycleEvent(s, { t: 4, kind: 'handoff', agentId: 'ghost', to: 'kid', mode: 'parallel' })
    expect(s.edges).toEqual([{ from: 'ghost', to: 'kid', mode: 'sequential', startedAt: 4, endedAt: null }])
    expect(EMPTY_LIFECYCLE.agents).toHaveLength(0)
  })

  it('replays any offset and seeks across checkpoints', () => {
    const r = createLifecycleReplay(TREE)
    expect(r.duration).toBe(40)
    expect(r.stateAt(-1).agents).toHaveLength(0)
    expect(r.stateAt(7).agents.map(a => a.id)).toEqual(['root', 'a', 'b'])
    expect(r.stateAt(9).edges.filter(e => e.endedAt === null)).toHaveLength(3)
    expect(r.stateAt(1000)).toEqual(foldLifecycle(TREE))
    const long: AgentLifecycleEvent[] = Array.from({ length: 200 }, (_, i) => ({ t: i, kind: 'tool', agentId: 'x', tool: `t${i}` }))
    const lr = createLifecycleReplay(long)
    expect(lr.stateAfter(130).agents[0]?.toolCount).toBe(130)
    expect(lr.stateAfter(10_000).agents[0]?.toolCount).toBe(200)
    expect(lr.stateAfter(-5).applied).toBe(0)
    expect(createLifecycleReplay([]).duration).toBe(0)
  })
})

describe('office projection', () => {
  it('places delegators in the orchestrator zone and workers by tool or role', () => {
    const r = createLifecycleReplay(TREE)
    const mid = r.stateAt(11)
    const hold = (id: string) => agentHold(mid.agents.find(a => a.id === id)!, mid)
    expect(hold('root')).toBe('orchestrator')
    expect(hold('b')).toBe('orchestrator')
    expect(hold('c')).toBe('qa_lab')
    expect(hold('a')).toBe('phone_booth')
    expect(toolHold('web_search')).toBe('library')
    expect(toolHold('skill')).toBe('gym')
    expect(toolHold('git_commit')).toBe('github_desk')
    expect(toolHold('read_pdf')).toBe('phone_booth')
    const end = foldLifecycle(TREE)
    expect(agentHold(end.agents[0]!, end)).toBeNull()
  })

  it('renders model badges with fallback and foreign-provider markers', () => {
    const s = foldLifecycle(TREE)
    const badge = (id: string) => modelBadge(s.agents.find(a => a.id === id)!)
    expect(badge('root')).toBe('llm')
    expect(badge('a')).toBe('llm ↩')
    expect(badge('b')).toBe('ollama/qwen3.5:4b')
    expect(modelBadge({ ...s.agents[0]!, model: null })).toBeNull()
    expect(modelBadge({ ...s.agents[0]!, provider: null })).toBe('llm')
  })

  it('projects inputs, zone labels, bubbles and delegation lines', () => {
    const r = createLifecycleReplay(TREE)
    const view = lifecycleToOffice(r.stateAt(11), 'Review the P&ID drawing')
    const v = Object.fromEntries(view.agents.map(a => [a.input.id, a]))
    expect(v.root?.zoneLabel).toBe('Orchestrator')
    expect(v.a?.zoneLabel).toBe('P&ID Review')
    expect(v.c?.input.bubble).toBe('Using calc.sum…')
    expect(v.root?.input.bubble).toBe('Delegating…')
    expect(v.a?.input.bubble).toBe('Thinking on llm ↩…')
    expect(v.c?.input.color).toBe('#06b6d4')
    expect(view.lines.filter(l => l.active)).toHaveLength(3)
    const end = lifecycleToOffice(foldLifecycle(TREE))
    const e = Object.fromEntries(end.agents.map(a => [a.input.id, a]))
    expect(e.a?.input).toMatchObject({ status: 'error', bubble: 'Error: provider 503', hold: null })
    expect(e.c?.input).toMatchObject({ status: 'idle', bubble: 'Done', dancing: false })
    expect(e.root?.input.bubble).toBe('Error: check failed')
    const spawnedOnly = lifecycleToOffice(foldLifecycle([TREE[0]!]))
    expect(spawnedOnly.agents[0]?.input).toMatchObject({ bubble: 'Starting…', thinking: true, hold: 'orchestrator' })
    const allDone = lifecycleToOffice(foldLifecycle([TREE[0]!, { t: 1, kind: 'done', agentId: 'root', ok: true }]))
    expect(allDone.agents[0]?.input.dancing).toBe(true)
    const noRole = lifecycleToOffice(foldLifecycle([{ t: 0, kind: 'spawn', agentId: 'z', label: 'Z', depth: 0 }]))
    expect(noRole.agents[0]?.input.color).toBe('#64748b')
  })
})

describe('session → lifecycle', () => {
  it('derives root, workflow child, tools and turn end from the recorded mission session', () => {
    const entries = fixture('mission-session.jsonl').split('\n').filter(Boolean).map(l => JSON.parse(l) as unknown)
    const events = lifecycleFromSession(entries)
    const s = foldLifecycle(events)
    const root = s.agents.find(a => a.id === ROOT_AGENT_ID)
    expect(root).toMatchObject({ provider: 'deepseek', model: 'deepseek-chat', status: 'done', toolCount: 2 })
    expect(s.agents.find(a => a.id === 'wf-coder-1')).toMatchObject({ label: 'Workflow Coder', status: 'done', parentId: ROOT_AGENT_ID })
    expect(s.agents.find(a => a.id === 'doc-specialist')).toMatchObject({ label: 'Document Specialist', status: 'spawned' })
    expect(s.edges.map(e => e.to).sort()).toEqual(['doc-specialist', 'wf-coder-1'])
    // the snapshot builder carries the same stream for the live view
    expect(buildMissionSnapshot(entries as never).lifecycle).toEqual(events)
  })

  it('maps subagent tool calls to child spawn, model and settlement', () => {
    const ev = (seq: number, type: string, data: unknown) => ({ type: 'event', event: { type, seq, time: seq * 10, data } })
    const events = lifecycleFromSession([
      ev(1, 'request/context', { provider: 'droplet', model: 'llm' }),
      ev(2, 'request/context', { provider: 'droplet', model: 'llm' }),
      ev(3, 'tool/call', { name: 'subagent', callId: 'c1', arguments: JSON.stringify({ description: 'Read drawing', role: 'vision', provider: 'droplet', model: 'llm-vision' }) }),
      ev(4, 'tool/call', { name: 'subagent', callId: 'c2', arguments: { description: 'Calc' } }),
      ev(5, 'tool/call', { name: 'delegate', callId: 'c3', arguments: '{bad json' }),
      ev(6, 'tool/result', { message: { source: { callId: 'c1' } } }),
      ev(7, 'tool/result', { isError: true, message: { source: { callId: 'c2' } } }),
      ev(8, 'tool/result', { message: { source: { callId: 'unknown' } } }),
      ev(9, 'tool-workflow/agent-end', { seq: 99, outcome: 'completed' }),
      ev(10, 'tool-workflow/agent-start', { seq: 2, label: 'W' }),
      ev(11, 'tool-workflow/agent-end', { seq: 2, outcome: 'failed' }),
      ev(12, 'subagent/descriptor', { label: 'Pinned', agentProvider: 'ollama', agentModel: 'qwen3.5:4b' }),
      ev(13, 'turn/end', { reason: { kind: 'error', message: 'boom' } }),
      null,
      { nope: true },
    ])
    const s = foldLifecycle(events)
    const get = (id: string) => s.agents.find(a => a.id === id)
    expect(events.filter(e => e.kind === 'model' && e.agentId === ROOT_AGENT_ID)).toHaveLength(1)
    expect(get('sub-c1')).toMatchObject({ label: 'Read drawing', role: 'vision', model: 'llm-vision', status: 'done' })
    expect(get('sub-c2')).toMatchObject({ status: 'error' })
    expect(get('sub-c3')).toMatchObject({ label: 'Subagent' })
    expect(get('wf-2')).toMatchObject({ status: 'error', error: 'failed' })
    expect(get('child-12')).toMatchObject({ provider: 'ollama', model: 'qwen3.5:4b' })
    expect(get(ROOT_AGENT_ID)).toMatchObject({ status: 'error', error: 'boom' })
    const cancelled = foldLifecycle(lifecycleFromSession([{ type: 'turn/end', time: 1, data: { reason: { kind: 'cancelled' } } }]))
    expect(cancelled.agents[0]?.error).toBe('cancelled')
    const noReason = foldLifecycle(lifecycleFromSession([{ type: 'turn/end', seq: 1, data: {} }]))
    expect(noReason.agents[0]?.error).toBe('turn failed')
  })
})

describe('replay UI', () => {
  it('drives live and replay modes over session events', () => {
    const { result } = renderHook(() => useLifecycleOffice(TREE, null))
    expect(result.current.mode).toBe('live')
    expect(result.current.view?.agents).toHaveLength(4)
    act(() => { result.current.setMode('replay') })
    expect(result.current.offset).toBe(0)
    expect(result.current.view?.agents).toHaveLength(1)
    act(() => { result.current.setOffset(9) })
    expect(result.current.view?.lines.filter(l => l.active)).toHaveLength(3)
    act(() => { result.current.setMode('live') })
    expect(result.current.view?.agents).toHaveLength(4)
  })

  it('loads a recording, picks a scenario, plays to the end and returns to live', async () => {
    const { result } = renderHook(() => useLifecycleOffice(undefined, null))
    expect(result.current.view).toBeUndefined()
    act(() => { result.current.loadRecording(fixture('delegation-recording.jsonl')) })
    expect(result.current.source).toBe('recording')
    expect(result.current.scenarios).toEqual(['seq-0', 'par-0', 'tree-0'])
    expect(result.current.scenario).toBe('seq-0')
    act(() => { result.current.setScenario('tree-0') })
    act(() => { result.current.setSpeed(8) })
    act(() => { result.current.setOffset(result.current.duration) })
    expect(result.current.view?.agents).toHaveLength(7)
    act(() => { result.current.clearRecording() })
    expect(result.current.source).toBe('session')
    expect(result.current.view).toBeUndefined()
  })

  it('advances playback on a timer and stops at the end', async () => {
    const { result } = renderHook(() => useLifecycleOffice(TREE, null))
    act(() => { result.current.setMode('replay') })
    act(() => { result.current.setSpeed(8) })
    act(() => { result.current.setPlaying(true) })
    await act(() => new Promise(r => setTimeout(r, 250)))
    expect(result.current.offset).toBe(40)
    expect(result.current.playing).toBe(false)
  })

  it('renders the control bar and the canvas in lifecycle mode', () => {
    function Harness() {
      const c = useLifecycleOffice(TREE, null)
      return (
        <>
          <PixelOfficeCanvas snapshot={EMPTY_MISSION_SNAPSHOT} lifecycle={c.view} />
          <LifecycleReplayBar controller={c} />
        </>
      )
    }
    const ui = render(<Harness />)
    expect(ui.getByTestId('lifecycle-replay-bar').textContent).toContain('4 agents · 2 done · 2 failed')
    fireEvent.click(ui.getByText('● Live'))
    expect(ui.getByLabelText('Replay position')).toBeDefined()
    fireEvent.change(ui.getByLabelText('Replay position'), { target: { value: '9' } })
    fireEvent.change(ui.getByLabelText('Speed'), { target: { value: '4' } })
    fireEvent.click(ui.getByLabelText('Play'))
    expect(ui.getByLabelText('Pause')).toBeDefined()
    fireEvent.click(ui.getByText('Reader'))
    expect(ui.getByTestId('inspect-model').textContent).toContain('llm ↩')
    expect(ui.getByTestId('inspect-zone').textContent).toContain('Evidence Call')
  })
})
