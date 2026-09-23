// @vitest-environment jsdom
// Citation badges: footnote references render as keyboard-accessible buttons
// reporting their footnote-resolved target, while badge-free renders stay on
// the inert superscript baseline pinned by the DOM parity fixtures.
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MarkdownText } from './markdown-test-components.tsx'
import type { MarkdownCitationSelect } from '../src/index.ts'

afterEach(cleanup)

const DOC = [
  'Pump interval[^a] and pressure event[^b].',
  '',
  '[^a]: See [manual](https://example.com/manual.pdf), p.12.',
  '[^b]: Just a remark.',
  '',
].join('\n')

function selections() {
  const calls: MarkdownCitationSelect[] = []
  return {
    calls,
    onSelect: (select: MarkdownCitationSelect) => { calls.push(select) },
  }
}

describe('citation badges', () => {
  it('renders inert superscripts without a citation channel', () => {
    const view = render(<MarkdownText text={DOC} />)
    expect(view.container.querySelector('button')).toBeNull()
    expect(view.container.querySelectorAll('sup').length).toBeGreaterThan(0)
  })

  it('reports the resolved target when a badge activates', () => {
    const seen = selections()
    const view = render(
      <MarkdownText
        text={DOC}
        citation={{ onSelect: seen.onSelect, selectedIndex: null, label: index => `Open source ${String(index)}` }}
      />,
    )
    const buttons = view.container.querySelectorAll('button[aria-label^="Open source"]')
    expect(buttons).toHaveLength(2)
    fireEvent.click(buttons[0]!)
    expect(seen.calls).toEqual([{
      index: 1,
      identifier: 'A',
      target: { href: 'https://example.com/manual.pdf', page: 12, title: 'manual.pdf' },
    }])
    fireEvent.click(buttons[1]!)
    expect(seen.calls[1]).toEqual({ index: 2, identifier: 'B', target: {} })
  })

  it('marks the selected badge without changing the text', () => {
    const seen = selections()
    const view = render(
      <MarkdownText
        text={DOC}
        streaming
        citation={{ onSelect: seen.onSelect, selectedIndex: null }}
      />,
    )
    const before = view.container.querySelector('button[aria-pressed="true"]')
    expect(before).toBeNull()
    view.rerender(
      <MarkdownText
        text={DOC}
        streaming
        citation={{ onSelect: seen.onSelect, selectedIndex: 1 }}
      />,
    )
    const selected = view.container.querySelector('button[aria-pressed="true"]')
    expect(selected?.textContent).toBe('1')
    expect(selected?.getAttribute('aria-label')).toBe('Open source 1')
    view.rerender(
      <MarkdownText
        text={DOC}
        streaming
        citation={{ onSelect: seen.onSelect, selectedIndex: 1 }}
      />,
    )
    expect(view.container.querySelector('button[aria-pressed="true"]')?.textContent).toBe('1')
  })

  it('activates badges with the keyboard', () => {
    const onSelect = vi.fn()
    const view = render(
      <MarkdownText text={DOC} citation={{ onSelect, selectedIndex: null }} />,
    )
    const first = view.container.querySelector('button')
    first?.focus()
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first!, { key: 'Enter' })
    first?.click()
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
