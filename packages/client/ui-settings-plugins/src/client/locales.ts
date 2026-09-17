/** Locale bundles for the plugin configuration section and its plugin cards. */

/** Locale keys these surfaces render. */
export type PluginsSettingsLocaleKey =
  | 'nav' | 'title' | 'intro' | 'tabs' | 'configurableTab' | 'empty'
  | 'overridden' | 'reset' | 'readOnly' | 'expand' | 'collapse'
  | 'save' | 'saving' | 'discard' | 'unsaved' | 'saveFailed' | 'invalidNumber'
  | 'bashTitle' | 'bashDescription' | 'bashTimeoutMs' | 'bashTimeoutMsHint'
  | 'bashMaxOutputBytes' | 'bashMaxOutputBytesHint'
  | 'agentLoopTitle' | 'agentLoopDescription' | 'agentLoopMaxParallel' | 'agentLoopMaxParallelHint'
  | 'webSearchTitle' | 'webSearchDescription'
  | 'webSearchApiKey' | 'webSearchApiKeyHint' | 'webSearchApiKeySet' | 'webSearchApiKeyUnset'
  | 'webSearchBaseUrl' | 'webSearchBaseUrlHint' | 'webSearchMaxUses' | 'webSearchMaxUsesHint'
  | 'subagentModelSelectionTitle' | 'subagentModelSelectionDescription'
  | 'subagentModelSelectionToggle' | 'subagentModelSelectionChoose' | 'subagentModelSelectionAllowed'
  | 'subagentModelSelectionLoading' | 'subagentModelSelectionLoadFailed' | 'subagentModelSelectionRetry'
  | 'subagentModelSelectionPartial' | 'subagentModelSelectionUnavailable'
  | 'subagentModelSelectionUnavailableGroup' | 'subagentModelSelectionEmpty'
  | 'subagentModelSelectionRequired' | 'subagentModelSelectionConflict' | 'subagentModelSelectionOff'

/** English copy. */
export const en: Record<PluginsSettingsLocaleKey, string> = {
  nav: 'Plugins',
  title: 'Plugins',
  intro: 'Configure and inspect the plugins installed in this deployment.',
  tabs: 'Plugin views',
  configurableTab: 'Plugin configuration',
  empty: 'This deployment exposes no plugin settings.',
  overridden: 'Overridden',
  reset: 'Reset to default',
  readOnly: 'This deployment stores settings read-only.',
  expand: 'Show settings',
  collapse: 'Hide settings',
  save: 'Save',
  saving: 'Saving…',
  discard: 'Discard',
  unsaved: 'Unsaved',
  saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
  invalidNumber: 'Enter a number, or leave blank to use the default.',
  bashTitle: 'Shell',
  bashDescription: 'Limits every command the agent runs.',
  bashTimeoutMs: 'Command timeout (ms)',
  bashTimeoutMsHint: 'How long one command may run before it is terminated.',
  bashMaxOutputBytes: 'Output cap per stream (bytes)',
  bashMaxOutputBytesHint: 'Output beyond this spills to a temporary file rather than being lost.',
  agentLoopTitle: 'Agent loop',
  agentLoopDescription: 'How the agent dispatches tool calls.',
  agentLoopMaxParallel: 'Parallel tool calls',
  agentLoopMaxParallelHint: 'Upper bound on parallel-safe calls running at once within one step.',
  webSearchTitle: 'Web search',
  webSearchDescription: 'The DeepSeek search provider.',
  webSearchApiKey: 'API key',
  webSearchApiKeyHint: 'Stored outside the settings file. Leave blank to keep the current key.',
  webSearchApiKeySet: 'A key is configured.',
  webSearchApiKeyUnset: 'No key is configured; search is unavailable until one is.',
  webSearchBaseUrl: 'Endpoint',
  webSearchBaseUrlHint: 'Leave blank to use the provider default.',
  webSearchMaxUses: 'Max searches per request',
  webSearchMaxUsesHint: 'How many times one request may search before it must answer.',
  subagentModelSelectionTitle: 'Subagent',
  subagentModelSelectionDescription: 'Control which models agents may choose for subagents.',
  subagentModelSelectionToggle: 'Allow agents to choose models for subagents',
  subagentModelSelectionChoose: 'When enabled, agents can choose a provider, model, and reasoning effort for each subagent from the authorized models below. Applies only to new sessions.',
  subagentModelSelectionAllowed: 'Models agents may choose',
  subagentModelSelectionLoading: 'Loading models…',
  subagentModelSelectionLoadFailed: 'Models could not be loaded.',
  subagentModelSelectionRetry: 'Retry',
  subagentModelSelectionPartial: 'Some model providers could not be loaded; saved choices remain removable.',
  subagentModelSelectionUnavailable: 'Currently unavailable',
  subagentModelSelectionUnavailableGroup: 'Saved but currently unavailable',
  subagentModelSelectionEmpty: 'No model provider currently advertises a model.',
  subagentModelSelectionRequired: 'Select at least one model before saving.',
  subagentModelSelectionConflict: 'Settings changed elsewhere. Discard your draft and try again.',
  subagentModelSelectionOff: 'Subagents use configured defaults or inherit the parent agent\'s model. Saved model choices are retained.',
}

