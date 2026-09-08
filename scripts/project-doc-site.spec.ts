/** Tests for the documentation website projection adapter. */

import { execFileSync } from 'node:child_process'
import { existsSync, globSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'
import type { Nodes } from 'mdast'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanDocSiteOutput, docSiteBuildOptions } from '../website/build.ts'
import { docsPages, landingLink, routeLink, sectionSpec, type DocsPage } from '../website/docs.ts'
import {
  addProjectionFrontmatter, emitRawMarkdownPages, llmsTxt, projectedPageContent, publishableImage,
  rawMarkdownFiles, rawMarkdownPageContent, rawMarkdownRoute, resolveRepositoryRef, rewriteMarkdown,
} from './project-doc-site.ts'

const roots: string[] = []
const repositoryRoot = resolve(import.meta.dirname, '..')

function unexpectedWebsiteMarkdown(files: readonly string[]): string[] {
  return files.filter(file => file.endsWith('.md') && file !== 'website/AGENTS.md').sort()
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function fixture(): { root: string; pages: DocsPage[] } {
  const root = mkdtempSync(join(tmpdir(), 'dsh-doc-site-'))
  roots.push(root)
  mkdirSync(join(root, 'docs'), { recursive: true })
  mkdirSync(join(root, 'packages'), { recursive: true })
  writeFileSync(join(root, 'docs/a.md'), '# A\n')
  writeFileSync(join(root, 'docs/b.md'), '# B\n')
  writeFileSync(join(root, 'docs/x(y).md'), '# Parentheses\n')
  writeFileSync(join(root, 'packages/tool.ts'), 'one\ntwo\n')
  writeFileSync(join(root, 'packages/logo.svg'), '<svg/>\n')
  return {
    root,
    pages: [
      { locale: 'en', contentLocale: 'en-US', source: 'docs/a.md', route: 'en/a.md', label: 'A', sidebar: 'en-guide', section: 'Test', order: 1 },
      { locale: 'en', contentLocale: 'en-US', source: 'docs/b.md', route: 'en/reference/b.md', label: 'B', sidebar: 'en-reference', section: 'Test', order: 2 },
    ],
  }
}

describe('website source layout', () => {
  it('rejects Markdown outside the subtree instructions', () => {
    expect(unexpectedWebsiteMarkdown([
      'website/AGENTS.md',
      'website/docs.ts',
      'website/zh-CN/api/harness/service.md',
    ])).toEqual(['website/zh-CN/api/harness/service.md'])
  })

  it('contains no tracked or unignored documentation copies', () => {
    const files = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'website'],
      { cwd: repositoryRoot, encoding: 'utf8' },
    ).split('\n').filter(file => file !== '' && existsSync(resolve(repositoryRoot, file)))

    expect(
      unexpectedWebsiteMarkdown(files),
      'Keep canonical Markdown under docs/ and publish it through website/docs.ts.',
    ).toEqual([])
  })
})

