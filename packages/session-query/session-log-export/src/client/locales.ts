/** Locale namespace owned by Session export browser feedback. */
export const NS = 'session-log-download'


/** English Session export strings. */
export const en = {
  'header.action': 'Session log',
  'dialog.preparingTitle': 'Exporting Session',
  'dialog.preparingDescription': 'Preparing a ZIP containing this Session, its sub-Sessions, and attachments.',
  'dialog.successTitle': 'Session download started',
  'dialog.successDescription': 'The browser is downloading the Session ZIP.',
  'dialog.errorTitle': 'Session export failed',
  'dialog.close': 'Close',
  'dialog.commandFailed': 'Could not start the Session export.',
}

/** Hindi Session export strings. */
export const hi = {
  'header.action': 'सत्र लॉग',
  'dialog.preparingTitle': 'सत्र निर्यात हो रहा है',
  'dialog.preparingDescription': 'इस सत्र, उसके उप-सत्रों और अनुलग्नकों वाली ज़िप तैयार हो रही है।',
  'dialog.successTitle': 'सत्र डाउनलोड आरंभ हुआ',
  'dialog.successDescription': 'ब्राउज़र सत्र ज़िप डाउनलोड कर रहा है।',
  'dialog.errorTitle': 'सत्र निर्यात विफल रहा',
  'dialog.close': 'बंद करें',
  'dialog.commandFailed': 'सत्र निर्यात आरंभ नहीं हो सका।',
}

/** Telugu Session export strings. */
export const te = {
  'header.action': 'సెషన్ లాగ్',
  'dialog.preparingTitle': 'సెషన్ ఎగుమతి అవుతోంది',
  'dialog.preparingDescription': 'ఈ సెషన్, దాని ఉప-సెషన్లు మరియు జోడింపులతో జిప్ సిద్ధం అవుతోంది.',
  'dialog.successTitle': 'సెషన్ డౌన్‌లోడ్ ప్రారంభమైంది',
  'dialog.successDescription': 'బ్రౌజర్ సెషన్ జిప్‌ను డౌన్‌లోడ్ చేస్తోంది.',
  'dialog.errorTitle': 'సెషన్ ఎగుమతి విఫలమైంది',
  'dialog.close': 'మూసివేయండి',
  'dialog.commandFailed': 'సెషన్ ఎగుమతి ప్రారంభించలేకపోయింది.',
}

/** Stable locale keys consumed by the shared modal. */
export type SessionLogDownloadKey = keyof typeof en