/** Hindi copy. */
export const hi: Record<PluginsSettingsLocaleKey, string> = {
  nav: 'प्लगिन',
  title: 'प्लगिन',
  intro: 'इस परिनियोजन में स्थापित प्लगिन कॉन्फ़िगर और निरीक्षित करें।',
  tabs: 'प्लगिन दृश्य',
  configurableTab: 'प्लगिन कॉन्फ़िगरेशन',
  empty: 'यह परिनियोजन कोई प्लगिन सेटिंग्स उजागर नहीं करता।',
  overridden: 'अधिरोहित',
  reset: 'डिफ़ॉल्ट पुनर्स्थापित करें',
  readOnly: 'यह परिनियोजन सेटिंग्स केवल पठन हेतु संग्रहीत करता है।',
  expand: 'सेटिंग्स दिखाएँ',
  collapse: 'सेटिंग्स छिपाएँ',
  save: 'सहेजें',
  saving: 'सहेजा जा रहा है…',
  discard: 'छोड़ें',
  unsaved: 'असहेजा',
  saveFailed: 'परिनियोजन ने ये मान स्वीकार नहीं किए; सुधार हेतु आपके लिए छोड़े गए।',
  invalidNumber: 'संख्या दर्ज करें, या डिफ़ॉल्ट हेतु रिक्त छोड़ें।',
  bashTitle: 'शेल',
  bashDescription: 'एजेंट चलाए हर आदेश को सीमित करता है।',
  bashTimeoutMs: 'आदेश समय-सीमा (मि.से.)',
  bashTimeoutMsHint: 'एक आदेश समाप्त होने से पहले कितनी देर चल सकता है।',
  bashMaxOutputBytes: 'प्रति स्ट्रीम आउटपुट सीमा (बाइट)',
  bashMaxOutputBytesHint: 'इससे अधिक आउटपुट खोने के बजाय अस्थायी फ़ाइल में जाता है।',
  agentLoopTitle: 'एजेंट लूप',
  agentLoopDescription: 'एजेंट उपकरण कॉल कैसे भेजता है।',
  agentLoopMaxParallel: 'समानांतर उपकरण कॉल',
  agentLoopMaxParallelHint: 'एक चरण में एक साथ चलने वाली समानांतर-सुरक्षित कॉलों की ऊपरी सीमा।',
  webSearchTitle: 'वेब खोज',
  webSearchDescription: 'डीपसीक खोज प्रदाता।',
  webSearchApiKey: 'एपीआई कुंजी',
  webSearchApiKeyHint: 'सेटिंग्स फ़ाइल के बाहर संग्रहीत। वर्तमान कुंजी रखने हेतु रिक्त छोड़ें।',
  webSearchApiKeySet: 'कुंजी कॉन्फ़िगर है।',
  webSearchApiKeyUnset: 'कोई कुंजी कॉन्फ़िगर नहीं; कुंजी तक खोज अनुपलब्ध।',
  webSearchBaseUrl: 'एंडपॉइंट',
  webSearchBaseUrlHint: 'प्रदाता डिफ़ॉल्ट हेतु रिक्त छोड़ें।',
  webSearchMaxUses: 'प्रति अनुरोध अधिकतम खोजें',
  webSearchMaxUsesHint: 'उत्तर देने से पहले एक अनुरोध कितनी बार खोज सकता है।',
  subagentModelSelectionTitle: 'उप-एजेंट',
  subagentModelSelectionDescription: 'उप-एजेंटों हेतु एजेंट कौन-से मॉडल चुन सकते हैं, नियंत्रित करें।',
  subagentModelSelectionToggle: 'एजेंटों को उप-एजेंटों हेतु मॉडल चुनने दें',
  subagentModelSelectionChoose: 'सक्षम होने पर एजेंट नीचे अधिकृत मॉडलों में से प्रत्येक उप-एजेंट हेतु प्रदाता, मॉडल और तर्क प्रयास चुन सकते हैं। केवल नए सत्रों पर लागू।',
  subagentModelSelectionAllowed: 'एजेंट चुन सकने वाले मॉडल',
  subagentModelSelectionLoading: 'मॉडल लोड हो रहे हैं…',
  subagentModelSelectionLoadFailed: 'मॉडल लोड नहीं हो सके।',
  subagentModelSelectionRetry: 'पुनः प्रयास करें',
  subagentModelSelectionPartial: 'कुछ मॉडल प्रदाता लोड नहीं हो सके; सहेजे विकल्प हटाने योग्य हैं।',
  subagentModelSelectionUnavailable: 'वर्तमान में अनुपलब्ध',
  subagentModelSelectionUnavailableGroup: 'सहेजा गया पर वर्तमान में अनुपलब्ध',
  subagentModelSelectionEmpty: 'कोई मॉडल प्रदाता वर्तमान में मॉडल विज्ञापित नहीं करता।',
  subagentModelSelectionRequired: 'सहेजने से पहले कम से कम एक मॉडल चुनें।',
  subagentModelSelectionConflict: 'सेटिंग्स अन्यत्र बदलीं। मसौदा छोड़कर पुनः प्रयास करें।',
  subagentModelSelectionOff: 'उप-एजेंट कॉन्फ़िगर डिफ़ॉल्ट प्रयुक्त करते हैं या मूल एजेंट का मॉडल अपनाते हैं। सहेजे मॉडल विकल्प रखे जाते हैं।',
}
