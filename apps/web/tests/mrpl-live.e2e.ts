// MRPL live end-to-end: real Chromium -> MRPL harness (real Documents screen and
// the composer's transcribe path) -> real hyperion-bridge (booted in-process with
// cordis Loader, exactly the plugin the host composes) -> LIVE services:
//   HYPERION_LIVE_RAG_URL  the Hyperion RAG service (hybrid BM25 + EmbeddingGemma 2 + rerank,
//                          OCR sidecar for scanned pages, gpt-oss answers)
//   HYPERION_LIVE_STT_URL  the asr-http STT sidecar (IndicConformer te/hi + Whisper en, auto-detect)
//   HYPERION_LIVE_UPLOAD   a PDF to upload (default: DOC-011, the scanned IOCL HSD spec)
//   HYPERION_LIVE_AUDIO_EN / _TE  16 kHz WAV clips fed to Chromium's fake microphone
// Skips (does not pass) when the live URLs are not set. Nothing is mocked.
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
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
const UPLOAD = process.env.HYPERION_LIVE_UPLOAD ?? ''
const AUDIO_EN = process.env.HYPERION_LIVE_AUDIO_EN ?? ''
const AUDIO_TE = process.env.HYPERION_LIVE_AUDIO_TE ?? ''
const AUDIO_HI = process.env.HYPERION_LIVE_AUDIO_HI ?? ''
const live = RAG !== '' && STT !== '' && existsSync(UPLOAD)

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

