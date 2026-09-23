// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CitationPdfPanel } from '../src/client/details/CitationPdfPanel.tsx'

afterEach(cleanup)

function mockT(key: string, params?: Record<string, string>): string {
  if (key === 'pdf.title') return 'Source'
  if (key === 'pdf.close') return 'Close document'
  if (key === 'pdf.previous') return 'Previous page'
  if (key === 'pdf.next') return 'Next page'
  if (key === 'pdf.page') return `Page ${params?.page ?? ''}`
  if (key === 'pdf.unavailable') return 'Unable to open this document.'
  if (key === 'pdf.unavailableHint') return 'The citation names no viewable document link.'
  if (key === 'pdf.openOriginal') return 'Open original'
  if (key === 'pdf.download') return 'Download document'
  if (key === 'pdf.print') return 'Print document'
  return key
}

describe('CitationPdfPanel', () => {
  it('renders title, badge index, iframe, and close button', () => {
    const onClose = vi.fn()
    const citation = {
      index: 1,
      identifier: 'A',
      target: { href: 'https://example.com/manual.pdf', page: 3, title: 'manual.pdf' },
    }
    const view = render(
      <CitationPdfPanel citation={citation} onClose={onClose} t={mockT as never} />,
    )

    expect(view.container.querySelector('[title="manual.pdf"]')?.textContent).toBe('manual.pdf')
    expect(view.container.querySelector('span')?.textContent).toBe('[1]')

    const iframe = view.container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toBe('https://example.com/manual.pdf#page=3')

    const closeBtn = view.container.querySelector('button[aria-label="Close document"]')
    expect(closeBtn).not.toBeNull()
    fireEvent.click(closeBtn!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('navigates pages via stepping buttons', () => {
    const citation = {
      index: 1,
      identifier: 'A',
      target: { href: 'https://example.com/manual.pdf', page: 2, title: 'manual.pdf' },
    }
    const view = render(
      <CitationPdfPanel citation={citation} onClose={vi.fn()} t={mockT as never} />,
    )

    const prevBtn = view.container.querySelector('button[aria-label="Previous page"]')
    const nextBtn = view.container.querySelector('button[aria-label="Next page"]')
    expect(prevBtn).not.toBeNull()
    expect(nextBtn).not.toBeNull()

    // Next page -> page 3
    fireEvent.click(nextBtn!)
    let iframe = view.container.querySelector('iframe')
    expect(iframe?.getAttribute('src')).toBe('https://example.com/manual.pdf#page=3')

    // Previous page -> page 2
    fireEvent.click(prevBtn!)
    iframe = view.container.querySelector('iframe')
    expect(iframe?.getAttribute('src')).toBe('https://example.com/manual.pdf#page=2')
  })

  it('safely handles cross-origin print attempts', () => {
    const citation = {
      index: 1,
      identifier: 'A',
      target: { href: 'https://example.com/manual.pdf', page: 1 },
    }
    const view = render(
      <CitationPdfPanel citation={citation} onClose={vi.fn()} t={mockT as never} />,
    )

    const printBtn = view.container.querySelector('button[aria-label="Print document"]')
    expect(printBtn).not.toBeNull()

    // Should not throw when clicked
    expect(() => fireEvent.click(printBtn!)).not.toThrow()
  })

  it('renders unavailable state when citation has no viewable document link', () => {
    const citation = {
      index: 2,
      identifier: 'B',
      target: {},
    }
    const view = render(
      <CitationPdfPanel citation={citation} onClose={vi.fn()} t={mockT as never} />,
    )

    expect(view.container.querySelector('iframe')).toBeNull()
    expect(view.container.textContent).toContain('Unable to open this document.')
    expect(view.container.textContent).toContain('The citation names no viewable document link.')
  })
})
