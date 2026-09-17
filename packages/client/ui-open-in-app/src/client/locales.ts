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

/** Key domain of the `open-in-app` namespace. */
export type OpenInAppKey = keyof typeof en
