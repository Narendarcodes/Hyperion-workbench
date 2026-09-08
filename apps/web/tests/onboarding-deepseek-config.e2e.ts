// Keyless browser e2e: the shipped DeepSeek adapter stays mounted while its
// credential is absent, both ordered steps share the shipped modal chrome,
// and the inline key write lands in an isolated harness home without a reload
// or model call.
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  acknowledgeReloadConnectionLoss, assertFixtureInventory, captureStableAria, compareOrRefreshGolden,
  launchWebScaffold, watchConsole, webSnapshotMode, type WebScaffold,
  WELCOME_NOTICE_ACK_FIELD, WELCOME_NOTICE_COPY, WELCOME_NOTICE_SETTINGS_NAMESPACE,
  WELCOME_NOTICE_VERSION,
} from './scaffold.ts'
import { EN_BROWSER_LOCALE, connectFreshWorkspace, saveFailureShot } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('./expected/onboarding-deepseek-config', import.meta.url))
const WELCOME_EXPECTED = join(SNAPSHOT_DIR, 'welcome.expected.md')
const MISSING_EXPECTED = join(SNAPSHOT_DIR, 'missing.expected.md')
const MODELS_EXPECTED = join(SNAPSHOT_DIR, 'models.expected.md')
/** Drops the sovereign local route so no provider is usable and the credential step renders. */
const OVERLAY = fileURLToPath(new URL('./onboarding-no-local.overlay.yml', import.meta.url))
const MODE = webSnapshotMode()

