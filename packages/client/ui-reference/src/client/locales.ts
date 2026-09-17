/** `reference` namespace dictionaries for the unified `@` source. */

import type {} from '@deepseek-ai/dsh-client-ui-slots'

/** Dictionary namespace owned by this plugin. */
export const NS = 'reference'

/** The reference namespace key union. */
export type ReferenceKey = keyof typeof en

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The unified `@` reference menu's copy. */
    reference: ReferenceKey
  }
}

/** English dictionary (the key-set source of truth). */
export const en = {
  'section.files': 'Files & folders',
  'section.sessions': 'Sessions',
  'candidate.noCwd': '(no cwd)',
  'crumb.root': 'Workspace',
  'time.now': 'now',
  'time.minutes': '{n}min',
  'time.hours': '{n}h',
  'time.days': '{n}d',
  'time.months': '{n}mo',
  'time.years': '{n}y',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'section.files': 'फ़ाइलें व फ़ोल्डर',
  'section.sessions': 'सत्र',
  'candidate.noCwd': '(कार्य निर्देशिका नहीं)',
  'crumb.root': 'कार्यक्षेत्र',
  'time.now': 'अभी',
  'time.minutes': '{n}मि.',
  'time.hours': '{n}घं.',
  'time.days': '{n}दि.',
  'time.months': '{n}मा.',
  'time.years': '{n}व.',
}
