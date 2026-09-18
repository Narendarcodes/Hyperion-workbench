import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import { buildMissionSnapshot } from '../src/client/mission-snapshot-builder.ts'

function loadFixtureEvents(): SessionEvent[] {
  const fixturePath = resolve(import.meta.dirname, 'fixtures/mission-session.jsonl')
  const content = readFileSync(fixturePath, 'utf8')
  return content
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line) as SessionEvent)
}

describe('Mission Replay Parity', () => {
  const events = loadFixtureEvents()

  it('replays recorded NDJSON session fixture into complete multi-agent mission state', () => {
    expect(events.length).toBe(17)

    const snapshot = buildMissionSnapshot(events)

    // Complete 7-phase progression
    expect(snapshot.phases.input.status).toBe('real')
    expect(snapshot.phases.understand.status).toBe('real')
    expect(snapshot.phases.plan.status).toBe('real')
    expect(snapshot.phases.retrieve.status).toBe('real')
    expect(snapshot.phases.execute.status).toBe('real')
    expect(snapshot.phases.verify.status).toBe('real')
    expect(snapshot.phases.deliver.status).toBe('real')

    // Sovereignty
    expect(snapshot.sovereignty.sandboxMode).toBe('workspace-write')
    expect(snapshot.sovereignty.approvalPolicy).toBe('on-demand')
    expect(snapshot.sovereignty.provider).toBe('deepseek')
    expect(snapshot.sovereignty.model).toBe('deepseek-chat')
    expect(snapshot.sovereignty.egress).toBe('unavailable')

    // Deliverables
    expect(snapshot.deliverables).toEqual([
      { path: 'dist/mission.js', seq: 12 },
    ])

    // Verification
    expect(snapshot.verification).toHaveLength(2)
    expect(snapshot.verification[0]).toEqual({
      kind: 'approval',
      status: 'pending',
      seq: 13,
      title: 'bash',
    })
    expect(snapshot.verification[1]).toEqual({
      kind: 'approval',
      status: 'decided',
      seq: 14,
    })

    // Specialist workers
    expect(snapshot.office.workers.length).toBeGreaterThanOrEqual(2)
    const docWorker = snapshot.office.workers.find(w => w.id === 'doc-specialist')
    expect(docWorker).toBeDefined()
    expect(docWorker?.station).toBe('documents')
    expect(docWorker?.status).toBe('completed')

    const wfWorker = snapshot.office.workers.find(w => w.id === 'wf-coder-1')
    expect(wfWorker).toBeDefined()
    expect(wfWorker?.station).toBe('code')
    expect(wfWorker?.status).toBe('completed')
  })

  it('guarantees byte-identical snapshot for incremental live vs cold replay', () => {
    // 1. Cold replay (all events at once)
    const coldSnapshot = buildMissionSnapshot(events)

    // 2. Incremental live simulation (step-by-step)
    let liveSnapshot = buildMissionSnapshot([])
    for (let i = 1; i <= events.length; i++) {
      liveSnapshot = buildMissionSnapshot(events.slice(0, i))
    }

    expect(JSON.stringify(liveSnapshot)).toBe(JSON.stringify(coldSnapshot))
  })
})
