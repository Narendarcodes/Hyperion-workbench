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

/** Telugu copy. */
export const te: Record<AgentPresetSettingsKey, string> = {
  error: 'ఏజెంట్ ప్రీసెట్‌లను లోడ్ చేయలేకపోయింది.',
  userTrust: 'కస్టమ్',
  seatHint: 'మీరు ప్రారంభించబోయే సెషన్ కోసం ఏజెంట్ ప్రీసెట్',
  headerHint: 'ఈ సెషన్ నడుస్తున్న ఏజెంట్ ప్రీసెట్, ప్రారంభంలో స్థిరపరచబడింది',
  nav: 'ఏజెంట్ ప్రీసెట్లు',
  sectionIntro:
    'ప్రీసెట్ అంటే ఒక సెషన్ ఏజెంట్ నడిచే ప్లగిన్ కూర్పు — దాని సాధనాలు, ప్రాంప్ట్ మరియు సామర్థ్యాలు. '
    + 'ఉన్నదాన్ని నకలు చేసి మీదిగా చేసుకోండి, లేదా క్రియేటర్ మోడ్‌లో ఏజెంట్‌తో ముసాయిదా వేయించండి.',
  builtIn: 'అంతర్నిర్మిత',
  setDefault: 'డిఫాల్ట్‌గా అమర్చండి',
  view: 'చూడండి',
  presetStandardName: 'ప్రామాణిక మోడ్',
  presetStandardDescription:
    'ఫైల్ సవరణ, షెల్, ఫైల్ మరియు వెబ్ శోధన, నైపుణ్యాలు, ప్రణాళిక, లక్ష్యాలు, ఉప-ఏజెంట్లు మరియు వర్క్‌ఫ్లోలతో పూర్తి కోడింగ్ ఏజెంట్.',
  presetPtcName: 'పీటీసీ మోడ్',
  presetPtcDescription:
    'వర్క్‌ఫ్లో సాధనం లేని పూర్తి కోడింగ్ ఏజెంట్; మోడల్ ఒక టైప్‌స్క్రిప్ట్ ప్రోగ్రామ్‌లో బహుళ-దశల కార్యకలాపాలను కలపడానికి ఇతర సాధనాలు పీటీసీ మోడ్ SDK ద్వారా బహిర్గతమవుతాయి.',
  presetMinimalName: 'కనిష్ఠ మోడ్',
  presetMinimalDescription:
    'నిరంతర బాష్ మరియు str_replace_editor తో రెండు-సాధనాల కోడింగ్ ఏజెంట్.',
  presetCordisName: 'క్రియేటర్ మోడ్',
  presetCordisDescription:
    'కస్టమ్ ఏజెంట్ ప్రీసెట్‌లను సృష్టించడానికి నిర్మించబడింది, ప్రామాణిక మోడ్ సామర్థ్యాలన్నీతో పాటు రన్‌టైమ్ పరిశీలన, ప్లగిన్ ప్రయోగాలు మరియు ప్రీసెట్-రచన మార్గదర్శకం.',
  duplicate: 'నకలు సృష్టించండి',
  duplicateUnavailable: 'ఈ విస్తరణలో వ్రాయదగిన ప్రీసెట్ డైరెక్టరీ లేదు',
  delete: 'తొలగించండి',
  presetId: 'గుర్తింపు',
  presetIdPlaceholder: 'my-agent',
  displayName: 'పేరు',
  displayNamePlaceholder: 'ఎంపికలో చూపబడుతుంది; డిఫాల్ట్ గుర్తింపు అవుతుంది',
  inUse: 'వాడుకలో ఉంది',
  builtInGroup: 'అంతర్నిర్మిత',
  customGroup: 'కస్టమ్',
  noDescription: 'వివరణ లేదు.',
  brokenBadge: 'లోడ్ విఫలమైంది',
  brokenNoCopy: 'లోడ్ విఫలమైన ప్రీసెట్‌ను నకలు చేయలేము',
  switchRefused: '{name} కు మారలేకపోయింది: {reason}',
  copyOf: 'నకలు మూలం',
  composition: 'కూర్పు (agent.cordis.yml)',
  cancel: 'రద్దు చేయండి',
  close: 'మూసివేయండి',
  retry: 'మళ్లీ ప్రయత్నించండి',
  copyTitle: 'ప్రీసెట్‌ను నకలు చేయండి',
  copyIntro:
    'మొత్తం ప్రీసెట్ ఈ యంత్రంలో కాపీ అవుతుంది. గుర్తింపు దాని డైరెక్టరీ పేరు అవుతుంది మరియు తర్వాత '
    + 'మార్చలేము; మిగతాదంతా ప్రీసెట్ స్వంత ఫైళ్లలో సవరించబడుతుంది.',
  create: 'సృష్టించండి',
  creating: 'సృష్టించబడుతోంది…',
  creatorDraft: 'క్రియేటర్ మోడ్‌తో కస్టమ్ ప్రీసెట్ ముసాయిదా వేయండి',
  openLocation: 'ఫోల్డర్ తెరవండి',
  showLocation: 'స్థానాన్ని చూపండి',
  revealedPathLabel: 'ప్రీసెట్ ఫైళ్లు:',
  idRequired: 'ప్రీసెట్‌కు గుర్తింపు ఇవ్వండి.',
  idInvalid: 'లోయర్‌కేస్ అక్షరాలు, అంకెలు మరియు హైఫెన్‌లు వాడండి, అక్షరం లేదా అంకెతో ప్రారంభించండి.',
  idTaken: 'ఈ గుర్తింపుతో ప్రీసెట్ ఇప్పటికే ఉంది.',
  deleteTitle: 'ఈ ప్రీసెట్‌ను తొలగించాలా?',
  deleteDescription:
    'ప్రీసెట్ డైరెక్టరీ తొలగించబడుతుంది. దానిపై నడుస్తున్న సెషన్లు పనిచేస్తూనే ఉంటాయి; కొత్త సెషన్లు దీన్ని ఎంచుకోలేవు.',
  deleteConfirm: 'తొలగించండి',
  deleting: 'తొలగించబడుతోంది…',
}

// The resolution itself is the shared fold in `dsh-agent-presets/display`,
// re-exported here so every surface in this plugin reads one path; the
// Settings plugin list inlines the same fold over this plugin's dictionaries.
export { presetDisplayText } from '@deepseek-ai/dsh-agent-presets/display'
export type { PresetDisplaySource, PresetDisplayText } from '@deepseek-ai/dsh-agent-presets/display'
