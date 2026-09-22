/** Shell chrome and General-nav dictionaries; feature rows own their copy. */

/** The settings namespace key union. */
export type SettingsKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  'trigger': 'Settings',
  'title': 'Settings',
  'close': 'Close',
  'openDocument': 'Open configuration file',
  'openDocument.error': 'Could not open configuration file',
  'general.nav': 'General',
  'connection.error': 'Disconnected',
  'connection.retry': 'Reconnect now',
  'connection.connecting': 'Reconnecting',
  'connection.connected': 'Connected',
  'connection.reconnect': 'Disconnected, reconnect now',
  'connection.restart': 'Reconnecting automatically, reconnect now',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'trigger': 'सेटिंग्स',
  'title': 'सेटिंग्स',
  'close': 'बंद करें',
  'openDocument': 'कॉन्फ़िगरेशन फ़ाइल खोलें',
  'openDocument.error': 'कॉन्फ़िगरेशन फ़ाइल खुल नहीं सकी',
  'general.nav': 'सामान्य',
  'connection.error': 'विच्छेदित',
  'connection.retry': 'अभी पुनः संयोजित करें',
  'connection.connecting': 'पुनः संयोजन हो रहा है',
  'connection.connected': 'संयोजित',
  'connection.reconnect': 'विच्छेदित, अभी पुनः संयोजित करें',
  'connection.restart': 'स्वतः पुनः संयोजन हो रहा है, अभी पुनः संयोजित करें',
}

/** Telugu dictionary (mirrors the en key set). */
export const te = {
  'trigger': 'సెట్టింగ్‌లు',
  'title': 'సెట్టింగ్‌లు',
  'close': 'మూసివేయండి',
  'openDocument': 'కాన్ఫిగరేషన్ ఫైల్‌ను తెరవండి',
  'openDocument.error': 'కాన్ఫిగరేషన్ ఫైల్ తెరవలేకపోయింది',
  'general.nav': 'సాధారణ',
  'connection.error': 'డిస్‌కనెక్ట్ అయ్యింది',
  'connection.retry': 'ఇప్పుడు మళ్లీ కనెక్ట్ చేయండి',
  'connection.connecting': 'మళ్లీ కనెక్ట్ అవుతోంది',
  'connection.connected': 'కనెక్ట్ అయ్యింది',
  'connection.reconnect': 'డిస్‌కనెక్ట్ అయ్యింది, ఇప్పుడు మళ్లీ కనెక్ట్ చేయండి',
  'connection.restart': 'స్వయంచాలకంగా మళ్లీ కనెక్ట్ అవుతోంది, ఇప్పుడు మళ్లీ కనెక్ట్ చేయండి',
}
