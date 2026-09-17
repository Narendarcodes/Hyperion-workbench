// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
import { UiConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { apply } from '../src/client/index.ts'
import { MissionView, type UseMission } from '../src/client/MissionView.tsx'
import { en, type MissionTranslate } from '../src/client/locales.ts'
import type { MissionSnapshot } from '../src/client/mission-contract.ts'
import css from '../src/client/MissionView.module.css'

const t: MissionTranslate = (key: string, params?: Record<string, unknown>) => {
  let str = (en as Record<string, string>)[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v))
    }
  }
  return str
}

const runtimes: SlotTestRuntime[] = []
afterEach(async () => {
  while (runtimes.length > 0) {
    await runtimes.pop()?.dispose()
  }
})

describe('MissionView and Plugin Registration', () => {
  it('registers mission view tab in conversation.view slot with order 5', async () => {
    const runtime = await SlotTestRuntime.create()
    runtimes.push(runtime)
    const ctx = runtime.ctx

    new UiConversation(ctx, runtime.sessions)

    await runtime.root.declare(
      { 'conversation.view': { kind: 'list', scope: 'session' } },
      () => null,
    )

    ctx.provide('locale', {
      register: () => () => {},
      bind: () => t,
    } as unknown as typeof ctx.locale)

    apply(ctx)

    const entries = runtime.slots.entries('conversation.view')
    const missionEntry = entries.find(e => e.options.id === 'mission')
    expect(missionEntry).toBeDefined()
    expect(missionEntry?.options.order).toBe(5)
    const labelVal = typeof missionEntry?.options.label === 'function'
      ? missionEntry.options.label()
      : missionEntry?.options.label
    expect(labelVal).toBe('Mission')
  })

  it('renders MissionView with header, office simulation, and bottom status counts', () => {
    const snapshot: MissionSnapshot = {
      phases: {
        input: { status: 'real', evidenceSeqs: [1] },
        understand: { status: 'real', evidenceSeqs: [2] },
        plan: { status: 'real', evidenceSeqs: [3] },
        retrieve: { status: 'real', evidenceSeqs: [4] },
        execute: { status: 'real', evidenceSeqs: [5] },
        verify: { status: 'real', evidenceSeqs: [6] },
        deliver: { status: 'real', evidenceSeqs: [7] },
      },
      office: {
        orchestrator: { status: 'delegating', bubble: 'Coordinating' },
        workers: [
          {
            id: 'w-doc',
            label: 'Doc Writer',
            station: 'documents',
            status: 'working',
            bubble: 'Reading spec…',
            evidenceSeqs: [4],
          },
          {
            id: 'w-code',
            label: 'Coder',
            station: 'code',
            status: 'blocked',
            bubble: 'Blocked — missing key',
            evidenceSeqs: [5],
          },
        ],
      },
      activity: [
        {
          id: 'act-1',
          seq: 1,
          time: 100,
          agentId: 'user',
          label: 'User Prompt',
          status: 'idle',
          detail: 'Start mission',
        },
      ],
      deliverables: [{ path: 'dist/bundle.js', seq: 7 }],
      verification: [{ kind: 'approval', status: 'pending', seq: 6, title: 'bash' }],
      sovereignty: {
        sandboxMode: 'workspace-write',
        approvalPolicy: 'prompt',
        provider: 'deepseek',
        model: 'deepseek-chat',
        egress: 'unavailable',
      },
    }

    const openView = vi.fn()
    const useMission: UseMission = function <S>(selector: (s: MissionSnapshot) => S): S {
      return selector(snapshot)
    }

    const props = {
      useMission,
      openView,
      viewRequest: null,
      completeViewRequest: vi.fn(),
      renderSlot: () => null,
      t,
    } as unknown as ComponentProps<typeof MissionView>

    const { container } = render(<MissionView {...props} />)

    expect(container.querySelector('[data-mission-view]')).not.toBeNull()
    expect(container.textContent).toContain('Start mission')
    expect(container.textContent).toContain('Sandboxworkspace-write')
    expect(container.textContent).toContain('Approvalprompt')
    expect(container.textContent).toContain('Telemetry unavailable')

    // Verification banner
    expect(container.textContent).toContain('Verification Required: bash')
    const verifBanner = container.querySelector(`.${css.verificationBanner}`)
    if (verifBanner) {
      fireEvent.click(verifBanner)
      expect(openView).toHaveBeenCalledWith('chat', 'approval')
    }

    // Status counts
    expect(container.textContent).toContain('Working 1')
    expect(container.textContent).toContain('Blocked 1')

    // Deliverables
    expect(container.textContent).toContain('dist/bundle.js')

    // Activity card (always visible in bottom strip)
    expect(container.textContent).toContain('Recent Activity')
    expect(container.textContent).toContain('User Prompt')
    expect(container.textContent).toContain('Start mission')
  })

  it('supplies reference-stable snapshot from missionSource when events do not change', async () => {
    const runtime = await SlotTestRuntime.create()
    runtimes.push(runtime)
    const ctx = runtime.ctx

    new UiConversation(ctx, runtime.sessions)
    ctx.provide('locale', { register: () => () => {}, bind: () => t } as unknown as typeof ctx.locale)

    let capturedResolver: ((binding: unknown) => { hooks: { mission: { getSnapshot: () => unknown } } }) | undefined
    const originalProvide = ctx.uiSession.provide.bind(ctx.uiSession)
    vi.spyOn(ctx.uiSession, 'provide').mockImplementation((desc: unknown) => {
      const typedDesc = desc as { resolve: (binding: unknown) => { hooks: { mission: { getSnapshot: () => unknown } } } }
      capturedResolver = typedDesc.resolve
      return originalProvide(desc as never)
    })

    apply(ctx)
    expect(capturedResolver).toBeDefined()

    const mockEventSource = {
      getSnapshot: vi.fn().mockReturnValue({
        entries: [{ type: 'event', event: { type: 'user/message', seq: 1, text: 'hi' } }],
        revision: 1,
      }),
      subscribe: vi.fn(),
    }
    const mockBinding = { eventSource: mockEventSource }

    const resolved = capturedResolver!(mockBinding)
    const source = resolved.hooks.mission

    const snap1 = source.getSnapshot()
    const snap2 = source.getSnapshot()

    // Crucial: getSnapshot MUST return reference-identical object when revision is unchanged
    // otherwise useSyncExternalStore loops indefinitely causing a blank crash screen.
    expect(snap1).toBe(snap2)
  })
})