describe('documentation site build', () => {
  it.each([
    { mode: 'SPA', mpa: false, expectedMpa: undefined },
    { mode: 'MPA', mpa: true, expectedMpa: 'true' },
  ])('$mode build removes stale output before writing', async ({ mpa, expectedMpa }) => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-doc-build-'))
    roots.push(root)
    const outDir = join(root, '.dist')
    const stale = join(outDir, 'stale.md')
    mkdirSync(outDir)
    writeFileSync(stale, 'stale\n')

    const options = docSiteBuildOptions(root, mpa)
    expect(options.mpa).toBe(expectedMpa)
    expect(existsSync(stale)).toBe(true)
    await options.onAfterConfigResolve?.({ outDir } as never)
    expect(existsSync(outDir)).toBe(false)
  })

  it('refuses to remove the site root or an outside directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-doc-build-root-'))
    const outside = mkdtempSync(join(tmpdir(), 'dsh-doc-build-outside-'))
    roots.push(root, outside)
    writeFileSync(join(root, 'keep'), 'root\n')
    writeFileSync(join(outside, 'keep'), 'outside\n')

    expect(() => {
      cleanDocSiteOutput(root, root)
    }).toThrow('must be a child of site root')
    expect(() => {
      cleanDocSiteOutput(root, outside)
    }).toThrow('must be a child of site root')
    expect(readFileSync(join(root, 'keep'), 'utf8')).toBe('root\n')
    expect(readFileSync(join(outside, 'keep'), 'utf8')).toBe('outside\n')
  })

  it('unlinks a link-shaped output without removing its target', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-doc-build-link-root-'))
    const outside = mkdtempSync(join(tmpdir(), 'dsh-doc-build-link-target-'))
    roots.push(root, outside)
    const outDir = join(root, '.dist')
    const keep = join(outside, 'keep')
    writeFileSync(keep, 'outside\n')
    symlinkSync(outside, outDir, 'junction')

    cleanDocSiteOutput(root, outDir)

    expect(existsSync(outDir)).toBe(false)
    expect(readFileSync(keep, 'utf8')).toBe('outside\n')
  })

  it('refuses output whose nearest existing parent resolves outside the site root', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-doc-build-parent-link-root-'))
    const outside = mkdtempSync(join(tmpdir(), 'dsh-doc-build-parent-link-target-'))
    roots.push(root, outside)
    const linkedParent = join(root, 'linked')
    const outDir = join(linkedParent, 'missing', '.dist')
    const keep = join(outside, 'keep')
    writeFileSync(keep, 'outside\n')
    symlinkSync(outside, linkedParent, 'junction')

    try {
      expect(() => {
        cleanDocSiteOutput(root, outDir)
      }).toThrow('must resolve inside site root')
      expect(readFileSync(keep, 'utf8')).toBe('outside\n')
    } finally {
      unlinkSync(linkedParent)
    }
  })
})

describe('publishableImage', () => {
  it('accepts a regular file inside the repository', () => {
    const { root } = fixture()
    const real = realpathSync(join(root, 'packages/logo.svg'))
    expect(publishableImage(join(root, 'packages/logo.svg'), realpathSync(root))).toBe(real)
  })

  it('refuses a target whose real path escapes the repository', () => {
    // Publication copies the bytes onto the site, so a reference reaching a
    // build-machine file must not be treated as an image the repository owns.
    const { root } = fixture()
    const outside = mkdtempSync(join(tmpdir(), 'dsh-doc-site-outside-'))
    roots.push(outside)
    writeFileSync(join(outside, 'secret.png'), 'not really a png\n')
    symlinkSync(join(outside, 'secret.png'), join(root, 'packages/linked.png'))

    expect(publishableImage(join(root, 'packages/linked.png'), realpathSync(root))).toBeUndefined()
    expect(publishableImage(join(outside, 'secret.png'), realpathSync(root))).toBeUndefined()
  })

  it('refuses a directory', () => {
    const { root } = fixture()
    expect(publishableImage(join(root, 'packages'), realpathSync(root))).toBeUndefined()
  })
})

describe('resolveRepositoryRef', () => {
  it('defaults to public master instead of a private workflow SHA', () => {
    expect(resolveRepositoryRef({ GITHUB_SHA: 'private-sha' })).toBe('master')
  })

  it('accepts an explicit public repository ref', () => {
    expect(resolveRepositoryRef({ DOCS_REPOSITORY_REF: 'public-sha' })).toBe('public-sha')
  })
})

