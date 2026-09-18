import { describe, expect, it } from 'vitest'
import type * as Md from 'mdast'
import {
  citationPdfSrc, citationTitle, isViewableCitationHref, parseCitationPage,
  resolveAttachmentHref, resolveFootnoteCitationTarget,
} from '../src/markdown/citation-target.ts'
import { collectReferenceTargets, createReferenceTargets } from '../src/markdown/render.tsx'
import { parseGfmWithMath } from '../src/markdown/parse.ts'

const text = (value: string): Md.Text => ({ type: 'text', value })

function footnote(children: (Md.BlockContent | Md.DefinitionContent)[]): Md.FootnoteDefinition {
  return { type: 'footnoteDefinition', identifier: 'a', label: 'a', children }
}

function paragraph(children: Md.PhrasingContent[]): Md.Paragraph {
  return { type: 'paragraph', children }
}

function link(url: string, label: string): Md.Link {
  return { type: 'link', url, title: null, children: [text(label)] }
}

describe('parseCitationPage', () => {
  it('prefers the URL fragment over prose hints', () => {
    expect(parseCitationPage('see p.3 https://example.com/m.pdf#page=9')).toBe(9)
  })

  it('reads prose page hints', () => {
    expect(parseCitationPage('inspected every 500 hours, p.12')).toBe(12)
    expect(parseCitationPage('inspected every 500 hours, p 12')).toBe(12)
    expect(parseCitationPage('see page 12 for details')).toBe(12)
    expect(parseCitationPage('See Page 7 for details')).toBe(7)
  })

  it('rejects missing and invalid pages', () => {
    expect(parseCitationPage('just a remark')).toBeUndefined()
    expect(parseCitationPage('inspected, p.0')).toBeUndefined()
    expect(parseCitationPage('see p.99999999999999999999')).toBeUndefined()
  })
})

describe('citationTitle', () => {
  it('derives display names from destinations', () => {
    expect(citationTitle('manual.pdf')).toBe('manual.pdf')
    expect(citationTitle('https://example.com/docs/manual.pdf')).toBe('manual.pdf')
    expect(citationTitle('https://example.com/docs/manual.pdf#page=2')).toBe('manual.pdf')
    expect(citationTitle('https://example.com/')).toBe('https://example.com/')
  })
})

describe('isViewableCitationHref', () => {
  it('accepts absolute HTTP(S), file, blob, and relative path destinations', () => {
    expect(isViewableCitationHref(undefined)).toBe(false)
    expect(isViewableCitationHref('http://example.com/m.pdf')).toBe(true)
    expect(isViewableCitationHref('https://example.com/m.pdf')).toBe(true)
    expect(isViewableCitationHref('/docs/m.pdf')).toBe(true)
    expect(isViewableCitationHref('./docs/m.pdf')).toBe(true)
    expect(isViewableCitationHref('/api/session/readFileBinary?name=test.pdf')).toBe(true)
    expect(isViewableCitationHref('manual.pdf')).toBe(true)
    expect(isViewableCitationHref('ftp://example.com/m.pdf')).toBe(false)
  })
})

describe('resolveFootnoteCitationTarget', () => {
  it('resolves the link destination with its page hint', () => {
    const target = resolveFootnoteCitationTarget(footnote([
      paragraph([text('See '), link('https://example.com/manual.pdf', 'manual'), text(', p.12')]),
    ]))
    expect(target).toEqual({
      href: 'https://example.com/manual.pdf',
      page: 12,
      title: 'manual.pdf',
    })
  })

  it('resolves nested links and inline code', () => {
    const target = resolveFootnoteCitationTarget(footnote([
      paragraph([{
        type: 'emphasis',
        children: [link('https://example.com/nested.pdf#page=4', 'nested')],
      }]),
      paragraph([{ type: 'inlineCode', value: 'maintenance_manual.pdf' }]),
    ]))
    expect(target).toEqual({
      href: 'https://example.com/nested.pdf#page=4',
      page: 4,
      title: 'nested.pdf',
    })
  })

  it('resolves an image destination', () => {
    const target = resolveFootnoteCitationTarget(footnote([
      paragraph([{
        type: 'image', url: 'https://example.com/fig.png', title: null, alt: 'fig',
      }]),
    ]))
    expect(target.href).toBe('https://example.com/fig.png')
    expect(target.page).toBeUndefined()
  })

  it('skips empty destinations and keeps searching', () => {
    const target = resolveFootnoteCitationTarget(footnote([
      paragraph([link('', 'empty'), text(' and more')]),
    ]))
    expect(target).toEqual({})
  })

  it('falls back to a bare pdf token with its page and resolves it to /api/session/readFileBinary', () => {
    const target = resolveFootnoteCitationTarget(footnote([
      paragraph([text('see maintenance_manual.pdf p.4 for the interval')]),
    ]))
    expect(target).toEqual({
      href: '/api/session/readFileBinary?name=maintenance_manual.pdf',
      page: 4,
      title: 'maintenance_manual.pdf',
    })
  })

  it('returns a page-only target when the body names no document', () => {
    const target = resolveFootnoteCitationTarget(footnote([
      paragraph([text('see page 7 for details')]),
    ]))
    expect(target).toEqual({ page: 7 })
  })

  it('returns an empty target when the body names nothing', () => {
    expect(resolveFootnoteCitationTarget(footnote([paragraph([text('just a remark')])]))).toEqual({})
  })

  it('resolves end to end from a parsed footnote', () => {
    const root = parseGfmWithMath('Pump interval[^a].\n\n[^a]: See [manual](https://example.com/m.pdf), p.12.\n')
    const targets = createReferenceTargets()
    collectReferenceTargets(root.children, targets)
    const definition = targets.footnotes.get('A')
    expect(definition).toBeDefined()
    if (definition === undefined) return
    expect(resolveFootnoteCitationTarget(definition)).toEqual({
      href: 'https://example.com/m.pdf',
      page: 12,
      title: 'm.pdf',
    })
  })
})

