// MRPL wired-controls live end-to-end (PRs #23-#26): real Chromium -> MRPL harness
// (Reports, P&ID, Investigation detail, Documents screens) -> real hyperion-bridge (booted in-process with
// cordis Loader, exactly the plugin the host composes) -> LIVE services:
//   HYPERION_LIVE_RAG_URL  the Hyperion RAG service (hybrid BM25 + EmbeddingGemma 2 + rerank,
//                          OCR sidecar for scanned pages, gpt-oss answers)
//   HYPERION_LIVE_STT_URL  the asr-http STT sidecar (IndicConformer te/hi + Whisper en, auto-detect)
// Skips (does not pass) when the live URLs are not set. Nothing is mocked.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { createServer, type ViteDevServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import WebServer from '@deepseek-ai/dsh-host-webserver'
import * as HyperionBridge from '@deepseek-ai/dsh-host-hyperion-bridge'
import * as AsrHttp from '@deepseek-ai/dsh-asr-http'

const REPO = fileURLToPath(new URL('../../../', import.meta.url))
const HARNESS = join(REPO, 'apps/web/mrpl-harness')
const SHOTS = process.env.MRPL_SHOTS_DIR ?? join(REPO, 'snapshots/web/mrpl-screens/out')
const RAG = process.env.HYPERION_LIVE_RAG_URL ?? ''
const STT = process.env.HYPERION_LIVE_STT_URL ?? ''
const live = RAG !== '' && STT !== ''

let root: string
let context: Context
let server: ViteDevServer
let base: string
const browsers: Browser[] = []

async function bootBridge(): Promise<string> {
  root = await mkdtemp(join(tmpdir(), 'hyperion-live-e2e-'))
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-host-webserver'",
    '  config:',
    "    host: '127.0.0.1'",
    '    port: 0',
    "- name: '@deepseek-ai/dsh-asr-http'",
    '  config:',
    `    endpoint: ${JSON.stringify(STT)}`,
    "    defaultLanguage: 'auto'",
    "- name: '@deepseek-ai/dsh-host-hyperion-bridge'",
    '  config:',
    '    maxBodyBytes: 65536',
    `    ragUrl: ${JSON.stringify(RAG)}`,
    '    ragTimeoutMs: 900000',
    `    uploadsDir: ${JSON.stringify(join(root, 'uploads'))}`,
    '',
  ].join('\n'))
  context = new Context()
  context.baseUrl = pathToFileURL(root).href + '/'
  context.provide('connection', { requestRejection: () => undefined } as never)
  context.provide('agents', { get: () => undefined } as never)
  context.provide('sessionQuery', { listSessions: async () => [], observeSession: async () => { throw new Error('none') } } as never)
  await context.plugin(Loader)
  context.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-host-webserver', WebServer],
    ['@deepseek-ai/dsh-asr-http', AsrHttp],
    ['@deepseek-ai/dsh-host-hyperion-bridge', HyperionBridge],
  ])
  context.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof context.loader.internal>
  await context.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await context.loader.await()
  return `http://127.0.0.1:${String(context.webServer.port)}`
}

async function launch(): Promise<Browser> {
  const executablePath = process.env.MRPL_CHROMIUM_PATH
  const b = await chromium.launch({ ...(executablePath === undefined ? {} : { executablePath }) })
  browsers.push(b)
  return b
}

async function open(b: Browser, screen: string): Promise<Page> {
  const page = await b.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' })
  const errors: string[] = []
  page.on('pageerror', (error) => { errors.push(String(error)) })
  ;(page as Page & { errors: string[] }).errors = errors
  await page.goto(`${base}/?screen=${screen}`)
  return page
}

beforeAll(async () => {
  if (!live) return
  await mkdir(SHOTS, { recursive: true })
  process.env.MRPL_BRIDGE_URL = await bootBridge()
  server = await createServer({ configFile: join(HARNESS, 'vite.config.ts'), server: { port: 0, host: '127.0.0.1' } })
  await server.listen()
  const address = server.httpServer?.address()
  if (address === null || address === undefined || typeof address === 'string') throw new Error('harness did not bind')
  base = `http://127.0.0.1:${String(address.port)}`
}, 180_000)

