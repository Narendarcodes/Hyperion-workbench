// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { WorkbenchUtilityRow } from '../src/client/skeleton/WorkbenchUtilityRow.tsx'
import type { WorkbenchUtilityRowProps } from '../src/client/skeleton/WorkbenchUtilityRow.tsx'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

const t = makeTranslate(en) as WorkbenchUtilityRowProps['t']

describe('WorkbenchUtilityRow — single shared top-right control strip', () => {
  it('renders theme, notifications, profile and the local-state pill on one baseline', () => {
    const { container } = render(<WorkbenchUtilityRow state="available" t={t} />)

    expect(screen.getByRole('group', { name: 'Home controls' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Theme' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'User menu' })).toBeTruthy()
    expect(screen.getByText('N')).toBeTruthy()
    expect(screen.getByText('Local state available')).toBeTruthy()
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('reflects the unavailable state', () => {
    render(<WorkbenchUtilityRow state="unavailable" t={t} />)
    expect(screen.getByText('Local state unavailable')).toBeTruthy()
    expect(screen.queryByText('Local state available')).toBeNull()
  })

  it('toggles the dark-theme body attribute', () => {
    document.body.removeAttribute('data-ds-dark-theme')
    render(<WorkbenchUtilityRow state="available" t={t} />)

    fireEvent.click(screen.getByRole('button', { name: 'Theme' }))
    expect(document.body.hasAttribute('data-ds-dark-theme')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Theme' }))
    expect(document.body.hasAttribute('data-ds-dark-theme')).toBe(false)
  })
})
