/** `goal` namespace dictionaries. */

/** The goal namespace key union. */
export type GoalKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  'phase.active': 'Ongoing Goal',
  'phase.paused': 'Paused Goal',
  'phase.blocked': 'Blocked Goal',
  'objective.aria': 'Goal objective',
  'commandInput.aria': 'Command input',
  'action.save': 'Save goal',
  'action.cancel': 'Cancel edit',
  'action.pause': 'Pause goal',
  'action.resume': 'Resume goal',
  'action.edit': 'Edit goal',
  'action.clear': 'Clear goal',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'phase.active': 'जारी लक्ष्य',
  'phase.paused': 'रोका गया लक्ष्य',
  'phase.blocked': 'अवरुद्ध लक्ष्य',
  'objective.aria': 'लक्ष्य उद्देश्य',
  'commandInput.aria': 'आदेश इनपुट',
  'action.save': 'लक्ष्य सहेजें',
  'action.cancel': 'संपादन रद्द करें',
  'action.pause': 'लक्ष्य रोकें',
  'action.resume': 'लक्ष्य पुनः आरंभ करें',
  'action.edit': 'लक्ष्य संपादित करें',
  'action.clear': 'लक्ष्य साफ़ करें',
}
