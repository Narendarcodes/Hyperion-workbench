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

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'chip.label': 'योजना',
  'chip.on.aria': 'योजना मोड चालू, बंद हेतु दबाएँ',
  'chip.on.title': 'योजना मोड चालू — बंद हेतु क्लिक करें (/plan off)',
  'chip.off.aria': 'योजना मोड बंद, चालू हेतु दबाएँ',
  'chip.off.title': 'योजना मोड बंद — चालू हेतु क्लिक करें (/plan)',
  'chip.exitFailed': 'योजना मोड से निकलना विफल रहा',
}

/** Telugu dictionary (mirrors the en key set). */
export const te = {
  'chip.label': 'ప్రణాళిక',
  'chip.on.aria': 'ప్రణాళిక మోడ్ ఆన్‌లో ఉంది, ఆఫ్ చేయడానికి నొక్కండి',
  'chip.on.title': 'ప్రణాళిక మోడ్ ఆన్‌లో ఉంది — ఆఫ్ చేయడానికి క్లిక్ చేయండి (/plan off)',
  'chip.off.aria': 'ప్రణాళిక మోడ్ ఆఫ్‌లో ఉంది, ఆన్ చేయడానికి నొక్కండి',
  'chip.off.title': 'ప్రణాళిక మోడ్ ఆఫ్‌లో ఉంది — ఆన్ చేయడానికి క్లిక్ చేయండి (/plan)',
  'chip.exitFailed': 'ప్రణాళిక మోడ్ నుండి నిష్క్రమించడం విఫలమైంది',
}
