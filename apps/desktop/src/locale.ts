/** Typed English copy owned by the Electron shell. */
export const en = {
  application: 'Application',
  startupFailed: 'HYPERION could not start',
  pluginsMenu: 'Desktop Plugins…',
  pluginsMenuPackagedOnly: 'Desktop Plugins… (available in packaged applications)',
  checkUpdatesMenu: 'Check for Updates…',
  updateCheckFailedTitle: 'Update Check Failed',
  unknownError: 'Unknown error',
  updateCheckTitle: 'Check for Updates',
  updateCurrent: 'You already have the latest version.',
  updateTitle: 'HYPERION Update',
  updateAvailable: 'An update is available',
  updateDetail: 'HYPERION {version}\n\nThis release includes its matching dsh version. The application will restart after installation.',
  installAndRestart: 'Install and Restart',
  later: 'Later',
  updateFailedTitle: 'Update Failed',
  pluginManagerTitle: 'Desktop Plugins',
  pluginWindowTitle: 'HYPERION — Desktop Plugins',
  pluginManagerDescription: 'Plugins are installed only in the Desktop node_modules and are managed by the bundled pnpm.',
  refresh: 'Refresh',
  npmPackage: 'npm package',
  install: 'Install',
  installed: 'Installed',
  noPlugins: 'No Desktop plugins are installed.',
  remove: 'Remove',
  update: 'Update',
  targetVersion: 'Enter the target version for {name}',
  removing: 'Removing {name}…',
  updating: 'Updating {name}…',
  installing: 'Installing {spec}…',
  operationComplete: 'Done. The Desktop backend has restarted.',
  refreshing: 'Refreshing…',
  refreshed: 'Plugin list refreshed.',
  loadingPlugins: 'Reading Desktop plugins…',
} as const

/** The Desktop locale supplies the complete English key set. */
export type DesktopMessages = { readonly [Key in keyof typeof en]: string }

/** Locale payload exposed to the Desktop-owned renderer. */
export interface DesktopLocale {
  readonly id: 'en'
  readonly messages: DesktopMessages
}

/** Resolve Electron's locale to the shipped Desktop dictionary (English-only). */
export function resolveDesktopLocale(_locale: string): DesktopLocale {
  return { id: 'en', messages: en }
}

/** Replace named placeholders in one locale-owned message. */
export function formatDesktopMessage(
  message: string,
  values: Readonly<Record<string, string>>,
): string {
  return message.replaceAll(/\{([^{}]+)\}/gu, (placeholder, key: string) => values[key] ?? placeholder)
}
