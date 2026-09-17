/** `command` namespace dictionaries (the popupSelect shell's copy). */

/** The command namespace key union. */
export type CommandKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  'search.placeholder': 'Search…',
  'search.aria': 'Filter options',
  'status.loading': 'Loading options…',
  'status.applying': 'Applying…',
  'status.empty': 'No options',
  'overlay.aria': '/{command} options',
  'listbox.aria': '/{command} matches',
  'notice.attachmentsUnsupported': '/{command} does not accept attachments; remove them first',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'search.placeholder': 'खोजें…',
  'search.aria': 'विकल्प छाँटें',
  'status.loading': 'विकल्प लोड हो रहे हैं…',
  'status.applying': 'लागू हो रहा है…',
  'status.empty': 'कोई विकल्प नहीं',
  'overlay.aria': '/{command} विकल्प',
  'listbox.aria': '/{command} मिलान',
  'notice.attachmentsUnsupported': '/{command} अनुलग्नक स्वीकार नहीं करता; पहले उन्हें हटाएँ',
}

/** Telugu dictionary (mirrors the en key set). */
export const te = {
  'search.placeholder': 'వెతకండి…',
  'search.aria': 'ఎంపికలను వడపోయండి',
  'status.loading': 'ఎంపికలు లోడ్ అవుతున్నాయి…',
  'status.applying': 'వర్తింపజేయబడుతోంది…',
  'status.empty': 'ఎంపికలు లేవు',
  'overlay.aria': '/{command} ఎంపికలు',
  'listbox.aria': '/{command} సరిపోలికలు',
  'notice.attachmentsUnsupported': '/{command} జోడింపులను అంగీకరించదు; ముందు వాటిని తొలగించండి',
}
