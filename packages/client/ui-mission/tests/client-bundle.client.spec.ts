// @vitest-environment jsdom
/**
 * Real tsdown artifact shape for ui-mission: lib/client.js hands off through
 * window.__ModuleLoader__.load, resolves externals through the injected
 * require, returns the exports (apply + inject), and a mounted apply
 * registers the view tab into a real SlotRegistry ring. Skips when dist/ is
 * not built (`pnpm --filter @deepseek-ai/dsh-client-ui-mission bundle`).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { afterEach, describe, expect, it } from 'vitest'
import { UiConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import * as React from 'react'
import * as ReactJsx from 'react/jsx-runtime'
import * as ReactDom from 'react-dom'
import * as ClientStore from '@deepseek-ai/dsh-client-store'
import * as UiConversationClient from '@deepseek-ai/dsh-client-ui-conversation/client'
import * as UiPrimitives from '@deepseek-ai/dsh-client-ui-primitives'
import * as LocalePlugin from '@deepseek-ai/dsh-client-locale/client'

const PLUGIN_ID = '@deepseek-ai/dsh-client-ui-mission'

interface Handoff { id: string; factory: (require: (spec: string) => unknown) => Record<string, unknown> }
type Win = { __ModuleLoader__?: { load(h: Handoff): void } }

function readBundle(): string | undefined {
  try {
    return readFileSync(resolve('packages/client/ui-mission/lib/client.js'), 'utf8')
  } catch {
    return undefined
  }
}

afterEach(() => {
  delete (window as Win).__ModuleLoader__
  for (const el of document.querySelectorAll('style')) el.remove()
})

describe('tsdown client artifact for ui-mission', () => {
  const code = readBundle()

  async function loadArtifact() {
    let handoff: Handoff | undefined
    ;(window as Win).__ModuleLoader__ = { load: (h) => { handoff = h } }
    // oxlint-disable-next-line typescript/no-implied-eval, typescript/no-unsafe-call
    new Function(code!)()
    expect(handoff).toBeDefined()
    const modules = new Map<string, unknown>([
      ['react', React],
      ['react/jsx-runtime', ReactJsx],
      ['react-dom', ReactDom],
      ['@deepseek-ai/dsh-client-store', ClientStore],
      ['@deepseek-ai/dsh-client-ui-conversation/client', UiConversationClient],
      ['@deepseek-ai/dsh-client-ui-primitives', UiPrimitives],
    ])
    const exports = handoff!.factory((spec) => {
      if (!modules.has(spec)) throw new Error(`unexpected require: ${spec}`)
      return modules.get(spec)
    })
    return { handoff: handoff!, exports }
  }

  it.skipIf(code === undefined)('hands off with the manifest id and a DI-require factory', async () => {
    const { handoff, exports } = await loadArtifact()
    expect(handoff.id).toBe(PLUGIN_ID)
    expect(exports.apply).toBeTypeOf('function')
    expect(exports.inject).toEqual([
      'slots', 'sessions', 'uiSession', 'uiConversation', 'locale',
    ])
  })

  it.skipIf(code === undefined)('mounted as an object plugin, apply registers the view tab on the real ring', async () => {
    const { exports } = await loadArtifact()
    const ctx = new Context()
    const slots = new SlotRegistry(ctx)
    ctx.provide('uiSession', { provide: () => () => {} } as never)
    slots.register({
      name: 'root',
      children: { 'conversation.view': { kind: 'list', scope: 'session' } },
    }, (_p: { renderSlot?: unknown }) => null)
    const sessions = { binding: () => undefined }
    ctx.provide('sessions', sessions)
    const uiConversation = new UiConversation(ctx, sessions as never)
    const { views } = uiConversation
    ctx.provide('connection', { api: { settings: {} }, isLoopback: false } as never)
    ctx.provide('remote', { $on: () => () => {} } as never)
    ctx.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
    ctx.plugin({ inject: [...LocalePlugin.inject], apply: LocalePlugin.apply })
    const fiber = ctx.plugin(exports as { apply: (ctx: Context) => void })
    await fiber.await()
    expect(slots.entries('conversation.view').map(e => e.options.id)).toEqual(['mission'])
    expect(views.entries()).toHaveLength(1)
    await fiber.dispose()
    expect(slots.entries('conversation.view')).toHaveLength(0)
    expect(views.entries()).toEqual([])
  })

  it.skipIf(code === undefined)('injects plugin-tagged module CSS during factory execution', async () => {
    await loadArtifact()
    const tags = document.querySelectorAll(`style[data-plugin=${JSON.stringify(PLUGIN_ID)}]`)
    expect(tags.length).toBeGreaterThan(0)
  })
})
