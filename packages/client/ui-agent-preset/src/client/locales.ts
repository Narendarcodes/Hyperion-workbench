/** Locale bundles for the agent-preset hero chip, header label, and management section. */

/** Locale keys these surfaces render. */
export type AgentPresetSettingsKey =
  | 'error' | 'userTrust' | 'agentPreset' | 'seatHint' | 'headerHint'
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
  agentPreset: 'Agent preset',
  seatHint: 'Agent preset for the session you are about to start',
  headerHint: 'Agent preset for this session; it cannot change after the session starts',
  nav: 'Agent presets',
  sectionIntro:
    'Agent presets control how Hyperion works on a task — including its tools, capabilities, and workflow behavior. '
    + 'Choose a preset for new sessions; a running session keeps the preset it started with.',
  builtIn: 'Built-in',
  setDefault: 'Make active',
  view: 'View configuration',
  presetStandardName: 'Standard mode',
  presetStandardDescription:
    'Full-featured agent with file editing, shell, file and web search, skills, planning, goals, subagents, and workflows.',
  presetPtcName: 'PTC mode',
  presetPtcDescription:
    'Full-featured agent for multi-step tool operations without the workflow layer.',
  presetMinimalName: 'Minimal mode',
  presetMinimalDescription:
    'Lightweight agent for focused tasks with a small two-tool set.',
  presetCordisName: 'Creator mode',
  presetCordisDescription:
    'Advanced preset for creating and testing custom agent configurations, with runtime inspection and authoring guidance.',
  duplicate: 'Duplicate preset',
  duplicateUnavailable: 'This deployment has no writable preset directory',
  delete: 'Delete',
  presetId: 'Identifier',
  presetIdPlaceholder: 'my-agent',
  displayName: 'Name',
  displayNamePlaceholder: 'Shown in the picker; defaults to the identifier',
  inUse: 'Active',
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
  agentPreset: 'एजेंट प्रीसेट',
  seatHint: 'जो सत्र आप आरंभ करने वाले हैं उसके लिए एजेंट प्रीसेट',
  headerHint: 'इस सत्र का एजेंट प्रीसेट; सत्र शुरू होने के बाद यह नहीं बदलता',
  nav: 'एजेंट प्रीसेट',
  sectionIntro:
    'एजेंट प्रीसेट तय करते हैं कि Hyperion किसी कार्य को कैसे करता है — उपकरण, क्षमताएँ और वर्कफ़्लो व्यवहार सहित। '
    + 'नए सत्रों के लिए प्रीसेट चुनें; चलता सत्र उसी प्रीसेट के साथ जारी रहता है जिससे शुरू हुआ था।',
  builtIn: 'अंतर्निर्मित',
  setDefault: 'सक्रिय बनाएँ',
  view: 'कॉन्फ़िगरेशन देखें',
  presetStandardName: 'मानक मोड',
  presetStandardDescription:
    'फ़ाइल संपादन, शेल, फ़ाइल और वेब खोज, कौशल, योजना, लक्ष्य, उप-एजेंट और वर्कफ़्लो सहित पूर्ण सुविधाओं वाला एजेंट।',
  presetPtcName: 'पीटीसी मोड',
  presetPtcDescription:
    'बहु-चरण टूल संचालन के लिए पूर्ण सुविधाओं वाला एजेंट, लेकिन वर्कफ़्लो परत के बिना।',
  presetMinimalName: 'न्यूनतम मोड',
  presetMinimalDescription:
    'केंद्रित कार्यों के लिए छोटे टूल-सेट वाला हल्का एजेंट।',
  presetCordisName: 'क्रिएटर मोड',
  presetCordisDescription:
    'कस्टम एजेंट कॉन्फ़िगरेशन बनाने और जाँचने के लिए उन्नत प्रीसेट, जिसमें रनटाइम निरीक्षण और लेखन-मार्गदर्शन शामिल है।',
  duplicate: 'प्रतिलिपि बनाएँ',
  duplicateUnavailable: 'इस परिनियोजन में कोई लेखन योग्य प्रीसेट निर्देशिका नहीं',
  delete: 'हटाएँ',
  presetId: 'पहचानकर्ता',
  presetIdPlaceholder: 'my-agent',
  displayName: 'नाम',
  displayNamePlaceholder: 'चयनकर्ता में दिखता है; डिफ़ॉल्ट पहचानकर्ता होता है',
  inUse: 'सक्रिय',
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
  agentPreset: 'ఏజెంట్ ప్రీసెట్',
  seatHint: 'మీరు ప్రారంభించబోయే సెషన్ కోసం ఏజెంట్ ప్రీసెట్',
  headerHint: 'ఈ సెషన్ ఏజెంట్ ప్రీసెట్; సెషన్ ప్రారంభం తర్వాత మారదు',
  nav: 'ఏజెంట్ ప్రీసెట్లు',
  sectionIntro:
    'ఏజెంట్ ప్రీసెట్లు పనిపై Hyperion ఎలా పనిచేస్తుందో నిర్ణయిస్తాయి — దాని సాధనాలు, సామర్థ్యాలు, వర్క్‌ఫ్లో ప్రవర్తనతో సహా. '
    + 'కొత్త సెషన్ల కోసం ఒక ప్రీసెట్ ఎంచుకోండి; పనిచేస్తున్న సెషన్ దాని ప్రారంభంలో ఉన్న ప్రీసెట్‌నే కొనసాగిస్తుంది.',
  builtIn: 'అంతర్నిర్మిత',
  setDefault: 'యాక్టివ్‌గా అమర్చండి',
  view: 'కాన్ఫిగరేషన్ చూడండి',
  presetStandardName: 'ప్రామాణిక మోడ్',
  presetStandardDescription:
    'ఫైల్ సవరణ, షెల్, ఫైల్ మరియు వెబ్ శోధన, నైపుణ్యాలు, ప్రణాళిక, లక్ష్యాలు, ఉప-ఏజెంట్లు మరియు వర్క్‌ఫ్లోలతో పూర్తి సామర్థ్యాల ఏజెంట్.',
  presetPtcName: 'పీటీసీ మోడ్',
  presetPtcDescription:
    'వర్క్‌ఫ్లో పొర లేకుండా బహుళ-దశల టూల్ కార్యకలాపాలకు పూర్తి సామర్థ్యాల ఏజెంట్.',
  presetMinimalName: 'కనిష్ఠ మోడ్',
  presetMinimalDescription:
    'ప్రతిపని పనుల కోసం చిన్న టూల్‌సెట్‌తో లైట్‌వెయిట్ ఏజెంట్.',
  presetCordisName: 'క్రియేటర్ మోడ్',
  presetCordisDescription:
    'కస్టమ్ ఏజెంట్ కాన్ఫిగరేషన్లను సృష్టించి పరీక్షించడానికి అడ్వాన్స్ ప్రీసెట్, రన్‌టైమ్ పరిశీలన మరియు రచన మార్గదర్శకంతో.',
  duplicate: 'నకలు సృష్టించండి',
  duplicateUnavailable: 'ఈ విస్తరణలో వ్రాయదగిన ప్రీసెట్ డైరెక్టరీ లేదు',
  delete: 'తొలగించండి',
  presetId: 'గుర్తింపు',
  presetIdPlaceholder: 'my-agent',
  displayName: 'పేరు',
  displayNamePlaceholder: 'ఎంపికలో చూపబడుతుంది; డిఫాల్ట్ గుర్తింపు అవుతుంది',
  inUse: 'యాక్టివ్',
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