describe('rewriteMarkdown', () => {
  it('maps published pages and pins unpublished source links', () => {
    const { root, pages } = fixture()
    const source = '[B](b.md#part) [source](../packages/tool.ts:2) [web](https://example.com)\n'
    expect(rewriteMarkdown(source, {
      locale: 'en',
      sourcePath: 'docs/a.md',
      route: 'en/a.md',
      pages,
      repoRoot: root,
      repositoryRef: 'abc123',
    })).toBe(
      '[B](./reference/b.md#part) '
      + '[source](https://github.com/deepseek-ai/deepseek-harness/blob/abc123/packages/tool.ts#L2) '
      + '[web](https://example.com)\n',
    )
  })

  it('selects the published target in the site locale', () => {
    const { root, pages } = fixture()
    expect(rewriteMarkdown('[B](b.md)\n', {
      locale: 'en',
      sourcePath: 'docs/a.md',
      route: 'en/a.md',
      pages,
      repoRoot: root,
      repositoryRef: 'abc123',
    })).toBe('[B](./reference/b.md)\n')
  })

  it('uses raw GitHub content for unpublished images when nothing places them', () => {
    const { root, pages } = fixture()
    expect(rewriteMarkdown('![logo](../packages/logo.svg)\n', {
      locale: 'en',
      sourcePath: 'docs/a.md',
      route: 'en/a.md',
      pages,
      repoRoot: root,
      repositoryRef: 'abc123',
    })).toBe('![logo](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/abc123/packages/logo.svg)\n')
  })

  it('hands an image to the placer and uses the URL it returns', () => {
    // A raw GitHub URL cannot serve a private repository, so the site build
    // carries images itself; the placer is what puts them there. The stand-in
    // derives its URL the way the real one does, so a placer that stopped
    // returning the basename would fail here rather than pass on a constant.
    const { root, pages } = fixture()
    const placed: string[] = []
    expect(rewriteMarkdown('![logo](../packages/logo.svg)\n', {
      locale: 'en',
      sourcePath: 'docs/a.md',
      route: 'en/a.md',
      pages,
      repoRoot: root,
      repositoryRef: 'abc123',
      placeImage: (absPath) => {
        const name = basename(absPath)
        placed.push(name)
        return `./${name}`
      },
    })).toBe('![logo](./logo.svg)\n')
    expect(placed).toEqual(['logo.svg'])
  })

  it('keeps a placed image\u2019s query or fragment', () => {
    // An SVG view fragment and a Vite query both change what the reference
    // means, and the GitHub branch has always carried them.
    const { root, pages } = fixture()
    expect(rewriteMarkdown('![logo](../packages/logo.svg#view)\n', {
      locale: 'en',
      sourcePath: 'docs/a.md',
      route: 'en/a.md',
      pages,
      repoRoot: root,
      repositoryRef: 'abc123',
      placeImage: absPath => `./${basename(absPath)}`,
    })).toBe('![logo](./logo.svg#view)\n')
  })

  it('leaves a published page link to the route even when a placer exists', () => {
    const { root, pages } = fixture()
    expect(rewriteMarkdown('[B](b.md)\n', {
      locale: 'en',
      sourcePath: 'docs/a.md',
      route: 'en/a.md',
      pages,
      repoRoot: root,
      repositoryRef: 'abc123',
      placeImage: () => { throw new Error('a page link must not be placed as an asset') },
    })).toBe('[B](./reference/b.md)\n')
  })

  it('does not rewrite Markdown-looking text inside code fences', () => {
    const { root, pages } = fixture()
    const source = '```md\n[B](b.md)\n```\n'
    expect(rewriteMarkdown(source, {
      locale: 'en',
      sourcePath: 'docs/a.md',
      route: 'en/a.md',
      pages,
      repoRoot: root,
      repositoryRef: 'abc123',
    })).toBe(source)
  })

  it('replaces the destination token without changing repeated titles or escapes', () => {
    const { root, pages } = fixture()
    const source = '[title](b.md "b.md") [escaped](x\\(y\\).md)\n'
    expect(rewriteMarkdown(source, {
      locale: 'en',
      sourcePath: 'docs/a.md',
      route: 'en/a.md',
      pages,
      repoRoot: root,
      repositoryRef: 'abc123',
    })).toBe(
      '[title](./reference/b.md "b.md") '
      + '[escaped](https://github.com/deepseek-ai/deepseek-harness/blob/abc123/docs/x(y).md)\n',
    )
  })

  it('resolves links through a page source alias', () => {
    const { root, pages } = fixture()
    writeFileSync(join(root, 'docs/c.md'), '# C\n')
    writeFileSync(join(root, 'docs/alias.md'), '# Alias\n')
    pages.push({
      locale: 'en', contentLocale: 'en-US', source: 'docs/c.md', sourceAliases: ['docs/alias.md'],
      route: 'en/c.md', label: 'C', sidebar: 'en-guide', section: 'Test', order: 3,
    })
    expect(rewriteMarkdown('[C](alias.md)\n', {
      locale: 'en',
      sourcePath: 'docs/a.md',
      route: 'en/a.md',
      pages,
      repoRoot: root,
      repositoryRef: 'abc123',
    })).toBe('[C](./c.md)\n')
  })

  it('fails loud when a relative target is missing', () => {
    const { root, pages } = fixture()
    expect(() => rewriteMarkdown('[missing](missing.md)\n', {
      locale: 'en',
      sourcePath: 'docs/a.md',
      route: 'en/a.md',
      pages,
      repoRoot: root,
      repositoryRef: 'abc123',
    })).toThrow('links to missing path "missing.md"')
  })
})

