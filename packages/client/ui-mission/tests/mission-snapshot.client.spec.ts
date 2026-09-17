import { describe, expect, it } from 'vitest'
import { SessionSeq, type SessionEvent } from '@deepseek-ai/dsh-session/types'
import {
  buildMissionSnapshot,
} from '../src/client/mission-snapshot-builder.ts'
import { deriveVisualBehavior } from '../src/client/visual-behavior.ts'
import type { MissionWorker } from '../src/client/mission-contract.ts'

describe('mission-snapshot-builder', () => {
  it('folds an empty event stream into empty snapshot with future phases and unavailable egress', () => {
    const snapshot = buildMissionSnapshot([])
    expect(snapshot.phases.input.status).toBe('future')
    expect(snapshot.phases.deliver.status).toBe('future')
    expect(snapshot.sovereignty.egress).toBe('unavailable')
    expect(snapshot.office.orchestrator.status).toBe('idle')
    expect(snapshot.office.workers).toHaveLength(0)
  })

  it('folds a multi-step session event log into roadmap, workers, deliverables, and sovereignty', () => {
    const events: SessionEvent[] = [
      {
        type: 'user/message',
        seq: SessionSeq(1),
        time: 100,
        data: {
          content: [{ type: 'text', text: 'Build the mission view' }],
          source: { kind: 'user' },
        },
      } as unknown as SessionEvent,
      {
        type: 'request/header',
        seq: SessionSeq(2),
        time: 110,
        data: {
          header: {
            config: { provider: 'deepseek', model: 'deepseek-chat' },
          },
          reason: 'initial',
        },
      } as unknown as SessionEvent,
      {
        type: 'plan/mode',
        seq: SessionSeq(3),
        time: 120,
        data: { active: true },
      } as unknown as SessionEvent,
      {
        type: 'sandbox/mode',
        seq: SessionSeq(4),
        time: 130,
        data: { mode: 'workspace-write' },
      } as unknown as SessionEvent,
      {
        type: 'approval/policy',
        seq: SessionSeq(5),
        time: 140,
        data: { policy: 'on-demand' },
      } as unknown as SessionEvent,
      {
        type: 'subagent/descriptor',
        seq: SessionSeq(6),
        time: 150,
        data: {
          agentId: 'worker-doc',
          label: 'Doc Writer',
          persona: 'read_doc',
        },
      } as unknown as SessionEvent,
      {
        type: 'tool/call',
        seq: SessionSeq(7),
        time: 160,
        data: {
          turn: 1,
          step: 1,
          callId: 'call-1',
          name: 'read',
          arguments: JSON.stringify({ path: 'src/index.ts' }),
        },
      } as unknown as SessionEvent,
      {
        type: 'tool/result',
        seq: SessionSeq(8),
        time: 170,
        data: {
          turn: 1,
          step: 1,
          message: {
            content: [{ type: 'text', text: 'file content' }],
            source: { callId: 'call-1' },
          },
        },
      } as unknown as SessionEvent,
      {
        type: 'tool/call',
        seq: SessionSeq(9),
        time: 180,
        data: {
          turn: 1,
          step: 2,
          callId: 'call-2',
          name: 'write',
          arguments: JSON.stringify({ path: 'dist/output.js' }),
        },
      } as unknown as SessionEvent,
      {
        type: 'tool/result',
        seq: SessionSeq(10),
        time: 190,
        data: {
          turn: 1,
          step: 2,
          message: {
            content: [{ type: 'text', text: 'wrote file' }],
            source: { callId: 'call-2' },
          },
        },
      } as unknown as SessionEvent,
      {
        type: 'approval/asked',
        seq: SessionSeq(11),
        time: 200,
        data: {
          id: 'appr-1',
          toolName: 'bash',
        },
      } as unknown as SessionEvent,
      {
        type: 'turn/end',
        seq: SessionSeq(12),
        time: 210,
        data: {
          turn: 1,
          reason: { kind: 'completed' },
        },
      } as unknown as SessionEvent,
    ]

    const snapshot = buildMissionSnapshot(events)

    expect(snapshot.phases.input.status).toBe('real')
    expect(snapshot.phases.understand.status).toBe('real')
    expect(snapshot.phases.plan.status).toBe('real')
    expect(snapshot.phases.retrieve.status).toBe('real')
    expect(snapshot.phases.execute.status).toBe('real')
    expect(snapshot.phases.verify.status).toBe('real')
    expect(snapshot.phases.deliver.status).toBe('real')

    expect(snapshot.sovereignty).toEqual({
      sandboxMode: 'workspace-write',
      approvalPolicy: 'on-demand',
      provider: 'deepseek',
      model: 'deepseek-chat',
      egress: 'unavailable',
    })

    expect(snapshot.deliverables).toEqual([
      { path: 'dist/output.js', seq: 10 },
    ])

    expect(snapshot.verification).toEqual([
      { kind: 'approval', status: 'pending', seq: 11, title: 'bash' },
    ])

    expect(snapshot.office.workers).toHaveLength(1)
    expect(snapshot.office.workers[0]?.id).toBe('worker-doc')
    expect(snapshot.office.workers[0]?.status).toBe('completed')
  })

  it('guarantees purity: same event stream produces byte-identical snapshots and visual behaviors', () => {
    const events: SessionEvent[] = [
      {
        type: 'user/message',
        seq: SessionSeq(1),
        time: 10,
        data: { content: [{ type: 'text', text: 'Task' }], source: { kind: 'user' } },
      } as unknown as SessionEvent,
      {
        type: 'tool/call',
        seq: SessionSeq(2),
        time: 20,
        data: { turn: 1, step: 1, callId: 'c1', name: 'grep', arguments: '{}' },
      } as unknown as SessionEvent,
    ]

    const s1 = buildMissionSnapshot(events)
    const s2 = buildMissionSnapshot(events)
    expect(JSON.stringify(s1)).toBe(JSON.stringify(s2))

    const worker: MissionWorker = {
      id: 'w1',
      label: 'Worker 1',
      station: 'knowledge',
      status: 'searching',
      bubble: 'Searching…',
      evidenceSeqs: [2],
    }

    const v1 = deriveVisualBehavior(worker)
    const v2 = deriveVisualBehavior(worker)
    expect(v1).toEqual(v2)
  })

  it('deriveVisualBehavior obeys motion rules, glyph mappings, and bubble priorities', () => {
    const searchingWorker: MissionWorker = {
      id: 'w1',
      label: 'Searcher',
      station: 'knowledge',
      status: 'searching',
      bubble: 'Searching…',
      evidenceSeqs: [1],
    }
    const searchVisual = deriveVisualBehavior(searchingWorker)
    expect(searchVisual.glyph).toBe('loupe')
    expect(searchVisual.motion).toBe('seated')
    expect(searchVisual.bubblePriority).toBe(2)

    // Moving station triggers walk motion
    const movedVisual = deriveVisualBehavior(searchingWorker, 'code')
    expect(movedVisual.motion).toBe('walk')

    // Blocked worker has alert glyph and high priority
    const blockedWorker: MissionWorker = {
      id: 'w2',
      label: 'Coder',
      station: 'code',
      status: 'blocked',
      bubble: 'Blocked',
      evidenceSeqs: [2],
    }
    const blockedVisual = deriveVisualBehavior(blockedWorker)
    expect(blockedVisual.glyph).toBe('alert')
    expect(blockedVisual.bubblePriority).toBe(1)

    // Completed worker has check glyph
    const completedWorker: MissionWorker = {
      id: 'w3',
      label: 'Verifier',
      station: 'verification',
      status: 'completed',
      bubble: 'Ready',
      evidenceSeqs: [3],
    }
    const completedVisual = deriveVisualBehavior(completedWorker)
    expect(completedVisual.glyph).toBe('check')
    expect(completedVisual.bubblePriority).toBe(3)
  })
})
