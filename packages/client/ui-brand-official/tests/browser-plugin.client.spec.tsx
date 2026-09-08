// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { apply, inject } from '../src/client/index.ts'
import { OfficialBrandMark, OfficialBrandName } from '../src/client/Brand.tsx'
import { apply as hostApply } from '../src/index.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

const HOLES = [
  'sidebar.brand.mark',
  'sidebar.brand.name',
] as const

const HERO_HOLE = 'conversation.hero.brand.mark'

async function bench(declare = true) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.provide('locale', { bind: () => (key: string) => key })
  const slots = ctx.get('slots') as SlotRegistry
  const declareHoles = () => slots.register({
    name: 'root',
    children: Object.fromEntries([...HOLES, HERO_HOLE].map(name => [name, { kind: 'single', scope: 'root' }])),
  } as never, () => null)
  const disposeHoles = declare ? declareHoles() : undefined
  return { ctx, slots, declareHoles, disposeHoles }
}

describe('official browser-brand plugin', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares the slot and locale services it uses', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('leaves every slot empty outside the official build profile', async () => {
    vi.stubEnv('DSH_CLIENT_BUILD_PROFILE', 'local')
    const subject = await bench()
    await subject.ctx.plugin({ inject: [...inject], apply }).await()
    for (const hole of HOLES) expect(subject.slots.entries(hole)).toHaveLength(0)
  })

  it('fills declarations before or after apply and removes every occupant on teardown', async () => {
    vi.stubEnv('DSH_CLIENT_BUILD_PROFILE', 'official')
    const before = await bench()
    const fiber = before.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(1)

    before.disposeHoles?.()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(0)
    before.declareHoles()
    await Promise.resolve()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(1)

    await fiber.dispose()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(0)

    const after = await bench(false)
    await after.ctx.plugin({ inject: [...inject], apply }).await()
    for (const hole of HOLES) expect(after.slots.entries(hole)).toHaveLength(0)
    after.declareHoles()
    await Promise.resolve()
    for (const hole of HOLES) expect(after.slots.entries(hole)).toHaveLength(1)
  })

  it('leaves the conversation hero on its declaring fallback even in official builds', async () => {
    vi.stubEnv('DSH_CLIENT_BUILD_PROFILE', 'official')
    const subject = await bench()
    await subject.ctx.plugin({ inject: [...inject], apply }).await()
    expect(subject.slots.entries(HERO_HOLE)).toHaveLength(0)
  })

  it('renders the Hyperion name and mark at both requested sizes', () => {
    const name = render(<OfficialBrandName name="HYPERION" />)
    expect(name.container.textContent).toBe('HYPERION')
    name.unmount()

    const mark = render(<OfficialBrandMark size={34} />)
    expect(mark.container.querySelector('img')?.getAttribute('src')).toBe('/hyperion.svg')
    mark.rerender(<OfficialBrandMark size={24} />)
    expect(mark.container.querySelector('img')?.getAttribute('src')).toBe('/hyperion.svg')
  })
})