describe('docsPages locale routes', () => {
  it('redirects the locale home to its locale-relative quick-start page', () => {
    const homes = docsPages.filter(page => page.sidebar === null)
    expect(homes.map(page => page.route)).toEqual(['en/index.md'])
    for (const page of homes) {
      const source = readFileSync(resolve(repositoryRoot, page.source), 'utf8')
      const projected = projectedPageContent(source, page)
      expect(projected).toContain('layout: false')
      expect(projected).toContain('http-equiv: refresh')
      expect(projected).toContain('content: 0; url=./guide/quickstart')
      expect(projected).not.toContain('# DeepSeek Harness')
    }
  })

  it('publishes every route in English with existing sources', () => {
    for (const page of docsPages) {
      expect(page.locale).toBe('en')
      expect(page.contentLocale).toBe('en-US')
      expect(page.source.endsWith('.en.md')).toBe(false)
      expect(existsSync(resolve(repositoryRoot, page.source)), page.route).toBe(true)
    }
  })

  it('projects the audited tutorial entry links from explicit index pages', () => {
    const entries = [
      ['docs/user/develop/basic/config.md', '../framework/index.md'],
      ['docs/user/develop/basic/publish.md', '../framework/index.md'],
      ['docs/user/develop/basic/tool.md', './index.md'],
      ['docs/user/develop/basic/tool.md', '../practice/index.md'],
      ['docs/user/develop/framework/events.md', '../practice/index.md'],
      ['docs/user/develop/framework/service.md', '../practice/index.md'],
      ['docs/user/develop/practice/index.md', '../basic/index.md'],
      ['docs/user/guide/index.md', '../develop/basic/index.md'],
    ] as const

    for (const [source, target] of entries) {
      const page = docsPages.find(candidate => candidate.locale === 'en' && candidate.source === source)
      expect(page, `en:${source}`).toBeDefined()
      expect(readFileSync(resolve(repositoryRoot, source), 'utf8')).toContain(`](${target})`)
      expect(rewriteMarkdown(`[Entry](${target})\n`, {
        locale: 'en',
        sourcePath: source,
        route: page!.route,
        pages: docsPages,
        repoRoot: repositoryRoot,
        repositoryRef: 'abc123',
      })).toBe(`[Entry](${target})\n`)
    }
  })

  it('indexes every subsystem page in the folder README', () => {
    const pages = globSync(join(repositoryRoot, 'docs/subsystems/*.md'))
      .map(page => basename(page))
      .filter(page => page !== 'README.md')
      .sort()
    expect(pages.length).toBeGreaterThan(0)
    const rows = readFileSync(join(repositoryRoot, 'docs/subsystems/README.md'), 'utf8')
    const missing = pages.filter(page => !rows.includes(`| [${page}](${page}) |`))
    expect(missing, 'README.md must carry one table row per subsystem page').toEqual([])
  })


  it('places the shared todo fragment alias on the todo section', () => {
    const catalog = readFileSync(resolve(repositoryRoot, 'docs/tool-catalog.md'), 'utf8')
    expect(catalog.match(/<a id="deepseek-aidsh-tool-todo"><\/a>/g)).toHaveLength(1)
    expect(catalog).toContain(
      '<a id="deepseek-aidsh-tool-todo"></a>\n\n## `@deepseek-ai/dsh-tool-todo`',
    )
  })

  it('projects every published subsystem page in English', () => {
    const subsystemPages = docsPages.filter(page => (
      page.locale === 'en' && page.route.startsWith('en/reference/subsystems/')
    ))
    expect(subsystemPages.length).toBeGreaterThan(0)
    expect(subsystemPages.every(page => page.contentLocale === 'en-US')).toBe(true)
    expect(subsystemPages.every(page => !page.source.endsWith('.en.md'))).toBe(true)
  })

  it('publishes the Cordis core API in English', () => {
    const files = ['context.md', 'events.md', 'fiber.md', 'registry.md', 'service.md']
    for (const file of files) {
      const page = docsPages.find(candidate => candidate.route === `en/reference/cordis-api/${file}`)
      expect(page?.source).toBe(`docs/cordis-api/${file}`)
      expect(page?.contentLocale).toBe('en-US')
      expect(page?.section).toBe('Cordis Core API')
    }
  })

  it('keeps Cordis inherited on the English source', () => {
    const pages = docsPages.filter(page => page.route.endsWith('reference/cordis-api/inherited.md'))
    expect(pages).toHaveLength(1)
    expect(pages.every(page => page.source === 'docs/cordis-api/inherited.md')).toBe(true)
    expect(pages.every(page => page.contentLocale === 'en-US')).toBe(true)
  })

  it('includes persistence event headings in the English outline', () => {
    const pages = docsPages.filter(page => page.route.endsWith('reference/persistence-catalog.md'))
    expect(pages).toHaveLength(1)
    expect(pages.map(page => page.source)).toEqual(['docs/persistence-catalog.md'])
    expect(pages.map(page => page.outline)).toEqual(['deep'])
  })

  it('projects reviewed generated counterparts into English routes', () => {
    // module-graph, event-producer-consumer, and graph-atlas are intentionally unpublished.
    const routes = [
      'en/reference/capability-seams.md',
      'en/reference/agent-lifecycle.md',
      'en/reference/tool-execution-pipeline.md',
      'en/reference/config-catalog.md',
      'en/reference/tool-catalog.md',
      'en/reference/persistence-catalog.md',
      'en/reference/cordis-api/context.md',
      'en/reference/cordis-api/events.md',
      'en/reference/cordis-api/fiber.md',
      'en/reference/cordis-api/registry.md',
      'en/reference/cordis-api/service.md',
    ]
    const pages = routes.map(route => docsPages.find(page => page.route === route))
    expect(pages.every(page => page?.contentLocale === 'en-US')).toBe(true)
    expect(pages.every(page => page !== undefined && !page.source.endsWith('.en.md'))).toBe(true)
  })
})

