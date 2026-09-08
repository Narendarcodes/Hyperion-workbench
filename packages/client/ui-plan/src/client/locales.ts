/** `plan` namespace dictionaries (the composer plan chip's copy). */

/** The plan namespace key union. */
export type PlanKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  'chip.label': 'Plan',
  'chip.on.aria': 'Plan mode on, press to turn off',
  'chip.on.title': 'Plan mode on — click to turn off (/plan off)',
  'chip.off.aria': 'Plan mode off, press to turn on',
  'chip.off.title': 'Plan mode off — click to turn on (/plan)',
  'chip.exitFailed': 'Failed to exit plan mode',
}
