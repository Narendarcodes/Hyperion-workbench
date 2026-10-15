import { describe, expect, it } from 'vitest'
import { replayBarStats } from '../src/client/pixel-office/lifecycle/LifecycleReplayBar.tsx'

describe('Mission replay bar counter agrees with the header pill', () => {
  it('live mode uses the session counts (no "0 done" while the header says Completed 2)', () => {
    const agents = [{ status: 'spawned' }, { status: 'working' }]
    expect(replayBarStats(agents, 'live', { total: 2, completed: 2, failed: 0 })).toBe('2 agents · 2 done')
  })
  it('replay mode reports the playhead state and labels it', () => {
    const agents = [{ status: 'done' }, { status: 'working' }, { status: 'error' }]
    expect(replayBarStats(agents, 'replay', { total: 3, completed: 3, failed: 0 })).toBe('3 agents · 1 done · 1 failed (at playhead)')
  })
  it('falls back to lifecycle counts when no session counts exist', () => {
    expect(replayBarStats([{ status: 'done' }], 'live')).toBe('1 agents · 1 done')
  })
})