describe('sidebar ordering', () => {
  it('places every section a sidebar collection owns', () => {
    for (const page of docsPages) {
      if (page.sidebar === null) continue
      expect(() => sectionSpec(page.locale, page.section), page.route).not.toThrow()
    }
  })

  it('refuses a section with no declared placement', () => {
    expect(() => sectionSpec('en', 'No Such Section'))
      .toThrow('Sidebar section "No Such Section" has no placement in the en locale.')
  })

  it('ranks automation sections after the guide sections', () => {
    expect(sectionSpec('en', 'Automation').index).toBeGreaterThan(sectionSpec('en', 'Guide').index)
    expect(() => sectionSpec('en', 'Guide2')).toThrow()
  })

  it('lands every navigation item on a page the manifest publishes', () => {
    // The navigation bar named `/guide/` while the manifest published the guide's
    // first page at `guide/quickstart.md`, so the item served a 404.
    const collections = ['en-guide', 'en-develop', 'en-reference'] as const
    const published = new Set(docsPages.map(page => routeLink(page.route)))
    for (const collection of collections) {
      expect(published, `en/${collection}`).toContain(landingLink('en', collection))
    }
  })

  it('collapses the subsystem groups and leaves the smaller ones open', () => {
    expect(sectionSpec('en', 'Execution and tools').collapsed).toBe(true)
    expect(sectionSpec('en', 'Concepts').collapsed).toBeUndefined()
  })

  it('gives each page its own position within a section', () => {
    // Sidebar entries sort by order alone, so a shared value leaves the two
    // pages ranked by whichever manifest block happens to be concatenated
    // first rather than by an intent the manifest states.
    const taken = new Map<string, string>()
    const collisions: string[] = []
    for (const page of docsPages) {
      const slot = `${page.locale}/${String(page.sidebar)}/${page.section}#${page.order}`
      const holder = taken.get(slot)
      if (holder === undefined) taken.set(slot, page.label)
      else collisions.push(`${slot}: ${holder} / ${page.label}`)
    }
    expect(collisions).toEqual([])
  })
})

