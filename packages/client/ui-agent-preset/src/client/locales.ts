/** Locale bundles for the agent-preset hero chip, header label, and management section. */

/** Locale keys these surfaces render. */
export type AgentPresetSettingsKey =
  | 'error' | 'userTrust' | 'seatHint' | 'headerHint'
  | 'nav' | 'sectionIntro' | 'builtIn' | 'setDefault' | 'view'
  | 'presetStandardName' | 'presetStandardDescription'
  | 'presetPtcName' | 'presetPtcDescription'
  | 'presetMinimalName' | 'presetMinimalDescription'
  | 'presetCordisName' | 'presetCordisDescription'
  | 'duplicate' | 'duplicateUnavailable' | 'delete' | 'presetId' | 'presetIdPlaceholder' | 'copyOf'
  | 'displayName' | 'displayNamePlaceholder'
  | 'inUse' | 'noDescription' | 'builtInGroup' | 'customGroup'
  | 'brokenBadge' | 'brokenNoCopy' | 'switchRefused'
  | 'composition' | 'cancel' | 'close' | 'retry'
  | 'copyTitle' | 'copyIntro' | 'create' | 'creating' | 'creatorDraft'
  | 'openLocation' | 'showLocation' | 'revealedPathLabel'
  | 'idRequired' | 'idInvalid' | 'idTaken'
  | 'deleteTitle' | 'deleteDescription' | 'deleteConfirm' | 'deleting'

/** English copy. */
export const en: Record<AgentPresetSettingsKey, string> = {
  error: 'Could not load agent presets.',
  userTrust: 'Custom',
  seatHint: 'Agent preset for the session you are about to start',
  headerHint: 'The agent preset this session runs, fixed when it started',
  nav: 'Agent presets',
  sectionIntro:
    'A preset is the plugin composition one session\'s agent runs — its tools, prompt, and capabilities. '
    + 'Duplicate an existing one and make it yours, or let the agent draft one for you in Creator mode.',
  builtIn: 'Built-in',
  setDefault: 'Set as default',
  view: 'View',
  presetStandardName: 'Standard mode',
  presetStandardDescription:
    'Full coding agent with file editing, shell, file and web search, skills, planning, goals, subagents, and workflows.',
  presetPtcName: 'PTC mode',
  presetPtcDescription:
    'Full coding agent without the workflow tool; other tools are exposed through the PTC mode SDK so the model can combine multi-step operations in one TypeScript program.',
  presetMinimalName: 'Minimal mode',
  presetMinimalDescription:
    'Two-tool coding agent with persistent bash and str_replace_editor.',
  presetCordisName: 'Creator mode',
  presetCordisDescription:
    'Built for creating custom agent presets, with all Standard mode capabilities plus runtime inspection, plugin experiments, and preset-authoring guidance.',
  duplicate: 'Duplicate',
  duplicateUnavailable: 'This deployment has no writable preset directory',
  delete: 'Delete',
  presetId: 'Identifier',
  presetIdPlaceholder: 'my-agent',
  displayName: 'Name',
  displayNamePlaceholder: 'Shown in the picker; defaults to the identifier',
  inUse: 'In use',
  builtInGroup: 'Built-in',
  customGroup: 'Custom',
  noDescription: 'No description.',
  brokenBadge: 'Failed to load',
  brokenNoCopy: 'A preset that failed to load cannot be duplicated',
  switchRefused: 'Could not switch to {name}: {reason}',
  copyOf: 'Copied from',
  composition: 'Composition (agent.cordis.yml)',
  cancel: 'Cancel',
  close: 'Close',
  retry: 'Retry',
  copyTitle: 'Duplicate preset',
  copyIntro:
    'The whole preset is copied on this machine. The identifier becomes its directory name and cannot '
    + 'be changed later; everything else is edited in the preset\'s own files.',
  create: 'Create',
  creating: 'Creating…',
  creatorDraft: 'Draft a custom preset with Creator mode',
  openLocation: 'Open folder',
  showLocation: 'Show location',
  revealedPathLabel: 'Preset files:',
  idRequired: 'Give the preset an identifier.',
  idInvalid: 'Use lowercase letters, digits, and hyphens, starting with a letter or digit.',
  idTaken: 'A preset with this identifier already exists.',
  deleteTitle: 'Delete this preset?',
  deleteDescription:
    'The preset directory is deleted. Sessions already running on it keep working; new sessions cannot select it.',
  deleteConfirm: 'Delete',
  deleting: 'Deleting…',
}

