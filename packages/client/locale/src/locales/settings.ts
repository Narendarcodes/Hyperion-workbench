/** `settings.locale` namespace dictionaries (the Language row's copy). */

/** English dictionary (the key-set source of truth). */
export const en = {
  'language.title': 'Language',
}

/** Hindi dictionary. */
export const hi = {
  'language.title': 'भाषा',
}

/** The settings.locale namespace key union. */
export type SettingsLocaleKey = keyof typeof en