describe('addProjectionFrontmatter', () => {
  it('adds frontmatter to an ordinary Markdown page', () => {
    expect(addProjectionFrontmatter('# Guide\n', { source: 'docs/guide.md' })).toBe(
      '---\neditSource: "docs/guide.md"\n---\n\n# Guide\n',
    )
  })

  it('extends existing VitePress frontmatter', () => {
    expect(addProjectionFrontmatter('---\nlayout: home\n---\n', { source: 'docs/index.md' })).toBe(
      '---\neditSource: "docs/index.md"\nlayout: home\n---\n',
    )
  })

  it('adds the page-specific outline depth from the publication manifest', () => {
    expect(addProjectionFrontmatter('# Catalog\n', {
      source: 'docs/catalog.md',
      outline: [2, 4],
    })).toBe(
      '---\neditSource: "docs/catalog.md"\noutline: [2,4]\n---\n\n# Catalog\n',
    )
  })
})

describe('projectedPageContent', () => {
  it('omits the source-only body from locale home pages', () => {
    expect(projectedPageContent(
      '---\nlayout: false\nhead:\n  - - meta\n    - http-equiv: refresh\n      content: 0; url=./guide/quickstart\n---\n\n# Harness\n\n[English](index.md) | 中文\n',
      page(null),
    )).toBe('---\nlayout: false\nhead:\n  - - meta\n    - http-equiv: refresh\n      content: 0; url=./guide/quickstart\n---\n')
  })

  const page = (sidebar: DocsPage['sidebar']): DocsPage => ({
    locale: 'en',
    contentLocale: 'en-US',
    source: 'docs/index.md',
    route: 'en/index.md',
    label: 'Home',
    sidebar,
    section: 'Home',
    order: 0,
  })

  it('keeps the full body for ordinary pages', () => {
    const markdown = '---\ntitle: Guide\n---\n\n# Guide\n'
    expect(projectedPageContent(markdown, page('en-guide'))).toBe(markdown)
  })

  it('drops the repository badge every page links from its footer', () => {
    const badge = '[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square)](https://github.com/deepseek-ai/deepseek-harness)'
    expect(projectedPageContent(`# Guide\n\nBody.\n\n${badge}\n`, page('en-guide')))
      .toBe('# Guide\n\nBody.\n')
  })

  it('keeps a switcher-shaped line that is not the page header', () => {
    // A tutorial showing the convention must still render the example.
    const sample = '# Guide\n\nA\n\nB\n\nC\n\nD\n\nE\n\nEnglish | [中文](./x)\n'
    expect(projectedPageContent(sample, page('en-guide'))).toBe(sample)
  })

  it('rejects a locale home source without frontmatter', () => {
    expect(() => projectedPageContent('# Harness\n', page(null)))
      .toThrow('locale home source "docs/index.md" must start with YAML frontmatter')
  })
})

describe('rawMarkdownPageContent', () => {
  it('keeps the home body the rendered site omits and drops the VitePress frontmatter', () => {
    expect(rawMarkdownPageContent(
      '---\nlayout: false\nhead:\n  - - meta\n    - http-equiv: refresh\n      content: 0; url=./guide/quickstart\n---\n\n# Harness\n\nEnglish | [中文](./index.md)\n\nBody.\n',
      'docs/user/index.md',
    )).toBe('# Harness\n\nBody.\n')
  })

  it('drops the language switcher and repository badge like the rendered site', () => {
    const badge = '[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square)](https://github.com/deepseek-ai/deepseek-harness)'
    expect(rawMarkdownPageContent(`# Guide\n\nEnglish | [中文](./x)\n\nBody.\n\n${badge}\n`, 'docs/guide.md'))
      .toBe('# Guide\n\nBody.\n')
  })

  it('rejects unclosed frontmatter and names the page', () => {
    // The twin pass is the first place an ordinary page's frontmatter is
    // parsed, so an anonymous error would leave 168 routes to search.
    expect(() => rawMarkdownPageContent('---\nlayout: false\n', 'docs/broken.md'))
      .toThrow('project-doc-site: "docs/broken.md" has unclosed YAML frontmatter')
  })
})

