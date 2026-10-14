// MRPL workbench screens — Playwright smoke per screen over the standalone
// harness (apps/web/mrpl-harness). `/hyperion/mrpl/*` is fulfilled from the
// REAL host store over the bundled public sample seed (same code the bridge
// routes run), so the screens exercise real catalog data, page text and
// citation verification. Error/empty states are forced by route overrides.
// Screenshots: MRPL_SHOTS_DIR (default <repo>/snapshots/web/mrpl-screens/out).
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Browser, Page, Route } from 'playwright'
import { chromium } from 'playwright'
import { createServer, type ViteDevServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MrplStore, rollUpEvidence } from '../../../packages/host/hyperion-bridge/src/mrpl-store.ts'
import { parseVerifyBody } from '../../../packages/host/hyperion-bridge/src/mrpl-routes.ts'

const REPO = fileURLToPath(new URL('../../../', import.meta.url))
const HARNESS = join(REPO, 'apps/web/mrpl-harness')
const SHOTS = process.env.MRPL_SHOTS_DIR ?? join(REPO, 'snapshots/web/mrpl-screens/out')
const SHOT_PREFIX = process.env.MRPL_SHOTS_PREFIX ?? 'after'
const store = new MrplStore(join(REPO, 'packages/host/hyperion-bridge/mrpl-seed'), {
  uploadsDir: () => '/nonexistent-hyperion-uploads',
  seed: true,
})

let server: ViteDevServer
let browser: Browser
let base: string

/** Answer `/hyperion/mrpl/*` from the real store; `override` forces a failure mode. */
async function routeMrpl(page: Page, override?: 'error' | 'empty'): Promise<void> {
  await page.route('**/hyperion/mrpl/**', async (route: Route) => {
    const url = new URL(route.request().url())
    const json = (status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (override === 'error') return json(503, { code: 'mrpl/store-unavailable', message: 'document manifest unreadable' })
    const { dataset, documents } = await store.documents()
    const path = url.pathname
    if (path === '/hyperion/mrpl/documents') {
      if (override === 'empty') return json(200, { dataset, documents: [], categories: [] })
      const summaries = documents.map(({ sha256: _s, licenseNotes: _l, ...d }) => d)
      return json(200, { dataset, documents: summaries, categories: await store.categories() })
    }
    const text = /^\/hyperion\/mrpl\/documents\/([^/]+)\/text$/.exec(path)
    if (text !== null) {
      const pages = await store.pages(text[1]!) ?? []
      const wanted = url.searchParams.get('page')
      const entry = pages.find(p => p.page === (wanted === null ? pages[0]?.page : Number(wanted)))
      if (entry === undefined) return json(404, { code: 'mrpl/page-not-found', message: 'no text' })
      return json(200, { dataset, documentId: text[1], page: entry.page, textUnit: 'page', first: pages[0]!.page, last: pages[pages.length - 1]!.page, text: entry.text })
    }
    if (path === '/hyperion/mrpl/equipment') {
      if (override === 'empty') return json(200, { dataset, equipment: [], groups: [], telemetry: 'not-connected' })
      return json(200, { ...(await store.equipment()), telemetry: 'not-connected' })
    }
    if (path === '/hyperion/mrpl/evidence/verify') {
      const citations = parseVerifyBody(JSON.parse(route.request().postData() ?? '{}'))
      if (typeof citations === 'string') return json(400, { code: 'bad-request', message: citations })
      const results = await store.verify(citations)
      return json(200, { dataset, status: rollUpEvidence(results), verifiedCount: results.filter(r => r.status === 'verified').length, results })
    }
    if (path === '/hyperion/mrpl/deliverables') {
      if (override === 'empty') return json(200, { dataset, deliverables: [] })
      return json(200, { dataset, deliverables: await store.deliverables((_k, name) => `/hyperion/mrpl/deliverables/${name}`) })
    }
    return json(404, { code: 'not-found', message: path })
  })
}

async function open(screen: string, options: { override?: 'error' | 'empty'; query?: string; theme?: 'dark' } = {}): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' })
  const errors: string[] = []
  page.on('pageerror', (error) => { errors.push(String(error)) })
  await routeMrpl(page, options.override)
  await page.goto(`${base}/?screen=${screen}${options.theme === 'dark' ? '&theme=dark' : ''}${options.query ?? ''}`)
  ;(page as Page & { errors: string[] }).errors = errors
  return page
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: join(SHOTS, `${SHOT_PREFIX}-${name}.png`), fullPage: true })
}

