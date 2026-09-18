/**
 * Browser mission plugin contributing the Mission View tab to the conversation view slot.
 * @module @deepseek-ai/dsh-client-ui-mission/client
 */

import type { Context } from '@deepseek-ai/cordis'
import type { SessionBinding } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
// Type-only merges
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import z from '@deepseek-ai/schemastery'
import { en, hi, te, NS } from './locales.ts'
import {
  EMPTY_MISSION_SNAPSHOT,
  type MissionSnapshot,
} from './mission-contract.ts'
import {
  buildMissionSnapshot,
  registerMissionConversationView,
} from './mission-snapshot-builder.ts'
import { MissionView } from './MissionView.tsx'
import { setStudioUrl } from './studio-url.ts'

export type { MissionKey } from './locales.ts'
export type {
  MissionDeliverable,
  MissionOfficeState,
  MissionSnapshot,
  MissionVerificationItem,
  MissionWorker,
} from './mission-contract.ts'
export type { UseMission } from './MissionView.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** Reserved slot for the central orchestrator orb asset. */
    'mission.orb': { kind: 'single'; scope: 'session' }
  }
}

/** Required services: the conversation slot, session controller, renderer, and locale service. */
export const inject = ['slots', 'sessions', 'uiSession', 'uiConversation', 'locale']

/** Plugin config, validated by the same-named schemastery schema. */
export interface Config {
  /** Studio base URL hosting the live 2D office embed. */
  studioUrl?: string
}

export const Config: z<Config> = z.object({
  studioUrl: z.string().min(1).default('http://localhost:3000'),
})

/**
 * Client plugin body: registers the mission view tab into the conversation view slot ring.
 *
 * @param ctx - Root client cordis context.
 * @param config - Validated plugin config carrying the Studio base URL.
 */
export function apply(ctx: Context, config: Config = {}): void {
  setStudioUrl(typeof config.studioUrl === 'string' ? config.studioUrl : 'http://localhost:3000')
  const missionSources = new WeakMap<SessionBinding, ObservableSnapshot<MissionSnapshot>>()
  const missionSource = (binding: SessionBinding): ObservableSnapshot<MissionSnapshot> => {
    let source = missionSources.get(binding)
    if (source === undefined) {
      const eventSource = binding.eventSource
      let lastRevision = -1
      let lastEntries: readonly unknown[] | undefined
      let cachedSnapshot: MissionSnapshot = EMPTY_MISSION_SNAPSHOT

      const getSnapshot = (): MissionSnapshot => {
        const window = eventSource.getSnapshot()
        if (window.revision !== lastRevision || window.entries !== lastEntries) {
          lastRevision = window.revision
          lastEntries = window.entries
          cachedSnapshot = window.entries.length > 0
            ? buildMissionSnapshot(window.entries)
            : EMPTY_MISSION_SNAPSHOT
        }
        return cachedSnapshot
      }

      source = {
        getSnapshot,
        subscribe: listener => eventSource.subscribe(listener),
      }
      missionSources.set(binding, source)
    }
    return source
  }

  ctx.effect(() => ctx.locale.register(NS, { en, hi, te }), 'ui-mission: dictionaries')
  const t = ctx.locale.bind(NS)

  registerMissionConversationView(ctx)

  ctx.uiSession.provide({
    hooks: ['mission'],
    resolve: binding => ({ hooks: { mission: missionSource(binding) } }),
  })

  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'mission',
    order: 5,
    locale: NS,
    label: () => t('view.mission'),
    children: {
      'mission.orb': { kind: 'single', scope: 'session' },
    },
  }, MissionView))
}