describe('emitRawMarkdownPages', () => {
  function mirrorDir(): string {
    const out = mkdtempSync(join(tmpdir(), 'dsh-doc-mirror-'))
    roots.push(out)
    return out
  }

  it('writes every route with rewritten links, placed images, and no projection frontmatter', () => {
    const { root, pages } = fixture()
    writeFileSync(join(root, 'docs/a.md'), '[B](b.md) ![logo](../packages/logo.svg)\n')
    const out = mirrorDir()

    // The real path, because image placement proves containment via realpath.
    emitRawMarkdownPages(out, { pages, repoRoot: realpathSync(root), repositoryRef: 'abc123' })

    expect(readFileSync(join(out, 'en/a.md'), 'utf8')).toBe('[B](./reference/b.md) ![logo](./logo.svg)\n')
    expect(readFileSync(join(out, 'en/reference/b.md'), 'utf8')).toBe('# B\n')
    expect(existsSync(join(out, 'en/logo.svg'))).toBe(true)
  })

  it('emits the full body of a locale home page', () => {
    const { root, pages } = fixture()
    writeFileSync(join(root, 'docs/home.md'), '---\nlayout: false\n---\n\n# Home\n\n[A](a.md)\n')
    pages.push({
      locale: 'en', contentLocale: 'en-US', source: 'docs/home.md', route: 'en/index.md',
      label: 'Home', sidebar: null, section: 'Home', order: 0,
    })
    const out = mirrorDir()

    emitRawMarkdownPages(out, { pages, repoRoot: root, repositoryRef: 'abc123' })

    expect(readFileSync(join(out, 'en/index.md'), 'utf8')).toBe('# Home\n\n[A](./a.md)\n')
  })

  it('emits a parent-level alias for an index route with links recomputed', () => {
    // A copied alias would carry the index page's relative links one directory
    // too high, so the alias is its own projection over the alias route.
    const { root, pages } = fixture()
    writeFileSync(join(root, 'docs/c.md'), '# C\n\n[A](a.md)\n')
    pages.push({
      locale: 'en', contentLocale: 'en-US', source: 'docs/c.md', route: 'en/guide/index.md',
      label: 'C', sidebar: 'en-guide', section: 'Test', order: 3,
    })
    const out = mirrorDir()

    emitRawMarkdownPages(out, { pages, repoRoot: root, repositoryRef: 'abc123' })

    expect(readFileSync(join(out, 'en/guide/index.md'), 'utf8')).toBe('# C\n\n[A](../a.md)\n')
    expect(readFileSync(join(out, 'en/guide.md'), 'utf8')).toBe('# C\n\n[A](./a.md)\n')
  })

  it('refuses to overwrite a file the build already carries', () => {
    // The twin pass writes into a populated build directory, and VitePress has
    // already copied `website/public/` there; a page image sharing one of
    // those names must fail loud instead of silently replacing the site file.
    const { root, pages } = fixture()
    writeFileSync(join(root, 'docs/a.md'), '![logo](../packages/logo.svg)\n')
    const out = mirrorDir()
    mkdirSync(join(out, 'en'), { recursive: true })
    writeFileSync(join(out, 'en/logo.svg'), 'public copy\n')

    expect(() => {
      emitRawMarkdownPages(out, { pages, repoRoot: realpathSync(root), repositoryRef: 'abc123' })
    }).toThrow('would overwrite')
    expect(readFileSync(join(out, 'en/logo.svg'), 'utf8')).toBe('public copy\n')
  })
})

