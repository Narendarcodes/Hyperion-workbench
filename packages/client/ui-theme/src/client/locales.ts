/** `settings.theme` namespace dictionaries (the Appearance and font-size rows' copy). */

/** The settings.theme namespace key union. */
export type ThemeKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  'appearance.title': 'Appearance',
  'appearance.light': 'Light',
  'appearance.dark': 'Dark',
  'appearance.system': 'System',
  'fontSize.title': 'Font size',
  'fontSize.description': 'Only affects conversation content',
  'fontSize.unit': 'px',
  'fontSize.increase': 'Increase font size',
  'fontSize.decrease': 'Decrease font size',
}
