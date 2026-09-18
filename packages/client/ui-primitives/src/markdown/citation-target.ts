/**
 * Footnote-definition → citation-target resolution for the Chat | PDF side
 * view. A footnote body written by the model names a real document (a link
 * destination or a `*.pdf` token) and optionally a page; this module extracts
 * that target without guessing — no link and no path token means no target.
 */
import type * as Md from 'mdast'

/** Document target resolved from one footnote definition. */
export interface FootnoteCitationTarget {
  /** Raw link destination or path token, exactly as authored. */
  href?: string | undefined
  /** 1-based page number when the body names one. */
  page?: number | undefined
  /** Display name derived from the destination or token. */
  title?: string | undefined
}

/**
 * Collect plain text under a subtree for page-hint matching.
 * @param node - Subtree to read.
 * @param out - Accumulator receiving text values.
 */
function collectText(node: Md.RootContent, out: string[]): void {
  if (node.type === 'text' || node.type === 'inlineCode') {
    out.push(node.value)
    return
  }
  if ('children' in node) {
    for (const child of node.children as readonly Md.RootContent[]) collectText(child, out)
  }
}

/**
 * Find the first link or image destination under a subtree.
 * @param node - Subtree to search depth-first.
 * @returns The first destination, or undefined when the body links nothing.
 */
function firstDestination(node: Md.RootContent): string | undefined {
  if (node.type === 'link' || node.type === 'image') {
    const url = (node as Md.Link).url
    if (url !== '') return url
  }
  if ('children' in node) {
    for (const child of node.children as readonly Md.RootContent[]) {
      const found = firstDestination(child)
      if (found !== undefined) return found
    }
  }
  return undefined
}

/**
 * Extract a 1-based page number from authored text or a URL fragment.
 * @param text - Plain body text plus the destination to scan.
 * @returns The page number, or undefined when nothing names one.
 */
export function parseCitationPage(text: string): number | undefined {
  const fragment = /#page=(\d+)/i.exec(text)?.[1]
  const hint = /(?:\bp\.?\s*|\bpage\s+)(\d+)/i.exec(text)?.[1]
  const raw = fragment ?? hint
  if (raw === undefined) return undefined
  const page = Number.parseInt(raw, 10)
  if (!Number.isSafeInteger(page) || page < 1) return undefined
  return page
}

/**
 * Derive a display name from a destination or token.
 * @param href - Authored destination or path token.
 * @returns The trailing path segment, or the destination unchanged.
 */
export function citationTitle(href: string): string {
  const hash = href.indexOf('#')
  const bare = hash < 0 ? href : href.slice(0, hash)
  const slash = Math.max(bare.lastIndexOf('/'), bare.lastIndexOf('\\'))
  const segment = slash < 0 ? bare : bare.slice(slash + 1)
  return segment === '' ? href : segment
}

/**
 * Convert a local attachment storage host path or bare PDF filename into a browser-accessible HTTP URL.
 * Pattern 1 (full storage path): `.../files/<2-hex-prefix>/<64-hex-digest>/<name>` or containing any 64-hex SHA-256 digest
 * Example 1: `/Users/.../.dsh/attachments/v1/files/f5/f502d9c26e9aa621bfda758596a6fbaffc2535812a7060410569c62581b42761/test.pdf#page=2`
 * Output 1: `/api/session/readFileBinary?digest=f502d9c26e9aa621bfda758596a6fbaffc2535812a7060410569c62581b42761&name=test.pdf#page=2`
 * Pattern 2 (bare pdf filename or local path): `test.pdf#page=2` or `/Users/.../test.pdf`
 * Output 2: `/api/session/readFileBinary?name=test.pdf#page=2`
 * @param href - Authored destination, path token, or local attachment path.
 * @returns Browser-accessible HTTP URL or original href if not a PDF/attachment path.
 */
