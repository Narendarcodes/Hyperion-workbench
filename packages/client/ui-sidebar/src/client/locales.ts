/** `sidebar` namespace dictionaries: shell controls (brand row, New Session, fold toggle). */

/** The sidebar namespace key union. */
export type SidebarKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  'session.new': 'New Session',
  'session.new.label': 'New session',
  'toggle.open': 'Open sidebar',
  'toggle.collapse': 'Collapse sidebar',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'session.new': 'नया सत्र',
  'session.new.label': 'नया सत्र',
  'toggle.open': 'साइडबार खोलें',
  'toggle.collapse': 'साइडबार समेटें',
}

/** Telugu dictionary (mirrors the en key set). */
export const te = {
  'session.new': 'కొత్త సెషన్',
  'session.new.label': 'కొత్త సెషన్',
  'toggle.open': 'సైడ్‌బార్ తెరవండి',
  'toggle.collapse': 'సైడ్‌బార్ కుదించండి',
}
