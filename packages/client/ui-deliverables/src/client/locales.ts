/** `deliverables` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'deliverables'

/** English dictionary (the key-set source of truth). */
export const en = {
  'produced.label': 'Produced',
  'produced.moreOne': '+ 1 file',
  'produced.more': '+ {count} files',
  'produced.open': 'Open {name}',
  'produced.showInFolder': 'Show in folder',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'produced.label': 'निर्मित',
  'produced.moreOne': '+ 1 फ़ाइल',
  'produced.more': '+ {count} फ़ाइलें',
  'produced.open': '{name} खोलें',
  'produced.showInFolder': 'फ़ोल्डर में दिखाएँ',
}

/** Union of this namespace's dictionary keys. */
export type DeliverablesKey = keyof typeof en
