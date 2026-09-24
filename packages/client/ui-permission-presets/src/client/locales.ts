/** `settings.permission` namespace dictionaries (the Permission row's copy). */

/** The settings.permission namespace key union. */
export type PermissionSettingsKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  'title': 'Permission',
  'description': 'Choose the default permission mode for new sessions',
  'loading': 'Loading',
  'unavailable': 'Unavailable',
  'preset.readOnly': 'Read Only',
  'preset.workspaceWrite': 'Workspace Write',
  'preset.fullAccess': 'Full access',
  'confirm.title': 'Enable Full access?',
  'confirm.description': 'Full access lets new sessions reduce confirmation steps and perform more actions directly, including sensitive operations, file changes, or external commands. Only use it when you trust subsequent tasks.',
  'confirm.acknowledge': 'I understand the risks and want to continue',
  'confirm.cancel': 'Cancel',
  'confirm.enable': 'Enable Full access',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'title': 'अनुमति',
  'description': 'नए सत्रों हेतु डिफ़ॉल्ट अनुमति मोड चुनें',
  'loading': 'लोड हो रहा है',
  'unavailable': 'अनुपलब्ध',
  'preset.readOnly': 'केवल पठन',
  'preset.workspaceWrite': 'कार्यक्षेत्र लेखन',
  'preset.fullAccess': 'पूर्ण एक्सेस',
  'confirm.title': 'पूर्ण एक्सेस सक्षम करें?',
  'confirm.description': 'पूर्ण एक्सेस नए सत्रों को पुष्टि चरण घटाने और संवेदनशील संचालन, फ़ाइल परिवर्तन या बाह्य आदेशों सहित अधिक कार्य सीधे करने देता है। इसका उपयोग तभी करें जब आप आगामी कार्यों पर भरोसा करते हों।',
  'confirm.acknowledge': 'मैं जोखिम समझता हूँ और आगे बढ़ना चाहता हूँ',
  'confirm.cancel': 'रद्द करें',
  'confirm.enable': 'पूर्ण एक्सेस सक्षम करें',
}

/** Telugu dictionary (mirrors the en key set). */
export const te = {
  'title': 'అనుమతి',
  'description': 'కొత్త సెషన్ల కోసం డిఫాల్ట్ అనుమతి మోడ్‌ను ఎంచుకోండి',
  'loading': 'లోడ్ అవుతోంది',
  'unavailable': 'అందుబాటులో లేదు',
  'preset.readOnly': 'చదవడం మాత్రమే',
  'preset.workspaceWrite': 'వర్క్‌స్పేస్ రాత',
  'preset.fullAccess': 'పూర్తి యాక్సెస్',
  'confirm.title': 'పూర్తి యాక్సెస్‌ను ప్రారంభించాలా?',
  'confirm.description': 'పూర్తి యాక్సెస్ కొత్త సెషన్లు నిర్ధారణ దశలను తగ్గించి సున్నితమైన కార్యకలాపాలు, ఫైల్ మార్పులు లేదా బాహ్య ఆదేశాలతో సహా మరిన్ని పనులను నేరుగా చేయనిస్తుంది. తదుపరి పనులపై నమ్మకం ఉన్నప్పుడే దీన్ని వాడండి.',
  'confirm.acknowledge': 'నాకు ప్రమాదాలు అర్థమయ్యాయి మరియు కొనసాగాలనుకుంటున్నాను',
  'confirm.cancel': 'రద్దు చేయండి',
  'confirm.enable': 'పూర్తి యాక్సెస్‌ను ప్రారంభించండి',
}

/** Current-session popup-gate key union. */
export type PermissionAccessKey = keyof typeof accessEn

/** English dictionary for the current-session popup gate. */
export const accessEn = {
  'preset.readOnly': 'Read Only',
  'preset.workspaceWrite': 'Workspace Write',
  'preset.fullAccess': 'Full access',
  'confirm.title': 'Enable Full access?',
  'confirm.description': 'Full access reduces confirmation steps and lets the agent perform more actions directly, including sensitive operations, file changes, or external commands. Only use it when you trust the current task.',
  'confirm.acknowledge': 'I understand the risks and want to continue',
  'confirm.cancel': 'Cancel',
  'confirm.enable': 'Enable Full access',
}

/** Hindi dictionary for the current-session popup gate. */
export const accessHi = {
  'preset.readOnly': 'केवल पठन',
  'preset.workspaceWrite': 'कार्यक्षेत्र लेखन',
  'preset.fullAccess': 'पूर्ण एक्सेस',
  'confirm.title': 'पूर्ण एक्सेस सक्षम करें?',
  'confirm.description': 'पूर्ण एक्सेस पुष्टि चरण घटाता है और एजेंट को संवेदनशील संचालन, फ़ाइल परिवर्तन या बाह्य आदेशों सहित अधिक कार्य सीधे करने देता है। इसका उपयोग तभी करें जब आप वर्तमान कार्य पर भरोसा करते हों।',
  'confirm.acknowledge': 'मैं जोखिम समझता हूँ और आगे बढ़ना चाहता हूँ',
  'confirm.cancel': 'रद्द करें',
  'confirm.enable': 'पूर्ण एक्सेस सक्षम करें',
}

/** Telugu dictionary for the current-session popup gate. */
export const accessTe = {
  'preset.readOnly': 'చదవడం మాత్రమే',
  'preset.workspaceWrite': 'వర్క్‌స్పేస్ రాత',
  'preset.fullAccess': 'పూర్తి యాక్సెస్',
  'confirm.title': 'పూర్తి యాక్సెస్‌ను ప్రారంభించాలా?',
  'confirm.description': 'పూర్తి యాక్సెస్ నిర్ధారణ దశలను తగ్గిస్తుంది మరియు సున్నితమైన కార్యకలాపాలు, ఫైల్ మార్పులు లేదా బాహ్య ఆదేశాలతో సహా మరిన్ని పనులను ఏజెంట్ నేరుగా చేయనిస్తుంది. ప్రస్తుత పనిపై నమ్మకం ఉన్నప్పుడే దీన్ని వాడండి.',
  'confirm.acknowledge': 'నాకు ప్రమాదాలు అర్థమయ్యాయి మరియు కొనసాగాలనుకుంటున్నాను',
  'confirm.cancel': 'రద్దు చేయండి',
  'confirm.enable': 'పూర్తి యాక్సెస్‌ను ప్రారంభించండి',
}
