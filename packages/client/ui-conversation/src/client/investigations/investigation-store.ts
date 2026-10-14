/**
 * Investigation store: the investigations the workbench lists, persisted in
 * localStorage. Records come from real asks (New Investigation) and from the
 * seeded samples, which carry `origin: 'sample'` and render labelled as such.
 * Status changes and assignment persist across reloads.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/investigation-store
 */

import { useSyncExternalStore } from 'react'
import { investigationsConfig } from './config.ts'
import { DEFAULT_INVESTIGATIONS_DATA } from './mockData.ts'
import type { InvestigationListItem, InvestigationSeverity, InvestigationStatus, InvestigationSummaryCounts } from './types.ts'

export interface StoredInvestigation {
  readonly code: string
  readonly tag: string
  readonly title: string
  readonly severity: InvestigationSeverity
  readonly status: InvestigationStatus
  readonly assignee: string
  readonly origin: 'ask' | 'sample'
  /** The ask that created it (real asks only). */
  readonly ask?: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly plantMetadata: string
  readonly equipmentType: InvestigationListItem['equipmentType']
}

export interface InvestigationStoreState {
  readonly investigations: readonly StoredInvestigation[]
  readonly selectedCode: string | null
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const TAG_PATTERN = /\b([A-Z]{1,4}-?\d{2,4}[A-Z]?)\b/

/** Seeded samples (labelled as samples in the UI). */
export function seedInvestigations(now = new Date()): StoredInvestigation[] {
  const iso = now.toISOString()
  return DEFAULT_INVESTIGATIONS_DATA.investigations.map(i => ({
    code: i.code,
    tag: i.tag,
    title: i.title,
    severity: i.severity,
    status: i.status,
    assignee: i.assignee.name,
    origin: 'sample' as const,
    createdAt: iso,
    updatedAt: iso,
    plantMetadata: i.plantMetadata,
    equipmentType: i.equipmentType,
  }))
}

export interface InvestigationStore {
  getState(): InvestigationStoreState
  subscribe(listener: () => void): () => void
  create(ask: string, now?: Date): StoredInvestigation
  setStatus(code: string, status: InvestigationStatus, now?: Date): void
  assign(code: string, assignee: string, now?: Date): void
  select(code: string | null): void
  find(code: string): StoredInvestigation | undefined
}

export function createInvestigationStore(storage: StorageLike | null = safeLocalStorage()): InvestigationStore {
  const key = investigationsConfig().storageKey
  let state: InvestigationStoreState = load()
  const listeners = new Set<() => void>()

  function load(): InvestigationStoreState {
    try {
      const raw = storage?.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as InvestigationStoreState
        if (Array.isArray(parsed.investigations)) return parsed
      }
    } catch {
      // corrupt store: fall back to the seed
    }
    return { investigations: seedInvestigations(), selectedCode: null }
  }
  function commit(next: InvestigationStoreState) {
    state = next
    try {
      storage?.setItem(key, JSON.stringify(next))
    } catch {
      // storage full / unavailable: keep in memory
    }
    for (const l of listeners) l()
  }
  const patch = (code: string, fn: (i: StoredInvestigation) => StoredInvestigation) => {
    commit({ ...state, investigations: state.investigations.map(i => (i.code === code ? fn(i) : i)) })
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    create(ask, now = new Date()) {
      const cfg = investigationsConfig()
      const text = ask.trim()
      const year = now.getUTCFullYear()
      const seq = state.investigations.filter(i => i.code.startsWith(`${cfg.codePrefix}-${String(year)}-`)).length + 1
      let code = `${cfg.codePrefix}-${String(year)}-${String(seq).padStart(3, '0')}`
      while (state.investigations.some(i => i.code === code)) code = `${code}a`
      const tag = TAG_PATTERN.exec(text)?.[1] ?? cfg.unassignedTag
      const iso = now.toISOString()
      const inv: StoredInvestigation = {
        code,
        tag,
        title: text === '' ? 'New investigation' : text,
        severity: 'medium',
        status: 'open',
        assignee: cfg.currentUserName,
        origin: 'ask',
        ask: text,
        createdAt: iso,
        updatedAt: iso,
        plantMetadata: 'MRPL',
        equipmentType: 'pump',
      }
      commit({ investigations: [inv, ...state.investigations], selectedCode: code })
      return inv
    },
    setStatus(code, status, now = new Date()) {
      patch(code, i => ({ ...i, status, updatedAt: now.toISOString() }))
    },
    assign(code, assignee, now = new Date()) {
      patch(code, i => ({ ...i, assignee, updatedAt: now.toISOString() }))
    },
    select(code) {
      commit({ ...state, selectedCode: code })
    },
    find: code => state.investigations.find(i => i.code === code),
  }
}

function safeLocalStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

let shared: InvestigationStore | null = null
/** The app-wide store (lazily created over localStorage). */
export function investigationStore(): InvestigationStore {
  shared ??= createInvestigationStore()
  return shared
}
/** Tests: drop the shared store so the next read reloads from storage. */
export function resetInvestigationStore(store: InvestigationStore | null = null): void {
  shared = store
}

export function useInvestigationStore(): InvestigationStoreState {
  const store = investigationStore()
  return useSyncExternalStore(store.subscribe, store.getState, store.getState)
}

const AVATAR_TONES: readonly InvestigationListItem['assignee']['color'][] = ['blue', 'orange', 'purple', 'green']

function timeAgo(iso: string, now: Date): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${String(mins)} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${String(hours)} h ago`
  return `${String(Math.round(hours / 24))} d ago`
}

/** Store record -> list row. Samples get the configured sample label in their metadata line. */
export function toListItem(inv: StoredInvestigation, now = new Date()): InvestigationListItem {
  const cfg = investigationsConfig()
  const tone = AVATAR_TONES[inv.assignee.length % AVATAR_TONES.length] ?? 'blue'
  return {
    id: inv.code,
    code: inv.code,
    tag: inv.tag,
    equipmentType: inv.equipmentType,
    severity: inv.severity,
    title: inv.title,
    plantMetadata: inv.origin === 'sample' ? `${cfg.sampleLabel} · ${inv.plantMetadata}` : inv.plantMetadata,
    updatedTimeAgo: timeAgo(inv.updatedAt, now),
    status: inv.status,
    statusLabel: cfg.statusLabels[inv.status],
    assignee: { initial: inv.assignee.charAt(0).toUpperCase() || '?', name: inv.assignee, color: tone },
  }
}

export function countByStatus(list: readonly StoredInvestigation[]): InvestigationSummaryCounts {
  const n = (s: InvestigationStatus) => list.filter(i => i.status === s).length
  return { open: n('open'), inProgress: n('in-progress'), resolved: n('resolved'), onHold: n('on-hold') }
}
