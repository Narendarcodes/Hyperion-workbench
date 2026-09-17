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