afterAll(async () => {
  for (const b of browsers) await b.close()
  await server?.close()
  await context?.fiber.dispose()
  if (root !== undefined) await rm(root, { recursive: true, force: true })
})


type PageWithErrors = Page & { errors: string[] }

describe.skipIf(!live)('MRPL wired controls, live (droplet RAG + gpt-oss, nothing mocked)', () => {
  it('Reports: + Generate Report writes a cited Markdown deliverable through the live RAG answer route', async () => {
    const b = await launch()
    const page = await open(b, 'reports')
    await page.getByRole('button', { name: '+ Generate Report' }).waitFor({ timeout: 60_000 })
    await page.getByRole('button', { name: '+ Generate Report' }).click()
    await page.getByRole('textbox', { name: 'Report topic' }).fill('MG 91 gasoline: sulphur and benzene specification limits')
    await page.getByRole('button', { name: 'Generate', exact: true }).click()
    const done = page.getByRole('status', { name: 'Report generated' })
    await done.waitFor({ timeout: 600_000 })
    const text = await done.innerText()
    expect(text).toMatch(/\d+ citations?/)
    const href = await done.getByRole('link').getAttribute('href')
    expect(href).toMatch(/^\/hyperion\/mrpl\/deliverables\/Report-.+\.md$/)
    const md = await page.evaluate(async (u: string) => {
      const r = await fetch(u)
      return { status: r.status, body: await r.text() }
    }, href ?? '')
    expect(md.status).toBe(200)
    // The report lists its verified sources as a numbered list.
    expect(md.body).toMatch(/## Sources\n\n1\. DOC-\d+ p\.\d+ \(verified\)/)
    await writeFile(join(SHOTS, 'live-report.md'), md.body)
    await page.screenshot({ path: join(SHOTS, 'live-reports-generated.png'), fullPage: true })
    expect((page as PageWithErrors).errors).toEqual([])
  }, 900_000)

  it('P&ID: clicking a tag runs live evidence search + grounded answer for that tag', async () => {
    const b = await launch()
    const page = await open(b, 'pid')
    await page.getByRole('button', { name: 'Select E-101 on P&ID' }).click()
    const evidence = page.getByTestId('pid-tag-evidence')
    await evidence.waitFor({ timeout: 60_000 })
    await evidence.getByTestId('pid-tag-answer').or(evidence.getByTestId('pid-tag-abstain')).first().waitFor({ timeout: 600_000 })
    const text = await evidence.innerText()
    expect(text).not.toMatch(/Answer failed|Evidence search failed|need the live RAG/)
    expect(await evidence.getByRole('list', { name: 'Evidence passages for E-101' }).count()).toBe(1)
    // Abstention is shown as readable text, never the raw RAG reason code ("…: model.").
    if (await evidence.getByTestId('pid-tag-abstain').count() > 0) {
      const abstain = await evidence.getByTestId('pid-tag-abstain').innerText()
      expect(abstain).toMatch(/^No grounded answer\. \S/)
      expect(abstain).not.toMatch(/: ?(model|no_evidence|no_verified_citation|retrieval_gate\S*|unparseable_model_output)\.?$/)
    }
    await writeFile(join(SHOTS, 'live-pid-e101.txt'), text)
    await page.screenshot({ path: join(SHOTS, 'live-pid-tag-evidence.png'), fullPage: true })
    expect((page as PageWithErrors).errors).toEqual([])
  }, 900_000)

  it('Investigation detail: Rerun analysis and Generate Report run the cited live RAG analysis', async () => {
    const b = await launch()
    const page = await open(b, 'investigation')
    await page.getByRole('button', { name: 'Rerun analysis' }).click()
    const notice = page.getByRole('status').filter({ hasText: /Analysis (complete|failed)/ })
    await notice.waitFor({ timeout: 600_000 })
    expect(await notice.innerText()).toMatch(/Analysis complete · \d+ citation/)
    await page.getByText(/^Retrieval: /).first().waitFor()
    const download = page.waitForEvent('download', { timeout: 600_000 })
    await page.getByRole('button', { name: 'Generate Report' }).click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/-report\.md$/)
    await file.saveAs(join(SHOTS, `live-${file.suggestedFilename()}`))
    await page.getByText(/Report downloaded: .+-report\.md · \d+ citation/).waitFor({ timeout: 60_000 })
    await page.screenshot({ path: join(SHOTS, 'live-investigation-analysis.png'), fullPage: true })
    expect((page as PageWithErrors).errors).toEqual([])
  }, 1_200_000)

  it('Investigation on a corpus-covered asset (E-6600E, HTHA rupture): live analysis returns verified citations', async () => {
    const b = await launch()
    const page = await b.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' })
    const errors: string[] = []
    page.on('pageerror', (error) => { errors.push(String(error)) })
    const now = new Date().toISOString()
    const record = {
      code: 'INV-E2E-001', tag: 'E-6600E', title: 'Heat exchanger rupture from High Temperature Hydrogen Attack',
      severity: 'high', status: 'open', assignee: 'Me', origin: 'ask',
      ask: 'Why did heat exchanger E-6600E rupture?', createdAt: now, updatedAt: now,
      plantMetadata: 'e2e', equipmentType: 'exchanger',
    }
    await page.addInitScript((value: string) => { localStorage.setItem('hyperion.mrpl.investigations.v1', value) },
      JSON.stringify({ investigations: [record], selectedCode: record.code }))
    await page.goto(`${base}/?screen=investigation`)
    await page.getByRole('button', { name: 'Rerun analysis' }).click()
    const notice = page.getByRole('status').filter({ hasText: /Analysis (complete|failed)/ })
    await notice.waitFor({ timeout: 600_000 })
    const text = await notice.innerText()
    await writeFile(join(SHOTS, 'live-investigation-e6600e.txt'), `${text}\n\n${await page.getByRole('region', { name: /Analysis — E-6600E/ }).innerText()}`)
    expect(text).toMatch(/Analysis complete · [1-9]\d* citation/)
    expect(await page.getByRole('list', { name: 'Citations' }).innerText()).toMatch(/DOC-\d+, p\. \d+ · verified/)
    // Equipment Context / Related Documents follow the record, not the sample pump fixture.
    const equipment = page.getByRole('region', { name: 'Equipment Context' })
    const related = page.getByRole('region', { name: 'Related Documents' })
    await related.getByText(/DOC-\d+ p\.\d+ · /).first().waitFor({ timeout: 120_000 })
    const contextText = `${await equipment.innerText()}\n\n${await related.innerText()}`
    await writeFile(join(SHOTS, 'live-investigation-e6600e-context.txt'), contextText)
    expect(contextText).toContain('E-6600E')
    expect(contextText).not.toMatch(/Crude Feed Pump|KSB|P-204_/)
    await page.screenshot({ path: join(SHOTS, 'live-investigation-e6600e.png'), fullPage: true })
    expect(errors).toEqual([])
  }, 900_000)

  it('Documents: Unit / Equipment / Document Type / Tag facets and Sort filter the live catalog', async () => {
    const b = await launch()
    const page = await open(b, 'documents')
    await page.getByText(/^All \(\d+\)$/).waitFor({ timeout: 60_000 })
    const lib = page.getByRole('region', { name: 'Document Library' })
    const typeSel = lib.getByRole('combobox', { name: 'Filter by Document Type' })
    const values = (await typeSel.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value))).filter(v => v !== '')
    expect(values.length).toBeGreaterThan(0)
    const before = await lib.getByRole('row').count()
    await typeSel.selectOption(values[0] ?? '')
    const rows = lib.getByRole('row')
    const after = await rows.count()
    expect(after).toBeGreaterThan(1)
    expect(after).toBeLessThanOrEqual(before)
    for (const r of (await rows.allInnerTexts()).slice(1)) expect(r).toContain(values[0])
    await typeSel.selectOption('')
    for (const name of ['Filter by Unit', 'Filter by Equipment', 'Filter by Tag']) {
      expect(await lib.getByRole('combobox', { name }).count()).toBe(1)
    }
    await lib.getByRole('combobox', { name: 'Sort documents' }).selectOption('name')
    const names = await lib.locator('[role=row] [title]').evaluateAll(es => es.map(e => e.getAttribute('title') ?? ''))
    expect([...names].sort((a, c) => a.localeCompare(c))).toEqual(names)
    await page.screenshot({ path: join(SHOTS, 'live-documents-filters.png'), fullPage: true })
    expect((page as PageWithErrors).errors).toEqual([])
  }, 300_000)
})
