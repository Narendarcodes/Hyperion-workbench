/**
 * Live / replay control for the lifecycle-driven pixel office.
 *
 * Live mode shows the current session's lifecycle as it grows. Replay mode
 * scrubs or plays back either the current session or a recorded JSONL file
 * (e.g. a delegation-harness recording), at 1×–8× speed.
 * @module @deepseek-ai/dsh-client-ui-mission/client/pixel-office/lifecycle/LifecycleReplayBar
 */

import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { AgentLifecycleEvent } from './events.ts'
import { parseLifecycleJsonl } from './events.ts'
import { createLifecycleReplay, foldLifecycle, lifecycleToOffice } from './state.ts'
import type { LifecycleOfficeView, LifecycleState } from './state.ts'
import css from './LifecycleReplayBar.module.css'

const SPEEDS = [1, 2, 4, 8] as const
const TICK_MS = 100
const NO_EVENTS: readonly AgentLifecycleEvent[] = []

/** State + controls for one office. */
export interface LifecycleOfficeController {
  readonly view: LifecycleOfficeView | undefined
  readonly state: LifecycleState | undefined
  readonly mode: 'live' | 'replay'
  readonly offset: number
  readonly duration: number
  readonly playing: boolean
  readonly speed: number
  readonly source: 'session' | 'recording'
  readonly scenarios: readonly string[]
  readonly scenario: string | undefined
  readonly rejected: number
  setMode(mode: 'live' | 'replay'): void
  setOffset(offset: number): void
  setPlaying(playing: boolean): void
  setSpeed(speed: number): void
  loadRecording(text: string): void
  setScenario(scenario: string): void
  clearRecording(): void
}

function scenarioIds(text: string): string[] {
  const ids = new Set<string>()
  for (const line of text.split('\n')) {
    const m = /"scenario"\s*:\s*"([^"]+)"/.exec(line)
    if (m?.[1] !== undefined) ids.add(m[1])
  }
  return [...ids]
}

/**
 * Hook: lifecycle office view with live/replay control.
 * @param liveEvents - lifecycle events of the current session.
 * @param taskText - mission text for zone naming.
 * @returns the controller.
 */
export function useLifecycleOffice(
  liveEvents: readonly AgentLifecycleEvent[] | undefined,
  taskText?: string | null,
): LifecycleOfficeController {
  const [mode, setMode] = useState<'live' | 'replay'>('live')
  const [offset, setOffset] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [recording, setRecording] = useState<string | undefined>(undefined)
  const [scenario, setScenario] = useState<string | undefined>(undefined)

  const scenarios = useMemo(() => (recording === undefined ? [] : scenarioIds(recording)), [recording])
  const parsed = useMemo(() => {
    if (recording === undefined) return undefined
    return parseLifecycleJsonl(recording, scenarios.length > 0 ? (scenario ?? scenarios[0]) : undefined)
  }, [recording, scenario, scenarios])
  const events = parsed?.events ?? liveEvents ?? NO_EVENTS
  const replay = useMemo(() => createLifecycleReplay(events), [events])
  const effectiveMode: 'live' | 'replay' = recording !== undefined ? 'replay' : mode

  useEffect(() => {
    if (!playing || effectiveMode !== 'replay') return
    const id = setInterval(() => {
      setOffset(o => Math.min(replay.duration, o + TICK_MS * speed))
    }, TICK_MS)
    return () => { clearInterval(id) }
  }, [playing, effectiveMode, speed, replay])

  useEffect(() => {
    if (playing && offset >= replay.duration) setPlaying(false)
  }, [playing, offset, replay])

  const state = useMemo(() => {
    if (events.length === 0) return undefined
    return effectiveMode === 'live' ? foldLifecycle(events) : replay.stateAt(offset)
  }, [events, effectiveMode, replay, offset])
  const view = useMemo(() => (state === undefined ? undefined : lifecycleToOffice(state, taskText)), [state, taskText])

  return {
    view,
    state,
    mode: effectiveMode,
    offset: Math.min(offset, replay.duration),
    duration: replay.duration,
    playing,
    speed,
    source: recording !== undefined ? 'recording' : 'session',
    scenarios,
    scenario: scenarios.length > 0 ? (scenario ?? scenarios[0]) : undefined,
    rejected: parsed?.rejected ?? 0,
    setMode(next) {
      setMode(next)
      setPlaying(false)
      if (next === 'replay') setOffset(0)
    },
    setOffset,
    setPlaying,
    setSpeed,
    loadRecording(text) {
      setRecording(text)
      setScenario(undefined)
      setOffset(0)
      setPlaying(true)
    },
    setScenario(next) {
      setScenario(next)
      setOffset(0)
    },
    clearRecording() {
      setRecording(undefined)
      setMode('live')
      setPlaying(false)
    },
  }
}

/** Control strip for {@link useLifecycleOffice}. */
export function LifecycleReplayBar({ controller }: { readonly controller: LifecycleOfficeController }) {
  const c = controller
  const onFile = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (file === undefined) return
    void file.text().then((text) => { c.loadRecording(text) })
  }
  const agents = c.state?.agents ?? []
  const done = agents.filter(a => a.status === 'done').length
  const failed = agents.filter(a => a.status === 'error').length
  return (
    <div className={css.bar} data-testid="lifecycle-replay-bar">
      {c.source === 'session' && (
        <button
          type="button"
          className={css.button}
          aria-pressed={c.mode === 'replay'}
          onClick={() => { c.setMode(c.mode === 'live' ? 'replay' : 'live') }}
        >
          {c.mode === 'live' ? '● Live' : '⟲ Replay'}
        </button>
      )}
      {c.mode === 'replay' && (
        <>
          <button type="button" className={css.button} onClick={() => { c.setPlaying(!c.playing) }} aria-label={c.playing ? 'Pause' : 'Play'}>
            {c.playing ? '❚❚' : '▶'}
          </button>
          <input
            className={css.slider}
            type="range"
            min={0}
            max={Math.max(1, Math.round(c.duration))}
            step={1}
            value={Math.round(c.offset)}
            aria-label="Replay position"
            onChange={(e) => { c.setOffset(Number(e.target.value)) }}
          />
          <span className={css.time}>{(c.offset / 1000).toFixed(1)}s / {(c.duration / 1000).toFixed(1)}s</span>
          <select className={css.select} aria-label="Speed" value={c.speed} onChange={(e) => { c.setSpeed(Number(e.target.value)) }}>
            {SPEEDS.map(s => <option key={s} value={s}>{s}×</option>)}
          </select>
        </>
      )}
      {c.scenarios.length > 1 && (
        <select className={css.select} aria-label="Scenario" value={c.scenario} onChange={(e) => { c.setScenario(e.target.value) }}>
          {c.scenarios.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      <span className={css.stats}>
        {agents.length} agents · {done} done{failed > 0 ? ` · ${failed} failed` : ''}
      </span>
      <label className={css.button}>
        Load recording
        <input type="file" accept=".jsonl,.json,application/x-ndjson" className={css.file} onChange={onFile} />
      </label>
      {c.source === 'recording' && (
        <button type="button" className={css.button} onClick={() => { c.clearRecording() }}>Back to live</button>
      )}
    </div>
  )
}
