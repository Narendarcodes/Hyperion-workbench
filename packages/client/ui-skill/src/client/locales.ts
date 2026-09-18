/** `skill` namespace dictionaries for the dedicated tool row. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'skill'

/** The skill namespace key union. */
export type SkillKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  'row.title': 'Skill',
  'row.running': 'Loading skill',
  'row.failed': 'Skill load failed',
  'row.stopped': 'Skill load stopped',
  'row.instructions': 'Instructions',
  'row.inspect': 'Inspect',
  'menu.userOnly': 'user-only',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'row.title': 'कौशल',
  'row.running': 'कौशल लोड हो रहा है',
  'row.failed': 'कौशल लोड विफल रहा',
  'row.stopped': 'कौशल लोड रुक गया',
  'row.instructions': 'निर्देश',
  'row.inspect': 'निरीक्षण करें',
  'menu.userOnly': 'केवल-उपयोगकर्ता',
}

/** Telugu dictionary (mirrors the en key set). */
export const te = {
  'row.title': 'నైపుణ్యం',
  'row.running': 'నైపుణ్యం లోడ్ అవుతోంది',
  'row.failed': 'నైపుణ్యం లోడ్ విఫలమైంది',
  'row.stopped': 'నైపుణ్యం లోడ్ ఆగిపోయింది',
  'row.instructions': 'సూచనలు',
  'row.inspect': 'పరిశీలించండి',
  'menu.userOnly': 'వినియోగదారునికి-మాత్రమే',
}