describe('rawMarkdownFiles', () => {
  it('lists every route plus a parent alias per index route', () => {
    const files = rawMarkdownFiles()
    for (const page of docsPages) expect(files).toContain(page.route)
    expect(files).toContain('en/reference.md')
    expect(files).toContain('en.md')
    // The home page has no parent to alias into.
    expect(files).not.toContain('.md')
    expect(new Set(files).size).toBe(files.length)
  })
})

describe('raw Markdown projection of the published manifest', () => {
  let mirror: string

  // Coverage instrumentation on a loaded CI runner stretches the full-manifest
  // emission and the 181-file link walk past vitest's 5s default.
  beforeAll(() => {
    mirror = mkdtempSync(join(tmpdir(), 'dsh-doc-mirror-real-'))
    emitRawMarkdownPages(mirror, { pages: docsPages, repoRoot: repositoryRoot, repositoryRef: 'master' })
  }, 60_000)

  afterAll(() => {
    rmSync(mirror, { recursive: true, force: true })
  })

  it('emits every published route and every index alias', () => {
    for (const file of rawMarkdownFiles()) {
      expect(existsSync(join(mirror, file)), file).toBe(true)
    }
  })

  it('emits the home page with its body instead of the frontmatter stub', () => {
    const home = readFileSync(join(mirror, 'en/index.md'), 'utf8')
    expect(home.startsWith('---')).toBe(false)
    expect(home).toContain('# DeepSeek Harness')
  })

  it('resolves every relative link inside the emitted tree', { timeout: 60_000 }, () => {
    // Raw pages are read outside the site, so a relative target that only the
    // rendered site serves would strand every agent following it.
    const broken: string[] = []
    for (const file of globSync('**/*.md', { cwd: mirror }).sort()) {
      for (const target of relativeTargets(readFileSync(join(mirror, file), 'utf8'))) {
        if (!existsSync(resolve(mirror, dirname(file), target))) broken.push(`${file}: ${target}`)
      }
    }
    expect(broken).toEqual([])
  })
})

function relativeTargets(markdown: string): string[] {
  const tree = fromMarkdown(markdown, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
  const targets: string[] = []
  const visit = (node: Nodes): void => {
    if ((node.type === 'link' || node.type === 'image' || node.type === 'definition') && 'url' in node) {
      const external = node.url.startsWith('#')
        || node.url.startsWith('/')
        || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(node.url)
      const path = node.url.split(/[?#]/)[0] ?? ''
      if (!external && path !== '') targets.push(decodeURIComponent(path))
    }
    if ('children' in node) {
      for (const child of node.children) visit(child)
    }
  }
  visit(tree)
  return targets
}

describe('llmsTxt', () => {
  const site = { base: '/x/', title: 'DeepSeek Harness', description: 'Plugin SDK' }

  it('lists every sidebar page as a base-prefixed raw-Markdown link', () => {
    const text = llmsTxt(site)
    for (const page of docsPages) {
      if (page.sidebar === null) expect(text, page.route).not.toContain(`](/x/${page.route})`)
      else expect(text, page.route).toContain(`- [${page.label}](/x/${page.route}): ${page.section}`)
    }
  })

  it('groups the single locale tree under its own heading', () => {
    const text = llmsTxt(site)
    expect(text).toContain('## English')
    expect(text).not.toContain('简体中文')
  })

  it('carries the site identity and the raw-Markdown convention', () => {
    const text = llmsTxt(site)
    expect(text.startsWith('# DeepSeek Harness\n')).toBe(true)
    expect(text).toContain('> Plugin SDK')
    expect(text).toMatch(/`\.md`/)
  })
})

describe('rawMarkdownRoute', () => {
  it('projects one published route on demand', () => {
    const { root, pages } = fixture()
    writeFileSync(join(root, 'docs/a.md'), '# A\n\n[B](b.md)\n')

    expect(rawMarkdownRoute('en/a.md', { pages, repoRoot: root, repositoryRef: 'abc123' }))
      .toBe('# A\n\n[B](./reference/b.md)\n')
  })

  it('returns undefined for a path the manifest does not publish', () => {
    const { root, pages } = fixture()
    expect(rawMarkdownRoute('en/missing.md', { pages, repoRoot: root, repositoryRef: 'abc123' })).toBeUndefined()
  })
})
