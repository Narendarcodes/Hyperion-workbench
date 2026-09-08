/** Copy dictionaries for the plugin inventory Settings section. */

/** Plugin inventory locale key union. */
export type PluginInventoryLocaleKey = keyof typeof en

/** English dictionary checked against the Chinese key set. */
export const en = {
  tab: 'Plugin list',
  loading: 'Reading plugins…',
  error: 'Plugins are temporarily unavailable.',
  retry: 'Retry',
  search: 'Search plugins',
  empty: 'No plugins are available.',
  emptySearch: 'No matching plugins.',
  presetTitle: 'Session plugins',
  presetSubtitle: 'Composed per session by agent presets',
  countUnit: 'plugins',
  switcherLabel: 'Choose the agent preset to inspect',
  presetOptionDefault: '{name} (default)',
  presetOptionBroken: '{name} (failed to load)',
  globalTitle: 'Global plugins',
  globalSubtitle: 'Shared by the system and every session',
  presetProvidedDetail: 'Disabled globally; agent presets provide it per session',
  enabledIn: 'Enabled in',
  viewInPreset: 'View in the preset group',
  matchesInOtherPresets: '{count} more matches in other presets: ',
  failedCountLabel: 'failed',
  enabledTag: 'Enabled',
  disabledTag: 'Disabled',
  conditionalTag: 'Conditional',
  presetEnabledTag: 'Enabled via presets',
  failedTag: 'Failed',
  moduleLabel: 'Module',
  fromPreset: 'From',
  condition: 'Disabled when',
  configuration: 'Configuration',
  runtime: 'Status',
  unobserved: 'Not running',
  pending: 'Waiting for dependencies',
  loadingPhase: 'Loading',
  active: 'Running',
  failed: 'Failed to start',
  unloading: 'Unloading',
}