beforeAll(async () => {
  await mkdir(SHOTS, { recursive: true })
  server = await createServer({ configFile: join(HARNESS, 'vite.config.ts'), server: { port: 0, host: '127.0.0.1' } })
  await server.listen()
  const address = server.httpServer?.address()
  if (address === null || address === undefined || typeof address === 'string') throw new Error('harness did not bind')
  base = `http://127.0.0.1:${String(address.port)}`
  // MRPL_CHROMIUM_PATH: reuse a preinstalled Chromium (e.g. CI image) instead of the bundled one.
  const executablePath = process.env.MRPL_CHROMIUM_PATH
  browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })
}, 120_000)

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

describe('MRPL screens smoke (harness + real seed store)', () => {
  it('Documents: catalog, category filter, real page text, OCR-pending, states', async () => {
    const page = await open('documents')
    await expect.poll(() => page.getByText('All (13)').count(), { timeout: 60_000 }).toBe(1)
    await page.getByLabel('Page 1 extracted text').waitFor()
    expect(await page.getByText('Public sample data').count()).toBeGreaterThan(0)
    await shot(page, 'documents')
    await page.getByText('Product Specs', { exact: true }).click()
    await page.getByText('All (2)').waitFor()
    await page.getByText('DOC-011.pdf').click()
    await page.getByText('OCR pending').waitFor()
    await shot(page, 'documents-ocr-pending')
    expect((page as Page & { errors: string[] }).errors).toEqual([])
    await page.close()

    const failed = await open('documents', { override: 'error' })
    await failed.getByRole('alert', { name: 'Documents: error' }).waitFor({ timeout: 60_000 })
    expect(await failed.getByRole('button', { name: 'Retry' }).count()).toBe(1)
    await shot(failed, 'documents-error')
    await failed.close()

    const empty = await open('documents', { override: 'empty' })
    await empty.getByText('No documents in the corpus catalog').waitFor({ timeout: 60_000 })
    await shot(empty, 'documents-empty')
    await empty.close()
  })

  it('Equipment: verified source records, no synthesized telemetry, states', async () => {
    const page = await open('equipment')
    await page.getByRole('heading', { level: 2, name: 'C-1100' }).waitFor({ timeout: 60_000 })
    expect(await page.getByText('Source verified').count()).toBe(1)
    expect(await page.getByText('Not connected').count()).toBe(1)
    expect(await page.getByText('P-101 A/B').count()).toBe(0)
    expect(await page.getByText('3.2 bar').count()).toBe(0)
    await shot(page, 'equipment')
    const dark = await open('equipment', { theme: 'dark' })
    await dark.getByRole('heading', { level: 2, name: 'C-1100' }).waitFor({ timeout: 60_000 })
    await shot(dark, 'equipment-dark')
    await dark.close()
    expect((page as Page & { errors: string[] }).errors).toEqual([])
    await page.close()

    const failed = await open('equipment', { override: 'error' })
    await failed.getByRole('alert', { name: 'Equipment: error' }).waitFor({ timeout: 60_000 })
    await shot(failed, 'equipment-error')
    await failed.close()
  })

  it('Reports: deliverables listed from the host with download links', async () => {
    const page = await open('reports')
    await page.getByText('MG91_Specification_Summary.pdf').waitFor({ timeout: 60_000 })
    const href = await page.getByRole('link', { name: 'Download' }).first().getAttribute('href')
    expect(href).toMatch(/^\/hyperion\/mrpl\/deliverables\//)
    await shot(page, 'reports')
    await page.close()

    const empty = await open('reports', { override: 'empty' })
    await empty.getByText('No deliverables yet').waitFor({ timeout: 60_000 })
    await shot(empty, 'reports-empty')
    await empty.close()
  })

  it('Evidence: status comes from host verification, tampered limits are caught', async () => {
    const page = await open('evidence')
    const card = page.getByRole('region', { name: 'Evidence' })
    await page.locator('[data-evidence-status="verified"]').waitFor({ timeout: 60_000 })
    await card.getByText('Evidence', { exact: true }).click()
    await card.getByText('RON · DOC-010 p.1').waitFor()
    await shot(page, 'evidence-verified')
    await page.close()

    const tampered = await open('evidence', { query: '&variant=tampered' })
    const tcard = tampered.getByRole('region', { name: 'Evidence' })
    await tampered.locator('[data-evidence-status="partial"]').waitFor({ timeout: 60_000 })
    await tcard.getByText('Evidence', { exact: true }).click()
    expect(await tcard.getByText('Partially verified (6/7)').count()).toBeGreaterThan(0)
    await shot(tampered, 'evidence-tampered')
    await tampered.close()

    const failed = await open('evidence', { override: 'error' })
    await failed.locator('[data-evidence-status="error"]').waitFor({ timeout: 60_000 })
    expect(await failed.getByText('Verification unavailable').count()).toBeGreaterThan(0)
    await shot(failed, 'evidence-error')
    await failed.close()
  })
})