describe.skipIf(MODE === 'record')('web e2e: first-run DeepSeek credential setup', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>
  const browserConsole: string[] = []

  beforeAll(async () => {
    scaffold = await launchWebScaffold({ deepSeekMissingCredential: true, welcomeNoticePending: true, extraOverlayPath: OVERLAY })
    browser = await chromium.launch()
    // The scenario asserts the shipped English copy, so the browser asks for it.
    page = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: EN_BROWSER_LOCALE })
    tripwire = watchConsole(page)
    page.on('console', message => browserConsole.push(message.text()))
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('stores a key write-only and observes configured state without restarting', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-onboarding-deepseek-config'))
    const welcome = page.getByRole('dialog', { name: WELCOME_NOTICE_COPY.en.title })
    await welcome.waitFor({ timeout: 15_000 })
    expect(await page.locator('#root').evaluate(root => (root as HTMLElement).inert)).toBe(true)
    for (const paragraph of WELCOME_NOTICE_COPY.en.body.split('\n\n')) {
      expect(await welcome.getByText(paragraph, { exact: true }).count()).toBe(1)
    }
    expect(await welcome.getByRole('button').allTextContents()).toEqual([
      WELCOME_NOTICE_COPY.en.continueLabel,
    ])
    const welcomeAria = await captureStableAria(page, '[role="dialog"]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(WELCOME_EXPECTED, welcomeAria, MODE)

    // Observation is not acknowledgement: the exact version is persisted
    // only by the explicit action, so a reload still presents this dialog.
    const firstReloadWarnings = tripwire.warnings.length
    await page.reload({ waitUntil: 'load' })
    acknowledgeReloadConnectionLoss(tripwire, firstReloadWarnings)
    await welcome.waitFor({ timeout: 15_000 })

    await welcome.getByRole('button', { name: WELCOME_NOTICE_COPY.en.continueLabel }).click()
    await welcome.waitFor({ state: 'detached', timeout: 15_000 })

    const credentialStep = page.getByRole('dialog', { name: 'Connect a model to get started' })
    await credentialStep.waitFor({ timeout: 15_000 })
    const keyInput = credentialStep.getByLabel('API key', { exact: true })
    await keyInput.waitFor({ timeout: 10_000 })
    const initial = await captureStableAria(page, '[role="dialog"]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(MISSING_EXPECTED, initial, MODE)

    const secret = `dsh_onboarding_${randomBytes(12).toString('hex')}`
    await keyInput.fill(secret)
    await credentialStep.getByRole('button', { name: 'Save and continue' }).click()
    await credentialStep.waitFor({ state: 'detached', timeout: 15_000 })
    expect(await page.locator('#root').evaluate(root => (root as HTMLElement).inert)).toBe(false)

    const stored = await readFile(join(scaffold.harnessHome, '.credentials.yaml'), 'utf8')
    expect(stored.includes(`DEEPSEEK_API_KEY: ${secret}`)).toBe(true)
    expect((await page.content()).includes(secret)).toBe(false)
    expect((await page.locator('body').ariaSnapshot()).includes(secret)).toBe(false)
    expect(browserConsole.some(line => line.includes(secret))).toBe(false)

    const acknowledgedSettings = await readFile(join(scaffold.harnessHome, 'settings.yaml'), 'utf8')
    expect(acknowledgedSettings).toContain(`${WELCOME_NOTICE_ACK_FIELD}: ${WELCOME_NOTICE_VERSION}`)

    // The ordinary Models surface reuses the refreshed join and exposes the
    // configured write-only placeholder without a reload.
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await settings.waitFor({ timeout: 10_000 })
    await settings.getByRole('button', { name: 'Models' }).click()
    const deepSeekRow = settings.getByText('External API', { exact: true }).first()
    await deepSeekRow.waitFor({ timeout: 10_000 })
    await deepSeekRow.locator('xpath=ancestor::li').getByRole('button', { name: 'Edit' }).click()
    const configuredInput = settings.getByLabel('API key', { exact: true })
    await configuredInput.waitFor({ timeout: 10_000 })
    await expect.poll(
      () => configuredInput.getAttribute('placeholder'),
      { timeout: 10_000 },
    ).toBe('Configured — enter a new value to replace')

    const secondReloadWarnings = tripwire.warnings.length
    await page.reload({ waitUntil: 'load' })
    acknowledgeReloadConnectionLoss(tripwire, secondReloadWarnings)
    await page.waitForSelector('[class*="frame"]', { timeout: 15_000 })
    expect(await page.getByRole('dialog', { name: WELCOME_NOTICE_COPY.en.title }).count()).toBe(0)
    expect(await page.getByRole('dialog', { name: 'Connect a model to get started' }).count()).toBe(0)

    // An old acknowledgement means materially revised copy: welcome returns,
    // while the already-configured provider step remains complete.
    await scaffold.ctx.settings.mutate(WELCOME_NOTICE_SETTINGS_NAMESPACE, [{
      op: 'set', path: [WELCOME_NOTICE_ACK_FIELD], value: 'previous-copy-version',
    }])
    const thirdReloadWarnings = tripwire.warnings.length
    await page.reload({ waitUntil: 'load' })
    acknowledgeReloadConnectionLoss(tripwire, thirdReloadWarnings)
    await welcome.waitFor({ timeout: 15_000 })
    await welcome.getByRole('button', { name: WELCOME_NOTICE_COPY.en.continueLabel }).click()
    await welcome.waitFor({ state: 'detached', timeout: 15_000 })
    expect(await page.getByRole('dialog', { name: 'Connect a model to get started' }).count()).toBe(0)

    expect((await page.content()).includes(secret)).toBe(false)
    expect((await page.locator('body').ariaSnapshot()).includes(secret)).toBe(false)
    expect(browserConsole.some(line => line.includes(secret))).toBe(false)
    expect(tripwire.warnings).toEqual([])
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('never paints the takeover chrome on a configured reload, even with the settings join held open', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-onboarding-configured-reload'))
    // Regression pin for the reload flash: both steps are satisfied, yet each
    // must load private facts before deciding not to show. Dialog chrome lives
    // inside each visible branch, so the deciding window paints and blocks
    // nothing. Holding settings/describe widens that window from loopback
    // RTT scale to a deterministic hundreds of milliseconds, removing all
    // timing dependence from the sampler assertions below.
    //
    // The sampler init script persists across this shared page's later
    // navigations (init scripts re-run per navigation); that stays harmless
    // because no later scenario in this file legitimately shows the
    // takeover, and only this test reads __takeoverSightings.
    await page.addInitScript(() => {
      const sightings: string[] = []
      ;(window as unknown as { __takeoverSightings: string[] }).__takeoverSightings = sightings
      setInterval(() => {
        if (document.querySelector(
          '[role="dialog"][aria-label="Developer Preview Notice"], '
          + '[role="dialog"][aria-label="Connect a model to get started"]',
        ) !== null) {
          sightings.push('chrome')
        }
        if (document.getElementById('root')?.inert === true) sightings.push('inert')
      }, 8)
    })
    // EVERY settings/describe issued before the release is held — not just
    // the first — so the pin cannot silently collapse back to loopback
    // timing if a second boot-time consumer of the join ever appears.
    let released = false
    const heldRoutes: Array<() => void> = []
    const releaseDescribe = (): void => {
      released = true
      for (const resolve of heldRoutes.splice(0)) resolve()
    }
    await page.route('**/api/settings/describe', async (route) => {
      if (!released) await new Promise<void>((resolve) => { heldRoutes.push(resolve) })
      await route.continue()
    })
    const warningsBefore = tripwire.warnings.length
    await page.reload({ waitUntil: 'commit' })
    await page.waitForSelector('[class*="frame"]', { timeout: 15_000 })
    // The app is painted and interactive while the steps are still deciding.
    await page.waitForTimeout(600)
    releaseDescribe()
    await page.waitForTimeout(400)
    await page.unroute('**/api/settings/describe')
    acknowledgeReloadConnectionLoss(tripwire, warningsBefore)
    expect(await page.evaluate(() =>
      (window as unknown as { __takeoverSightings: string[] }).__takeoverSightings)).toEqual([])
    expect(await page.getByRole('dialog', { name: WELCOME_NOTICE_COPY.en.title }).count()).toBe(0)
    expect(await page.getByRole('dialog', { name: 'Connect a model to get started' }).count()).toBe(0)
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('configures arbitrary DeepSeek models and prompts after the selected model is removed', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-onboarding-deepseek-models'))
    // Opened here rather than inherited: the credential test reloads the page
    // after configuring the key, so nothing carries an open dialog across.
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await settings.waitFor({ timeout: 10_000 })
    await settings.getByRole('button', { name: 'Models' }).click()
    const deepSeek = settings.getByText('External API', { exact: true }).first()
    await deepSeek.waitFor({ timeout: 10_000 })
    await deepSeek.locator('xpath=ancestor::li').getByRole('button', { name: 'Edit' }).click()
    await settings.getByText('Customized settings').click()
    await settings.getByRole('button', { name: /Delete model/ }).first().click()
    await settings.getByRole('button', { name: 'Add model' }).click()
    const customModelId = settings.getByLabel('Model ID 3')
    await customModelId.fill('private-preview')
    await settings.getByLabel('Display name 3').fill('Private Preview')
    // Capacities live behind the row's own disclosure, as in the pi-ai form.
    await settings.getByRole('button', { name: 'Capacities 3' }).click()
    await settings.getByLabel('Context window 3').fill('131072')
    await settings.getByLabel('Max output tokens 3').fill('64K')

    const modelEditor = await captureStableAria(page, '[role="dialog"]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(MODELS_EXPECTED, modelEditor, MODE)
    await settings.getByRole('button', { name: 'Apply', exact: true }).click()
    await customModelId.waitFor({ state: 'detached', timeout: 15_000 })

    const document = await readFile(join(scaffold.harnessHome, 'settings.yaml'), 'utf8')
    expect(document).toContain('id: deepseek-v4-pro')
    expect(document).toContain('id: deepseek-v4-flash-vision-exp')
    expect(document).toContain('inputModalities:')
    expect(document).toContain('- image')
    expect(document).toContain('id: private-preview')
    expect(document).toContain('name: Private Preview')
    expect(document).toContain('contextWindow: 131072')
    expect(document).toContain('maxTokens: 64000')
    expect(document).not.toMatch(/^\s*- id: deepseek-v4-flash$/m)

    await page.keyboard.press('Escape')
    // A connected Workspace is what puts a live composer — and its model
    // trigger — on the page; the scaffold boots without one.
    await connectFreshWorkspace(page, scaffold.workspaceCwd, 'model-fallback-e2e')

    const modelTrigger = page.getByRole('button', { name: /^Select model/ })
    await modelTrigger.waitFor({ timeout: 10_000 })
    await modelTrigger.click()
    await page.getByRole('menuitem', { name: /Model/ }).click()
    expect(await page.getByText('deepseek-v4-flash', { exact: true }).count()).toBe(0)
    await page.getByRole('menuitemradio', { name: 'External Flash Vision' }).waitFor({ timeout: 10_000 })
    await page.getByRole('menuitemradio', { name: 'Private Preview' }).waitFor({ timeout: 10_000 })
    expect(tripwire.warnings).toEqual([])
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('keeps the fixture inventory closed', async () => {
    await assertFixtureInventory(
      SNAPSHOT_DIR,
      ['welcome.expected.md', 'missing.expected.md', 'models.expected.md'],
    )
  })
})
