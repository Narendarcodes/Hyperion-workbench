/**
 * Browser half of the browse directory-picker backend: fills ui-workspace's
 * two directory-flow holes with the in-app Select Workspace Directory dialog
 * (figma `Harness` 813-23126 family), driving the node half's
 * `directoryPicker/list`/`directoryPicker/createDirectory` primitives.
 * Mounting this package therefore composes both sides of the browse
 * interaction with one cordis.yml row; no client code branches on a
 * capability kind. The dialog's copy is locale-registered here — the flow
 * package owns its own strings.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the SlotMap merge declaring the directory-flow holes.
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { BrowseFlowInjected } from './flow.ts'
import { BrowseDirectoryFlow } from './flow.ts'

/** Locale namespace owning the browser dialog's copy. */
const LOCALE_NS = 'directory-browser'

/** Required services (cordis fiber inject): the slot registry, workspace UI service, and locale. */
export const inject = ['slots', 'uiWorkspace', 'locale']

/**
 * Client plugin body: register the dialog's dictionaries and the browse flow
 * into both directory-flow holes through `slots.inject()` because the
 * ui-workspace entries may activate later or replace their declarations.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const disposers: (() => void)[] = []
    const dictionaries: [locale: string, dict: Record<string, string>][] = [
      ['en', {
        'browser.title': 'Select Workspace Directory',
        'browser.home': 'Home',
        'browser.newFolder': 'New folder',
        'browser.folderName': 'Folder name',
        'browser.createIn': 'New folder in "{name}"',
        'browser.untitledFolder': 'Untitled folder',
        'browser.create': 'Create',
        'browser.cancel': 'Cancel',
        'browser.open': 'Open',
        'browser.editPath': 'Edit path',
        'browser.loading': 'Loading…',
        'browser.truncated': 'Too many folders to list; only the beginning is shown.',
        'browser.showHidden': 'Show hidden files',
      }],
      ['hi', {
        'browser.title': 'कार्यक्षेत्र निर्देशिका चुनें',
        'browser.home': 'होम',
        'browser.newFolder': 'नया फ़ोल्डर',
        'browser.folderName': 'फ़ोल्डर नाम',
        'browser.createIn': '"{name}" में नया फ़ोल्डर',
        'browser.untitledFolder': 'शीर्षकहीन फ़ोल्डर',
        'browser.create': 'बनाएँ',
        'browser.cancel': 'रद्द करें',
        'browser.open': 'खोलें',
        'browser.editPath': 'पथ संपादित करें',
        'browser.loading': 'लोड हो रहा है…',
        'browser.truncated': 'सूचीबद्ध करने हेतु बहुत अधिक फ़ोल्डर; केवल आरंभ दिख रहा है।',
        'browser.showHidden': 'छिपी फ़ाइलें दिखाएँ',
      }],
      ['te', {
        'browser.title': 'వర్క్‌స్పేస్ డైరెక్టరీని ఎంచుకోండి',
        'browser.home': 'హోమ్',
        'browser.newFolder': 'కొత్త ఫోల్డర్',
        'browser.folderName': 'ఫోల్డర్ పేరు',
        'browser.createIn': '"{name}" లో కొత్త ఫోల్డర్',
        'browser.untitledFolder': 'పేరు లేని ఫోల్డర్',
        'browser.create': 'సృష్టించండి',
        'browser.cancel': 'రద్దు చేయండి',
        'browser.open': 'తెరవండి',
        'browser.editPath': 'పాత్‌ను సవరించండి',
        'browser.loading': 'లోడ్ అవుతోంది…',
        'browser.truncated': 'జాబితా చేయడానికి చాలా ఎక్కువ ఫోల్డర్లు; ప్రారంభం మాత్రమే చూపబడుతోంది.',
        'browser.showHidden': 'దాచిన ఫైళ్లను చూపండి',
      }],
    ]
    try {
      for (const [locale, dict] of dictionaries) disposers.push(ctx.locale.register(LOCALE_NS, locale, dict))
    } catch (error) {
      for (const dispose of disposers.reverse()) dispose()
      throw error
    }
    return () => { for (const dispose of disposers) dispose() }
  }, 'directory-picker-browse: dialog dictionaries')

  const injected = (): BrowseFlowInjected => ({
    listDirectory: (path, signal) => ctx.uiWorkspace.listDirectory(path, signal),
    createDirectory: (path, name) => ctx.uiWorkspace.createDirectory(path, name),
    t: ctx.locale.bind(LOCALE_NS),
  })
  // Both declaration lifetimes must be live before the pair installs; the
  // generator makes the two registrations one transactional effect. The
  // outer/inner nesting order is arbitrary; neither hole has precedence.
  ctx.slots.inject('conversation.hero.workspace.directoryFlow', () =>
    ctx.slots.inject('sidebar.workspaces.directoryFlow', function* () {
      yield ctx.slots.register({
        name: 'conversation.hero.workspace.directoryFlow', inject: injected,
      }, BrowseDirectoryFlow)
      yield ctx.slots.register({
        name: 'sidebar.workspaces.directoryFlow', inject: injected,
      }, BrowseDirectoryFlow)
    }))
}
