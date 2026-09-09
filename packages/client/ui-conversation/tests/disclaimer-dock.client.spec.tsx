// @vitest-environment jsdom
/**
 * Composer disclaimer acceptance: one ambient caption under the composer card
 * with the exact verify copy, registered on the composer dock after stats.
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/en.ts'
import type { DisclaimerDockProps } from '../src/client/skeleton/DisclaimerDock.tsx'
import { DisclaimerDock, disclaimerDockEntry } from '../src/client/skeleton/DisclaimerDock.tsx'
import { en, NS } from '../src/client/locales.ts'

const t: DisclaimerDockProps['t'] = makeTranslate(en, commonEn)

afterEach(cleanup)

describe('DisclaimerDock', () => {
  it('renders the verify copy as one ambient caption', () => {
    const view = render(<DisclaimerDock {...({ t } as unknown as DisclaimerDockProps)} />)
    expect(view.getByText('Responses can be wrong. Double-check important answers.')).toBeTruthy()
  })
  it('registers on the composer dock after the stats entry', () => {
    expect(disclaimerDockEntry.name).toBe('conversation-disclaimer-dock')
    expect(disclaimerDockEntry.inject).toEqual(['slots'])
    const register = vi.fn(() => () => undefined)
    const inject = vi.fn((_name: string, callback: () => () => void) => callback())
    disclaimerDockEntry.apply({ slots: { inject, register } } as never)
    expect(inject).toHaveBeenCalledWith('conversation.composer.dock', expect.any(Function))
    expect(register).toHaveBeenCalledWith(
      { name: 'conversation.composer.dock', id: 'disclaimer', order: 10, locale: NS },
      DisclaimerDock,
    )
  })
})
