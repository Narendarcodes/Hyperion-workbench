/** `settings.theme` namespace dictionaries (the Appearance and font-size rows' copy). */

/** The settings.theme namespace key union. */
export type ThemeKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  'appearance.title': 'Appearance',
  'appearance.light': 'Light',
  'appearance.dark': 'Dark',
  'appearance.system': 'System',
  'fontSize.title': 'Font size',
  'fontSize.description': 'Only affects conversation content',
  'fontSize.unit': 'px',
  'fontSize.increase': 'Increase font size',
  'fontSize.decrease': 'Decrease font size',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'appearance.title': 'रूप',
  'appearance.light': 'हल्का',
  'appearance.dark': 'गहरा',
  'appearance.system': 'सिस्टम',
  'fontSize.title': 'फ़ॉन्ट आकार',
  'fontSize.description': 'केवल वार्तालाप सामग्री को प्रभावित करता है',
  'fontSize.unit': 'px',
  'fontSize.increase': 'फ़ॉन्ट आकार बढ़ाएँ',
  'fontSize.decrease': 'फ़ॉन्ट आकार घटाएँ',
}

/** Telugu dictionary (mirrors the en key set). */
export const te = {
  'appearance.title': 'రూపం',
  'appearance.light': 'వెలుగు',
  'appearance.dark': 'చీకటి',
  'appearance.system': 'సిస్టమ్',
  'fontSize.title': 'ఫాంట్ పరిమాణం',
  'fontSize.description': 'సంభాషణ విషయాన్ని మాత్రమే ప్రభావితం చేస్తుంది',
  'fontSize.unit': 'px',
  'fontSize.increase': 'ఫాంట్ పరిమాణాన్ని పెంచండి',
  'fontSize.decrease': 'ఫాంట్ పరిమాణాన్ని తగ్గించండి',
}