async function launch(audio?: string): Promise<Browser> {
  const executablePath = process.env.MRPL_CHROMIUM_PATH
  const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', ...(audio === undefined ? [] : [`--use-file-for-fake-audio-capture=${audio}`])]
  const b = await chromium.launch({ args, ...(executablePath === undefined ? {} : { executablePath }) })
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

describe.skipIf(!live)('MRPL live e2e (droplet services, nothing mocked)', () => {
  it('upload a scanned PDF -> OCR sidecar -> incremental index -> ask -> verified citation on the upload', async () => {
    const b = await launch()
    const page = await open(b, 'documents')
    await page.getByText(/^All \(\d+\)$/).waitFor({ timeout: 60_000 })
    // Live RAG health is visible through the ingest route the bridge serves.
    const ingest = await page.evaluate(async () => (await fetch('/hyperion/mrpl/ingest')).json()) as { rag: string; retrieval: string; degraded: string[]; embedModel: string }
    expect(ingest.rag).toBe('ready')
    expect(ingest.retrieval).toBe('hybrid_rerank')
    expect(ingest.degraded).toEqual([])
    expect(ingest.embedModel).toBe('google/embeddinggemma-2')

    // Unique file name per run so the job is a fresh incremental add.
    const stamp = Date.now().toString(36)
    const file = join(root, `E2E-${stamp}-${basename(UPLOAD)}`)
    await copyFile(UPLOAD, file)
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Upload Document' }).click()
    await (await chooser).setFiles(file)
    const panel = page.getByRole('region', { name: 'Upload and ask' })
    await panel.getByText(/chunks added to UPL-/).waitFor({ timeout: 600_000 })
    expect(await panel.getByText(/no full re-index/).count()).toBe(1)
    const stages = await panel.getByRole('list', { name: 'Ingest stages' }).innerText()
    expect(stages).toContain('OCR')
    await page.screenshot({ path: join(SHOTS, 'live-upload-indexed.png'), fullPage: true })

    await panel.getByRole('textbox', { name: 'Question' }).fill('Per IS 1460:2017 Table 1, what is the minimum flash point (Abel) in °C of automotive diesel fuel?')
    await panel.getByRole('button', { name: 'Ask' }).click()
    const answer = panel.getByLabel('Cited answer')
    await answer.waitFor({ timeout: 300_000 })
    const text = await answer.innerText()
    expect(text).toMatch(/\b35\b/)
    expect(text).toMatch(/\[\d+\] UPL-e2e-[a-z0-9]+-doc-011 p\.1/)
    expect(text).toContain('Verified')
    expect(text).toContain('Retrieval: hybrid_rerank')
    await page.screenshot({ path: join(SHOTS, 'live-upload-answer.png'), fullPage: true })
    expect((page as Page & { errors: string[] }).errors).toEqual([])
  }, 900_000)

  // Telugu is NOT in the auto list: Whisper language-ID labels code-mixed Telugu plant speech as Hindi
  // (measured 3/3 clips on the droplet), so Telugu users pick 'te' explicitly (test below).
  for (const [lang, audio, expectText] of [['en', AUDIO_EN, /101|1500|pressure/i], ['hi', AUDIO_HI, /12\.5|दबाव|बार/]] as const) {
    it.skipIf(!existsSync(audio))(`mic (${lang} clip, picker=auto) -> /hyperion/asr/transcribe -> live STT detects ${lang}`, async () => {
      const b = await launch(audio)
      const page = await open(b, 'mic')
      await page.getByRole('button', { name: 'Record' }).click()
      await page.getByText('recording').waitFor()
      await page.waitForTimeout(9_000)
      await page.getByRole('button', { name: 'Stop' }).click()
      await page.getByText('done').waitFor({ timeout: 120_000 })
      const result = JSON.parse(await page.getByLabel('Transcript').innerText()) as { status: number; text: string; language: string; model: string }
      await writeFile(join(SHOTS, `live-mic-${lang}.json`), JSON.stringify(result, null, 1))
      expect(result.status).toBe(200)
      expect(result.language).toBe(lang)
      expect(result.text).toMatch(expectText)
    }, 180_000)
  }

  it('mic with the picker forced to te sends ?language=te and the STT decodes Telugu', async () => {
    if (!existsSync(AUDIO_TE)) return
    const b = await launch(AUDIO_TE)
    const page = await open(b, 'mic')
    await page.getByLabel('Speech language').selectOption('te')
    const req = page.waitForRequest(r => r.url().includes('/hyperion/asr/transcribe'))
    await page.getByRole('button', { name: 'Record' }).click()
    await page.getByText('recording').waitFor()
    await page.waitForTimeout(6_000)
    await page.getByRole('button', { name: 'Stop' }).click()
    expect((await req).url()).toContain('/hyperion/asr/transcribe?language=te')
    await page.getByText('done').waitFor({ timeout: 120_000 })
    const result = JSON.parse(await page.getByLabel('Transcript').innerText()) as { status: number; language: string; text: string }
    await writeFile(join(SHOTS, 'live-mic-te-forced.json'), JSON.stringify(result, null, 1))
    expect(result.status).toBe(200)
    expect(result.language).toBe('te')
    expect(result.text).toMatch(/15\.2|ప్రెషర్|బార్/)
  }, 180_000)
  it('Mission view renders the recorded mission session: office canvas, replay controls, roadmap, theme tokens, no page errors', async () => {
    const b = await launch()
    for (const theme of ['light', 'dark'] as const) {
      const page = await open(b, `mission&theme=${theme}`)
      const view = page.locator('[data-mission-view]')
      await view.waitFor({ timeout: 60_000 })
      // The pixel office draws on a real canvas with a non-zero size.
      const box = await view.locator('canvas').first().boundingBox()
      expect(box?.width ?? 0).toBeGreaterThan(100)
      expect(box?.height ?? 0).toBeGreaterThan(100)
      // Lifecycle replay controls are live (derived from the recorded session, not a stub).
      const bar = page.getByTestId('lifecycle-replay-bar')
      expect(await bar.innerText()).toMatch(/[1-9]\d* agents/)
      await bar.getByRole('button', { name: /Live/ }).click()
      const position = page.getByLabel('Replay position')
      await position.waitFor()
      await page.getByRole('button', { name: 'Play', exact: true }).click()
      await expect.poll(async () => Number(await position.inputValue()), { timeout: 15_000 }).toBeGreaterThan(0)
      expect(await view.getByLabel('Simulation phase roadmap').count()).toBe(1)
      // Theme tokens: the Mission root carries a resolved background, not the old literal slate.
      const bg = await view.evaluate(el => getComputedStyle(el).backgroundColor)
      expect(bg).not.toBe('rgb(15, 23, 42)')
      await page.screenshot({ path: join(SHOTS, `live-mission-${theme}.png`), fullPage: true })
      expect((page as Page & { errors: string[] }).errors).toEqual([])
      await page.close()
    }
  }, 180_000)
})
