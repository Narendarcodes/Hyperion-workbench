/** `sidebar` namespace dictionaries: shell controls (brand row, New Session, fold toggle). */

/** The sidebar namespace key union. */
export type SidebarKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  'brand.home': 'Go to Home',
  'brand.tagline': 'Industrial Engineering Workbench',
  'session.new': 'New work',
  'session.new.label': 'Start new work',
  'toggle.open': 'Open sidebar',
  'toggle.collapse': 'Collapse sidebar',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'brand.home': 'होम पर जाएँ',
  'brand.tagline': 'औद्योगिक इंजीनियरिंग वर्कबेंच',
  'session.new': 'नया कार्य',
  'session.new.label': 'नया कार्य शुरू करें',
  'toggle.open': 'साइडबार खोलें',
  'toggle.collapse': 'साइडबार समेटें',
}

/** Telugu dictionary (mirrors the en key set). */
export const te = {
  'brand.home': 'హోమ్‌కు వెళ్లండి',
  'brand.tagline': 'పారిశ్రామిక ఇంజనీరింగ్ వర్క్‌బెంచ్',
  'session.new': 'కొత్త పని',
  'session.new.label': 'కొత్త పనిని ప్రారంభించండి',
  'toggle.open': 'సైడ్‌బార్ తెరవండి',
  'toggle.collapse': 'సైడ్‌బార్ కుదించండి',
}
