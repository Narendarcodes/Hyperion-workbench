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
import { en, NS } from './locales.ts'
import {
  EMPTY_MISSION_SNAPSHOT,
  type MissionSnapshot,
} from './mission-contract.ts'
import {
  buildMissionSnapshot,
  registerMissionConversationView,
} from './mission-snapshot-builder.ts'
import { MissionView } from './MissionView.tsx'

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

/**
 * Client plugin body: registers the mission view tab into the conversation view slot ring.
 *
 * @param ctx - Root client cordis context.
 */
export function apply(ctx: Context): void {
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

  ctx.effect(() => ctx.locale.register(NS, { en }), 'ui-mission: dictionaries')
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