describe('citationPdfSrc', () => {
  it('rejects targets without a viewable URL', () => {
    expect(citationPdfSrc({})).toBeNull()
  })

  it('keeps the bare URL when no page applies', () => {
    expect(citationPdfSrc({ href: 'https://example.com/m.pdf' })).toBe('https://example.com/m.pdf')
  })

  it('navigates through the page fragment', () => {
    expect(citationPdfSrc(
      { href: 'https://example.com/m.pdf', page: 12 },
    )).toBe('https://example.com/m.pdf#page=12')
    expect(citationPdfSrc(
      { href: 'https://example.com/m.pdf', page: 12 },
      4,
    )).toBe('https://example.com/m.pdf#page=4')
  })

  it('resolves local attachment paths to /api/session/readFileBinary', () => {
    const localPath = '/Users/example/.dsh/attachments/v1/files/f5/f502d9c26e9aa621bfda758596a6fbaffc2535812a7060410569c62581b42761/test.pdf#page=2'
    expect(citationPdfSrc({ href: localPath }, 2)).toBe(
      '/api/session/readFileBinary?digest=f502d9c26e9aa621bfda758596a6fbaffc2535812a7060410569c62581b42761&name=test.pdf#page=2',
    )
  })

  it('resolves bare pdf filenames to /api/session/readFileBinary', () => {
    expect(citationPdfSrc({ href: 'test.pdf', page: 2 })).toBe(
      '/api/session/readFileBinary?name=test.pdf#page=2',
    )
  })
})

describe('resolveAttachmentHref', () => {
  it('converts local attachment storage host paths into browser-accessible HTTP URLs', () => {
    const input = '/Users/example/.dsh/attachments/v1/files/f5/f502d9c26e9aa621bfda758596a6fbaffc2535812a7060410569c62581b42761/test.pdf#page=2'
    expect(resolveAttachmentHref(input)).toBe(
      '/api/session/readFileBinary?digest=f502d9c26e9aa621bfda758596a6fbaffc2535812a7060410569c62581b42761&name=test.pdf#page=2',
    )
  })

  it('converts http-prefixed local attachment paths into browser-accessible HTTP URLs', () => {
    const input = 'http://127.0.0.1:3000/Users/example/.dsh/attachments/v1/files/f5/f502d9c26e9aa621bfda758596a6fbaffc2535812a7060410569c62581b42761/test.pdf#page=2'
    expect(resolveAttachmentHref(input)).toBe(
      '/api/session/readFileBinary?digest=f502d9c26e9aa621bfda758596a6fbaffc2535812a7060410569c62581b42761&name=test.pdf#page=2',
    )
  })

  it('converts file:// URIs into browser-accessible HTTP URLs', () => {
    const input = 'file:///Users/example/.dsh/attachments/v1/files/f5/f502d9c26e9aa621bfda758596a6fbaffc2535812a7060410569c62581b42761/test.pdf#page=2'
    expect(resolveAttachmentHref(input)).toBe(
      '/api/session/readFileBinary?digest=f502d9c26e9aa621bfda758596a6fbaffc2535812a7060410569c62581b42761&name=test.pdf#page=2',
    )
  })

  it('converts bare PDF filenames into /api/session/readFileBinary URLs', () => {
    expect(resolveAttachmentHref('test.pdf#page=2')).toBe('/api/session/readFileBinary?name=test.pdf#page=2')
    expect(resolveAttachmentHref('state chart full.pdf')).toBe('/api/session/readFileBinary?name=state%20chart%20full.pdf')
  })

  it('leaves standard HTTP and non-attachment URLs unchanged', () => {
    expect(resolveAttachmentHref('https://example.com/doc.pdf')).toBe('https://example.com/doc.pdf')
    expect(resolveAttachmentHref('/api/session/readFileBinary?digest=abc&name=doc.pdf')).toBe(
      '/api/session/readFileBinary?digest=abc&name=doc.pdf',
    )
  })
})