export function resolveAttachmentHref(href: string): string {
  if (!href || href.startsWith('/api/session/readFileBinary')) {
    return href
  }
  const hashIndex = href.indexOf('#')
  const bare = hashIndex >= 0 ? href.slice(0, hashIndex) : href
  const fragment = hashIndex >= 0 ? href.slice(hashIndex) : ''

  // 1. Extract 64-hex SHA-256 digest and filename if present in the path
  const digestMatch = /(?:^|[\/\\])([a-f0-9]{64})[\/\\]([^#?]+)/i.exec(bare)
  if (digestMatch !== null && digestMatch[1] !== undefined && digestMatch[2] !== undefined) {
    const digest = digestMatch[1].toLowerCase()
    const filename = citationTitle(digestMatch[2])
    return `/api/session/readFileBinary?digest=${digest}&name=${encodeURIComponent(filename)}${fragment}`
  }

  // 2. Pure external web HTTP(S) URLs without local path indicators stay as-is
  if (
    (href.startsWith('http://') || href.startsWith('https://')) &&
    !href.includes('.dsh') &&
    !href.includes('/Users/') &&
    !href.includes('/home/') &&
    !href.includes('\\Users\\')
  ) {
    return href
  }

  // 3. Convert any local path, file:// URI, .dsh path, or PDF filename to backend attachment HTTP URL
  const title = citationTitle(bare)
  return `/api/session/readFileBinary?name=${encodeURIComponent(title)}${fragment}`
}

/**
 * Resolve the document target of one footnote definition.
 * @param definition - Parsed footnote definition from the reference targets.
 * @returns The link destination and page hint, or an empty target when the
 * body names no document.
 */
export function resolveFootnoteCitationTarget(definition: Md.FootnoteDefinition): FootnoteCitationTarget {
  const href = firstDestination(definition)
  const parts: string[] = []
  for (const child of definition.children) collectText(child, parts)
  const body = parts.join(' ')
  if (href !== undefined) {
    const title = citationTitle(href)
    const page = parseCitationPage(`${body} ${href}`)
    const resolvedHref = resolveAttachmentHref(href)
    return { href: resolvedHref, page, title }
  }
  const token = /(^|\s)([^\s"'()<>]*(?:\.pdf|\.dsh|files\/|\/Users\/|file:\/\/)[^\s"'()<>]*)/i.exec(body)?.[2]
    ?? /(^|\s)([^\s"'()<>]+\.pdf)(\s|$)/i.exec(body)?.[2]
  if (token !== undefined) {
    const title = citationTitle(token)
    const page = parseCitationPage(`${body} ${token}`)
    const resolvedHref = resolveAttachmentHref(token)
    return { href: resolvedHref, page, title }
  }
  const page = parseCitationPage(body)
  return page === undefined ? {} : { page }
}

/**
 * Decide whether a destination can render inside the side viewer.
 * @param href - Authored destination, if any.
 * @returns True for absolute HTTP(S), file, blob, or relative path destinations.
 */
export function isViewableCitationHref(href: string | undefined): href is string {
  if (href === undefined || href.trim() === '') return false
  const isPathOrUrl = href.includes('://') || href.startsWith('/') || href.startsWith('./') || href.startsWith('../')
  if (!isPathOrUrl) {
    try {
      const protocol = new URL(href).protocol
      return protocol === 'http:' || protocol === 'https:' || protocol === 'file:' || protocol === 'blob:'
    } catch {
      return false
    }
  }
  try {
    const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost'
    const url = new URL(href, base)
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'file:' || url.protocol === 'blob:'
  } catch {
    return false
  }
}


/**
 * Build the viewer source for a citation target.
 * @param target - Resolved footnote target.
 * @param page - Page override from viewer navigation, if any.
 * @returns The iframe source, or null when the target has no viewable URL.
 */
export function citationPdfSrc(
  target: Pick<FootnoteCitationTarget, 'href' | 'page'>,
  page?: number | undefined,
): string | null {
  if (!isViewableCitationHref(target.href)) return null
  const href = resolveAttachmentHref(target.href)
  const next = page ?? target.page
  if (next === undefined) return href
  const [bare] = href.split('#')
  return `${bare}#page=${String(next)}`
}