/** Hindi copy. */
export const hi: Record<AgentPresetSettingsKey, string> = {
  error: 'एजेंट प्रीसेट लोड नहीं हो सके।',
  userTrust: 'कस्टम',
  seatHint: 'जो सत्र आप आरंभ करने वाले हैं उसके लिए एजेंट प्रीसेट',
  headerHint: 'वह एजेंट प्रीसेट जिस पर यह सत्र चलता है, आरंभ पर स्थिर',
  nav: 'एजेंट प्रीसेट',
  sectionIntro:
    'प्रीसेट वह प्लगिन संयोजन है जिस पर एक सत्र का एजेंट चलता है — उसके उपकरण, प्रॉम्प्ट और क्षमताएँ। '
    + 'मौजूदा प्रीसेट की प्रतिलिपि बनाकर उसे अपना बनाएँ, या क्रिएटर मोड में एजेंट से मसौदा बनवाएँ।',
  builtIn: 'अंतर्निर्मित',
  setDefault: 'डिफ़ॉल्ट बनाएँ',
  view: 'देखें',
  presetStandardName: 'मानक मोड',
  presetStandardDescription:
    'फ़ाइल संपादन, शेल, फ़ाइल व वेब खोज, कौशल, योजना, लक्ष्य, उप-एजेंट और वर्कफ़्लो सहित पूर्ण कोडिंग एजेंट।',
  presetPtcName: 'पीटीसी मोड',
  presetPtcDescription:
    'वर्कफ़्लो उपकरण रहित पूर्ण कोडिंग एजेंट; अन्य उपकरण पीटीसी मोड एसडीके से उजागर होते हैं ताकि मॉडल एक टाइपस्क्रिप्ट प्रोग्राम में बहु-चरण संचालन जोड़ सके।',
  presetMinimalName: 'न्यूनतम मोड',
  presetMinimalDescription:
    'स्थायी बैश और str_replace_editor सहित दो-उपकरण कोडिंग एजेंट।',
  presetCordisName: 'क्रिएटर मोड',
  presetCordisDescription:
    'कस्टम एजेंट प्रीसेट बनाने हेतु निर्मित, मानक मोड की सभी क्षमताओं सहित रनटाइम निरीक्षण, प्लगिन प्रयोग और प्रीसेट-लेखन मार्गदर्शन।',
  duplicate: 'प्रतिलिपि बनाएँ',
  duplicateUnavailable: 'इस परिनियोजन में कोई लेखन योग्य प्रीसेट निर्देशिका नहीं',
  delete: 'हटाएँ',
  presetId: 'पहचानकर्ता',
  presetIdPlaceholder: 'my-agent',
  displayName: 'नाम',
  displayNamePlaceholder: 'चयनकर्ता में दिखता है; डिफ़ॉल्ट पहचानकर्ता होता है',
  inUse: 'प्रयोग में',
  builtInGroup: 'अंतर्निर्मित',
  customGroup: 'कस्टम',
  noDescription: 'कोई विवरण नहीं।',
  brokenBadge: 'लोड विफल रहा',
  brokenNoCopy: 'लोड विफल प्रीसेट की प्रतिलिपि नहीं बन सकती',
  switchRefused: '{name} पर नहीं बदला जा सका: {reason}',
  copyOf: 'प्रतिलिपि स्रोत',
  composition: 'संयोजन (agent.cordis.yml)',
  cancel: 'रद्द करें',
  close: 'बंद करें',
  retry: 'पुनः प्रयास करें',
  copyTitle: 'प्रीसेट की प्रतिलिपि बनाएँ',
  copyIntro:
    'पूरा प्रीसेट इस मशीन पर कॉपी होता है। पहचानकर्ता उसकी निर्देशिका का नाम बनता है और बाद में '
    + 'बदला नहीं जा सकता; शेष सब प्रीसेट की अपनी फ़ाइलों में संपादित होता है।',
  create: 'बनाएँ',
  creating: 'बनाया जा रहा है…',
  creatorDraft: 'क्रिएटर मोड से कस्टम प्रीसेट का मसौदा बनाएँ',
  openLocation: 'फ़ोल्डर खोलें',
  showLocation: 'स्थान दिखाएँ',
  revealedPathLabel: 'प्रीसेट फ़ाइलें:',
  idRequired: 'प्रीसेट को पहचानकर्ता दें।',
  idInvalid: 'लोअरकेस अक्षर, अंक और हाइफ़न प्रयोग करें, अक्षर या अंक से आरंभ।',
  idTaken: 'इस पहचानकर्ता वाला प्रीसेट पहले से है।',
  deleteTitle: 'यह प्रीसेट हटाएँ?',
  deleteDescription:
    'प्रीसेट निर्देशिका हट जाती है। इस पर चल रहे सत्र कार्य करते रहते हैं; नए सत्र इसे चुन नहीं सकते।',
  deleteConfirm: 'हटाएँ',
  deleting: 'हटाया जा रहा है…',
}

// The resolution itself is the shared fold in `dsh-agent-presets/display`,
// re-exported here so every surface in this plugin reads one path; the
// Settings plugin list inlines the same fold over this plugin's dictionaries.
export { presetDisplayText } from '@deepseek-ai/dsh-agent-presets/display'
export type { PresetDisplaySource, PresetDisplayText } from '@deepseek-ai/dsh-agent-presets/display'
