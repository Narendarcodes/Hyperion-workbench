// Keyless browser e2e: a user who configures some OTHER provider is not asked
// for the official DeepSeek key again, and the first-run setup card is a card
// they can close. The shipped DeepSeek adapter stays mounted without a
// credential throughout, so the only thing that ends onboarding here is the
// pi-ai route the user configures through the real wire. Zero model calls:
// configuration is pure settings/credentials/llm-domain traffic.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  acknowledgeReloadConnectionLoss, assertFixtureInventory, captureStableAria, compareOrRefreshGolden,
  launchWebScaffold, watchConsole, webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { EN_BROWSER_LOCALE, saveFailureShot } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('./expected/onboarding-usable-provider', import.meta.url))
const DISMISSED_EXPECTED = join(SNAPSHOT_DIR, 'dismissed.expected.md')
const MODE = webSnapshotMode()
/** Drops the sovereign local route so the first-run step renders until another provider is configured. */
const OVERLAY = fileURLToPath(new URL('./onboarding-no-local.overlay.yml', import.meta.url))
const CREDENTIAL_STEP = 'Connect a model to get started'

describe.skipIf(MODE === 'record')('web e2e: another usable provider ends first-run onboarding', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold({ deepSeekMissingCredential: true, extraOverlayPath: OVERLAY })
    browser = await chromium.launch()
    // The scenario asserts the shipped English copy, so the browser asks for it.
    page = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: EN_BROWSER_LOCALE })
    tripwire = watchConsole(page)
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('closes the setup card without discarding the add card beside it', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-onboarding-setup-card-cancel'))
    const credentialStep = page.getByRole('dialog', { name: CREDENTIAL_STEP })
    await credentialStep.waitFor({ timeout: 15_000 })
    await credentialStep.getByRole('button', { name: 'Configure later' }).click()
    await credentialStep.waitFor({ state: 'detached', timeout: 15_000 })

    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await settings.waitFor({ timeout: 10_000 })
    // Dismissing the onboarding step leaves Settings closed, so enter the
    // Models section explicitly before exercising its normal cards.
    await settings.getByRole('button', { name: 'Models' }).click()
    const setupKey = settings.getByRole('textbox', { name: 'API key', exact: true })
    await setupKey.waitFor({ timeout: 10_000 })

    const add = settings.getByRole('button', { name: 'Add provider' })
    await expect.poll(async () => add.isEnabled(), { timeout: 10_000 }).toBe(true)
    await add.click()
    const pick = settings.getByLabel('Provider')
    await pick.waitFor({ timeout: 10_000 })
    await pick.selectOption('minimax-cn')
    await expect.poll(
      async () => settings.getByRole('textbox', { name: 'API key', exact: true }).count(),
      { timeout: 10_000 },
    ).toBe(2)

    // Cancelling the setup card must not close the independent add-provider
    // draft beside it.
    await settings.getByRole('button', { name: 'Cancel', exact: true }).first().click()
    expect(await settings.getByLabel('Provider').count()).toBe(1)
    await expect.poll(
      async () => settings.getByRole('textbox', { name: 'API key', exact: true }).count(),
      { timeout: 10_000 },
    ).toBe(1)
    await settings.getByRole('button', { name: 'Edit External API (deepseek-official)' }).waitFor({ timeout: 10_000 })
    const dismissed = await captureStableAria(page, '[role="dialog"]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(DISMISSED_EXPECTED, dismissed, MODE)

    expect(tripwire.warnings).toEqual([])
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('stops prompting for the external route once the other provider can serve requests', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-onboarding-other-provider'))
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await settings.getByRole('textbox', { name: 'API key', exact: true }).fill('sk-e2e-minimax')
    await settings.getByRole('button', { name: 'Apply', exact: true }).click()
    await settings.getByText('Saved minimax-cn.', { exact: true }).waitFor({ timeout: 15_000 })

    // Only minimax-cn is reachable; the external route still holds no credential.
    const document = await readFile(join(scaffold.harnessHome, 'settings.yaml'), 'utf8')
    expect(document).toContain('apiKeyEnv: MINIMAX_CN_API_KEY')
    const credentials = await readFile(join(scaffold.harnessHome, '.credentials.yaml'), 'utf8')
    expect(credentials).toContain('MINIMAX_CN_API_KEY: sk-e2e-minimax')
    expect(credentials).not.toContain('DEEPSEEK_API_KEY')

    const warningsBefore = tripwire.warnings.length
    await page.reload({ waitUntil: 'load' })
    acknowledgeReloadConnectionLoss(tripwire, warningsBefore)
    await page.waitForSelector('[class*="frame"]', { timeout: 15_000 })
    // The regression: the step read only the official route's credential, so a
    // fully configured user was taken over on every blank session.
    await expect.poll(
      async () => page.getByRole('dialog', { name: CREDENTIAL_STEP }).count(),
      { timeout: 10_000 },
    ).toBe(0)
    expect(await page.locator('#root').evaluate(root => (root as HTMLElement).inert)).toBe(false)

    // The Models page agrees: the external route stays a row rather than reopening its
    // setup card over a user who already has somewhere to send a request.
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await settings.waitFor({ timeout: 10_000 })
    await settings.getByRole('button', { name: 'Models' }).click()
    await settings.getByRole('button', { name: 'Edit External API (deepseek-official)' }).waitFor({ timeout: 10_000 })
    expect(await settings.getByRole('textbox', { name: 'API key', exact: true }).count()).toBe(0)

    expect((await page.content()).includes('sk-e2e-minimax')).toBe(false)
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('keeps the fixture inventory closed', async () => {
    await assertFixtureInventory(SNAPSHOT_DIR, ['dismissed.expected.md'])
  })
})
