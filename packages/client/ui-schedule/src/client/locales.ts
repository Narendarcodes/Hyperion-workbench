/** `schedule.catalog` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'schedule.catalog'

/** English dictionary (the key-set source of truth). */
export const en = {
  'trigger.one': '{count} reminder',
  'trigger.other': '{count} reminders',
  'list.aria': 'Active reminders',
  'status.scheduled': 'Scheduled',
  'status.overdue': 'Overdue',
  'frequency.once': 'Once',
  'frequency.every': 'Every {value} {unit}',
  'unit.day.one': 'day',
  'unit.day.other': 'days',
  'unit.hour.one': 'hour',
  'unit.hour.other': 'hours',
  'unit.minute.one': 'minute',
  'unit.minute.other': 'minutes',
  'unit.second.one': 'second',
  'unit.second.other': 'seconds',
  'relative.now': 'Due now',
  'relative.future': 'in {value} {unit}',
  'relative.overdue': '{value} {unit} overdue',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'trigger.one': '{count} अनुस्मारक',
  'trigger.other': '{count} अनुस्मारक',
  'list.aria': 'सक्रिय अनुस्मारक',
  'status.scheduled': 'निर्धारित',
  'status.overdue': 'विलंबित',
  'frequency.once': 'एक बार',
  'frequency.every': 'प्रत्येक {value} {unit}',
  'unit.day.one': 'दिन',
  'unit.day.other': 'दिन',
  'unit.hour.one': 'घंटा',
  'unit.hour.other': 'घंटे',
  'unit.minute.one': 'मिनट',
  'unit.minute.other': 'मिनट',
  'unit.second.one': 'सेकंड',
  'unit.second.other': 'सेकंड',
  'relative.now': 'अभी देय',
  'relative.future': '{value} {unit} में',
  'relative.overdue': '{value} {unit} विलंबित',
}

/** Key domain of the Schedule catalog namespace. */
export type ScheduleCatalogKey = keyof typeof en
