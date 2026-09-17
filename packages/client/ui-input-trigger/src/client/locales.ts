/**
 * `slash.menu` namespace dictionaries: group titles keyed by source name
 * (the lookup chain returns the key itself, so an unknown source shows its
 * raw name), the pending row, and the listbox and header aria labels.
 */

/** The slash.menu namespace key union. */
export type MenuKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  'command': 'Commands',
  'skill': 'Skills',
  'subagent': 'Subagents',
  'loading': 'Loading…',
  'drill.aria': 'Browse folder',
  'drill.hint': 'Browse folder',
  'drill.key': 'Tab',
  'crumbs.aria': 'Folder navigation',
  'suggestions.aria': 'Trigger suggestions',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'command': 'आदेश',
  'skill': 'कौशल',
  'subagent': 'उप-एजेंट',
  'loading': 'लोड हो रहा है…',
  'drill.aria': 'फ़ोल्डर ब्राउज़ करें',
  'drill.hint': 'फ़ोल्डर ब्राउज़ करें',
  'drill.key': 'Tab',
  'crumbs.aria': 'फ़ोल्डर नेविगेशन',
  'suggestions.aria': 'ट्रिगर सुझाव',
}
