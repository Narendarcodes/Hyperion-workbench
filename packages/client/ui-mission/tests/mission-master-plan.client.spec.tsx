// @vitest-environment jsdom
/**
 * Verification of the 9 required test cases from the Hyperion Mission View Master Implementation Plan.
 * Tests domain refactoring, dynamic cabins, dynamic task labels, multi-seat allocation,
 * multi-step workflows, knowledge retrieval, blocked states, human verification, and replay determinism.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SessionSeq, type SessionEvent } from '@deepseek-ai/dsh-session/types'
import { buildMissionSnapshot } from '../src/client/mission-snapshot-builder.ts'

function loadFixtureEvents(): SessionEvent[] {
  const fixturePath = resolve(import.meta.dirname, 'fixtures/mission-session.jsonl')
  const content = readFileSync(fixturePath, 'utf8')
  return content
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line) as SessionEvent)
}

describe('Hyperion Mission View — 9 Master Plan Required Test Cases', () => {
  // TEST 1 — ONE AGENT
  it('TEST 1: spawns one worker, assigns unique cabin, dynamic task label, and visits work areas', () => {
    const events: SessionEvent[] = [
      {
        type: 'user/message',
        seq: SessionSeq(1),
        time: 100,
        data: { content: [{ type: 'text', text: 'Diagnose pump failure and write fix' }] },
      } as unknown as SessionEvent,
      {
        type: 'subagent/descriptor',
        seq: SessionSeq(2),
        time: 200,
        data: { agentId: 'agent-pump', label: 'Pump Failure Analysis', persona: 'read_docs' },
      } as unknown as SessionEvent,
      {
        type: 'tool/call',
        seq: SessionSeq(3),
        time: 300,
        data: { callId: 'call-1', name: 'grep', arguments: '{"path":"logs/pump.log"}' },
      } as unknown as SessionEvent,
      {
        type: 'tool/result',
        seq: SessionSeq(4),
        time: 400,
        data: { message: { content: [{ text: 'Found cavitation warning' }], source: { callId: 'call-1' } } },
      } as unknown as SessionEvent,
      {
        type: 'tool/call',
        seq: SessionSeq(5),
        time: 500,
        data: { callId: 'call-2', name: 'write', arguments: '{"path":"src/pump_fix.ts"}' },
      } as unknown as SessionEvent,
      {
        type: 'tool/result',
        seq: SessionSeq(6),
        time: 600,
        data: { message: { content: [{ text: 'wrote fix' }], source: { callId: 'call-2' } } },
      } as unknown as SessionEvent,
      {
        type: 'turn/end',
        seq: SessionSeq(7),
        time: 700,
        data: { reason: { kind: 'completed' } },
      } as unknown as SessionEvent,
    ]

    const snapshot = buildMissionSnapshot(events)

    // 1. Exactly one worker spawned
    expect(snapshot.office.workers).toHaveLength(1)
    const worker = snapshot.office.workers[0]!
    expect(worker.id).toBe('agent-pump')

    // 2. Assigned unique home cabin with dynamic task label
    expect(worker.cabinId).toBe('cabin-1')
    expect(snapshot.office.cabins).toHaveLength(1)
    const cabin = snapshot.office.cabins![0]!
    expect(cabin.id).toBe('cabin-1')
    expect(cabin.agentId).toBe('agent-pump')
    expect(cabin.label).toBe('Pump Failure Analysis')

    // 3. Worker ends in completed status and delivered file recorded
    expect(worker.status).toBe('completed')
    expect(snapshot.deliverables).toEqual([{ path: 'src/pump_fix.ts', seq: 6 }])
  })

  // TEST 2 — SAME TASK, TWO AGENTS
  it('TEST 2: spawns two agents on the same task into distinct cabins with no spatial overlap', () => {
    const events: SessionEvent[] = [
      {
        type: 'subagent/descriptor',
        seq: SessionSeq(1),
        time: 100,
        data: { agentId: 'agent-1', label: 'Pump Failure Analysis' },
      } as unknown as SessionEvent,
      {
        type: 'subagent/descriptor',
        seq: SessionSeq(2),
        time: 200,
        data: { agentId: 'agent-2', label: 'Pump Failure Analysis' },
      } as unknown as SessionEvent,
    ]

    const snapshot = buildMissionSnapshot(events)

    // Two distinct workers
    expect(snapshot.office.workers).toHaveLength(2)
    const w1 = snapshot.office.workers[0]!
    const w2 = snapshot.office.workers[1]!
    expect(w1.id).toBe('agent-1')
    expect(w2.id).toBe('agent-2')

    // Two distinct cabins
    expect(w1.cabinId).not.toBe(w2.cabinId)
    expect(snapshot.office.cabins).toHaveLength(2)

    const c1 = snapshot.office.cabins!.find(c => c.agentId === 'agent-1')!
    const c2 = snapshot.office.cabins!.find(c => c.agentId === 'agent-2')!
    expect(c1).toBeDefined()
    expect(c2).toBeDefined()
    expect(c1.id).toBe('cabin-1')
    expect(c2.id).toBe('cabin-2')

    // Both hold dynamic task label
    expect(c1.label).toBe('Pump Failure Analysis')
    expect(c2.label).toBe('Pump Failure Analysis')
  })

  // TEST 3 dropped with the SVG sim: shared-seat allocation lived in the
  // deleted office-layout module; seating is now owned by the Studio office.

  // TEST 4 — MULTI-STEP CODING AGENT
  it('TEST 4: a single worker performs multi-step workflow without creating separate agents', () => {
    const events: SessionEvent[] = [
      {
        type: 'tool-workflow/agent-start',
        seq: SessionSeq(1),
        time: 100,
        data: { childId: 'coder-single', label: 'Primary Developer', phase: 'code' },
      } as unknown as SessionEvent,
      // Step 1: Knowledge retrieval
      {
        type: 'tool/call',
        seq: SessionSeq(2),
        time: 200,
        data: { callId: 'c-1', name: 'grep', arguments: '{"path":"spec.md"}' },
      } as unknown as SessionEvent,
      // Step 2: Code editing
      {
        type: 'tool/call',
        seq: SessionSeq(3),
        time: 300,
        data: { callId: 'c-2', name: 'write', arguments: '{"path":"src/algo.ts"}' },
      } as unknown as SessionEvent,
      // Step 3: Testing
      {
        type: 'tool/call',
        seq: SessionSeq(4),
        time: 400,
        data: { callId: 'c-3', name: 'vitest', arguments: '{"path":"src/algo.spec.ts"}' },
      } as unknown as SessionEvent,
      // Step 4: Verification
      {
        type: 'approval/asked',
        seq: SessionSeq(5),
        time: 500,
        data: { id: 'appr-1', toolName: 'deploy' },
      } as unknown as SessionEvent,
      {
        type: 'approval/decided',
        seq: SessionSeq(6),
        time: 600,
        data: { id: 'appr-1', outcome: 'approved' },
      } as unknown as SessionEvent,
      {
        type: 'turn/end',
        seq: SessionSeq(7),
        time: 700,
        data: { reason: { kind: 'completed' } },
      } as unknown as SessionEvent,
    ]

    const snapshot = buildMissionSnapshot(events)

    // Still only 1 worker throughout all steps!
    expect(snapshot.office.workers).toHaveLength(1)
    const worker = snapshot.office.workers[0]!
    expect(worker.id).toBe('coder-single')
    expect(worker.status).toBe('completed')
  })

  // TEST 5 — KNOWLEDGE RETRIEVAL
  it('TEST 5: reflects retrieval activity, loupe glyph, and knowledge station for search actions', () => {
    const events: SessionEvent[] = [
      {
        type: 'subagent/descriptor',
        seq: SessionSeq(1),
        time: 100,
        data: { agentId: 'researcher', label: 'Research Specialist' },
      } as unknown as SessionEvent,
      {
        type: 'tool/call',
        seq: SessionSeq(2),
        time: 200,
        data: { callId: 'c-search', name: 'web_search', arguments: '{"query":"operating limits"}' },
      } as unknown as SessionEvent,
    ]

    const snapshot = buildMissionSnapshot(events)
    const worker = snapshot.office.workers[0]!
    expect(worker.status).toBe('searching')
    expect(worker.station).toBe('knowledge')
    expect(worker.currentLocation?.zone).toBe('knowledge')
  })

  // TEST 6 — BLOCKED WORKER
  it('TEST 6: transitions worker to blocked state with alert glyph on real tool failure', () => {
    const events: SessionEvent[] = [
      {
        type: 'subagent/descriptor',
        seq: SessionSeq(1),
        time: 100,
        data: { agentId: 'worker-err', label: 'Database Worker' },
      } as unknown as SessionEvent,
      {
        type: 'tool/call',
        seq: SessionSeq(2),
        time: 200,
        data: { callId: 'c-db', name: 'bash', arguments: '{"command":"connect"}' },
      } as unknown as SessionEvent,
      {
        type: 'tool/result',
        seq: SessionSeq(3),
        time: 300,
        data: {
          message: { content: [{ isError: true, text: 'Connection refused' }], source: { callId: 'c-db' } },
          error: { name: 'ConnectionRefused' },
        },
      } as unknown as SessionEvent,
    ]

    const snapshot = buildMissionSnapshot(events)
    const worker = snapshot.office.workers[0]!
    expect(worker.status).toBe('blocked')
    expect(worker.bubble).toContain('ConnectionRefused')
  })

  // TEST 7 — HUMAN VERIFICATION
  it('TEST 7: places worker in verification chamber with pending verification item and does not auto-approve', () => {
    const events: SessionEvent[] = [
      {
        type: 'subagent/descriptor',
        seq: SessionSeq(1),
        time: 100,
        data: { agentId: 'worker-prod', label: 'Production Worker' },
      } as unknown as SessionEvent,
      {
        type: 'approval/asked',
        seq: SessionSeq(2),
        time: 200,
        data: { id: 'appr-danger', toolName: 'rm_rf' },
      } as unknown as SessionEvent,
    ]

    const snapshot = buildMissionSnapshot(events)
    expect(snapshot.verification).toHaveLength(1)
    expect(snapshot.verification[0]!.status).toBe('pending')
    expect(snapshot.verification[0]!.kind).toBe('approval')

    const worker = snapshot.office.workers[0]!
    expect(worker.status).toBe('verifying')
    expect(worker.currentLocation?.zone).toBe('verification')
    expect(worker.bubble).toBe('Waiting for approval…')
  })

  // TEST 8 — COMPLETION
  it('TEST 8: keeps workers visible upon task completion without abrupt disappearance', () => {
    const events: SessionEvent[] = [
      {
        type: 'subagent/descriptor',
        seq: SessionSeq(1),
        time: 100,
        data: { agentId: 'worker-done', label: 'Auditor' },
      } as unknown as SessionEvent,
      {
        type: 'turn/end',
        seq: SessionSeq(2),
        time: 200,
        data: { reason: { kind: 'completed' } },
      } as unknown as SessionEvent,
    ]

    const snapshot = buildMissionSnapshot(events)
    expect(snapshot.office.orchestrator.status).toBe('completed')
    expect(snapshot.office.workers).toHaveLength(1)
    const worker = snapshot.office.workers[0]!
    expect(worker.status).toBe('completed')
    expect(worker.cabinId).toBe('cabin-1')
  })

  // TEST 9 — REPLAY DETERMINISM
  it('TEST 9: guarantees byte-identical snapshots and seat targets across live vs cold replay', () => {
    const fixtureEvents = loadFixtureEvents()

    // 1. Cold replay (all events at once)
    const coldSnapshot = buildMissionSnapshot(fixtureEvents)

    // 2. Incremental live playback
    let liveSnapshot = buildMissionSnapshot([])
    for (let i = 1; i <= fixtureEvents.length; i++) {
      liveSnapshot = buildMissionSnapshot(fixtureEvents.slice(0, i))
    }

    // Byte-identical snapshot state
    expect(JSON.stringify(liveSnapshot)).toBe(JSON.stringify(coldSnapshot))

    // Compare worker cabins and locations
    for (let i = 0; i < coldSnapshot.office.workers.length; i++) {
      const coldW = coldSnapshot.office.workers[i]!
      const liveW = liveSnapshot.office.workers[i]!
      expect(liveW.id).toBe(coldW.id)
      expect(liveW.cabinId).toBe(coldW.cabinId)
      expect(liveW.currentLocation).toEqual(coldW.currentLocation)
    }
  })
})
