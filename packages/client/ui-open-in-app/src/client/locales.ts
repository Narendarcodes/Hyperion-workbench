/** `open-in-app` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'open-in-app'

/** Application labels shared verbatim (product names). */
const PRODUCT_NAMES = {
  'app.cursor': 'Cursor',
  'app.vscode': 'VS Code',
  'app.vscodeinsiders': 'VS Code Insiders',
  'app.windsurf': 'Windsurf',
  'app.zed': 'Zed',
  'app.sublimetext': 'Sublime Text',
  'app.xcode': 'Xcode',
  'app.androidstudio': 'Android Studio',
  'app.intellij': 'IntelliJ IDEA',
  'app.pycharm': 'PyCharm',
  'app.webstorm': 'WebStorm',
  'app.phpstorm': 'PhpStorm',
  'app.goland': 'GoLand',
  'app.rider': 'Rider',
  'app.rustrover': 'RustRover',
  'app.fork': 'Fork',
  'app.sourcetree': 'Sourcetree',
  'app.github': 'GitHub Desktop',
  'app.tower': 'Tower',
  'app.gitkraken': 'GitKraken',
  'app.smartgit': 'SmartGit',
  'app.sublimemerge': 'Sublime Merge',
  'app.ghostty': 'Ghostty',
  'app.warp': 'Warp',
  'app.iterm': 'iTerm2',
  'app.kitty': 'kitty',
  'app.windowsterminal': 'Windows Terminal',
  'app.gitbash': 'Git Bash',
  'app.gnometerminal': 'GNOME Terminal',
  'app.konsole': 'Konsole',
} as const

/** Hindi application labels (transliterated product names). */
const PRODUCT_NAMES_HI = {
  'app.cursor': 'कर्सर',
  'app.vscode': 'वीएस कोड',
  'app.vscodeinsiders': 'वीएस कोड इनसाइडर्स',
  'app.windsurf': 'विंडसर्फ',
  'app.zed': 'ज़ेड',
  'app.sublimetext': 'सब्लाइम टेक्स्ट',
  'app.xcode': 'एक्सकोड',
  'app.androidstudio': 'एंड्रॉयड स्टूडियो',
  'app.intellij': 'इंटेलिजे आइडिया',
  'app.pycharm': 'पायचार्म',
  'app.webstorm': 'वेबस्टॉर्म',
  'app.phpstorm': 'पीएचपीस्टॉर्म',
  'app.goland': 'गोलैंड',
  'app.rider': 'राइडर',
  'app.rustrover': 'रस्टरोवर',
  'app.fork': 'फोर्क',
  'app.sourcetree': 'सोर्सट्री',
  'app.github': 'गिटहब डेस्कटॉप',
  'app.tower': 'टावर',
  'app.gitkraken': 'गिटक्राकेन',
  'app.smartgit': 'स्मार्टगिट',
  'app.sublimemerge': 'सब्लाइम मर्ज',
  'app.ghostty': 'घोस्टी',
  'app.warp': 'वार्प',
  'app.iterm': 'आईटर्म2',
  'app.kitty': 'किटी',
  'app.windowsterminal': 'विंडोज़ टर्मिनल',
  'app.gitbash': 'गिट बैश',
  'app.gnometerminal': 'ग्नोम टर्मिनल',
  'app.konsole': 'कंसोल',
} as const

/** Telugu application labels (transliterated product names). */
const PRODUCT_NAMES_TE = {
  'app.cursor': 'కర్సర్',
  'app.vscode': 'వీఎస్ కోడ్',
  'app.vscodeinsiders': 'వీఎస్ కోడ్ ఇన్‌సైడర్లు',
  'app.windsurf': 'విండ్‌సర్ఫ్',
  'app.zed': 'జెడ్',
  'app.sublimetext': 'సబ్లైమ్ టెక్స్ట్',
  'app.xcode': 'ఎక్స్‌కోడ్',
  'app.androidstudio': 'ఆండ్రాయిడ్ స్టూడియో',
  'app.intellij': 'ఇంటెలిజె ఐడియా',
  'app.pycharm': 'పైచార్మ్',
  'app.webstorm': 'వెబ్‌స్టార్మ్',
  'app.phpstorm': 'పీహెచ్‌పీస్టార్మ్',
  'app.goland': 'గోలాండ్',
  'app.rider': 'రైడర్',
  'app.rustrover': 'రస్ట్‌రోవర్',
  'app.fork': 'ఫోర్క్',
  'app.sourcetree': 'సోర్స్‌ట్రీ',
  'app.github': 'గిట్‌హబ్ డెస్క్‌టాప్',
  'app.tower': 'టవర్',
  'app.gitkraken': 'గిట్‌క్రాకెన్',
  'app.smartgit': 'స్మార్ట్‌గిట్',
  'app.sublimemerge': 'సబ్లైమ్ మెర్జ్',
  'app.ghostty': 'ఘోస్టీ',
  'app.warp': 'వార్ప్',
  'app.iterm': 'ఐటర్మ్2',
  'app.kitty': 'కిట్టీ',
  'app.windowsterminal': 'విండోస్ టెర్మినల్',
  'app.gitbash': 'గిట్ బాష్',
  'app.gnometerminal': 'గ్నోమ్ టెర్మినల్',
  'app.konsole': 'కన్సోల్',
} as const

/** English dictionary (the key-set source of truth). */
export const en = {
  'open.title': 'Open workspace in {app}',
  'open.tooltip': 'Open locally',
  'open.error': 'Failed to open',
  'menu.toggle': 'Choose an app to open in',
  'menu.aria': 'Open in',
  ...PRODUCT_NAMES,
  'app.finder': 'Finder',
  'app.explorer': 'File Explorer',
  'app.filemanager': 'Files',
  'app.terminal': 'Terminal',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'open.title': '{app} में कार्यक्षेत्र खोलें',
  'open.tooltip': 'स्थानीय खोलें',
  'open.error': 'खोलना विफल रहा',
  'menu.toggle': 'खोलने हेतु ऐप चुनें',
  'menu.aria': 'में खोलें',
  ...PRODUCT_NAMES_HI,
  'app.finder': 'फाइंडर',
  'app.explorer': 'फ़ाइल एक्सप्लोरर',
  'app.filemanager': 'फ़ाइलें',
  'app.terminal': 'टरमिनल',
}

/** Telugu dictionary (mirrors the en key set). */
export const te = {
  'open.title': '{app} లో వర్క్‌స్పేస్‌ను తెరవండి',
  'open.tooltip': 'స్థానికంగా తెరవండి',
  'open.error': 'తెరవడం విఫలమైంది',
  'menu.toggle': 'తెరవడానికి యాప్‌ను ఎంచుకోండి',
  'menu.aria': 'లో తెరవండి',
  ...PRODUCT_NAMES_TE,
  'app.finder': 'ఫైండర్',
  'app.explorer': 'ఫైల్ ఎక్స్‌ప్లోరర్',
  'app.filemanager': 'ఫైళ్లు',
  'app.terminal': 'టెర్మినల్',
}

/** Key domain of the `open-in-app` namespace. */
export type OpenInAppKey = keyof typeof en
