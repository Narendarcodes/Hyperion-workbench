/**
 * `model` namespace dictionaries.
 *
 * `trigger.selectAria` intentionally matches `trigger.fallback` but remains a
 * separate key: the visible fallback label and the accessible name of
 * an unset trigger are free to diverge per locale, and folding it into
 * `trigger.aria` would announce the degenerate "Select model, current Select
 * model".
 */

/** The model namespace key union. */
export type ModelKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  'command.description': 'Select the model for this conversation',
  'option.loadError': 'Catalog failed to load: {message}',
  'trigger.fallback': 'Select model',
  'trigger.loading': 'Loading models…',
  'trigger.selectAria': 'Select model',
  'trigger.aria': 'Select model, current {model}',
  'trigger.ariaEffort': 'Select model, current {model}, reasoning effort {effort}',
  'menu.aria': 'Model and reasoning effort',
  'menu.model': 'Model',
  'menu.effort': 'Effort',
  'effort.providerDefault': 'Default',
  'status.loading': 'Refreshing model list…',
  'error.action': 'Model operation failed: {message}',
  'action.reload': 'Reload',
  'warning.groupLoad': '{name} failed to load: {message}',
  'empty.models': 'No models available.',
  'blocked.composer': 'This model is unavailable — select one to continue',
  'empty.efforts': 'This model provides no reasoning effort levels.',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'command.description': 'इस वार्तालाप हेतु मॉडल चुनें',
  'option.loadError': 'सूची लोड विफल रही: {message}',
  'trigger.fallback': 'मॉडल चुनें',
  'trigger.loading': 'मॉडल लोड हो रहे हैं…',
  'trigger.selectAria': 'मॉडल चुनें',
  'trigger.aria': 'मॉडल चुनें, वर्तमान {model}',
  'trigger.ariaEffort': 'मॉडल चुनें, वर्तमान {model}, तर्क प्रयास {effort}',
  'menu.aria': 'मॉडल और तर्क प्रयास',
  'menu.model': 'मॉडल',
  'menu.effort': 'प्रयास',
  'effort.providerDefault': 'डिफ़ॉल्ट',
  'status.loading': 'मॉडल सूची ताज़ा हो रही है…',
  'error.action': 'मॉडल संचालन विफल रहा: {message}',
  'action.reload': 'पुनः लोड करें',
  'warning.groupLoad': '{name} लोड विफल रहा: {message}',
  'empty.models': 'कोई मॉडल उपलब्ध नहीं।',
  'blocked.composer': 'यह मॉडल अनुपलब्ध है — आगे बढ़ने हेतु एक चुनें',
  'empty.efforts': 'यह मॉडल कोई तर्क प्रयास स्तर प्रदान नहीं करता।',
}
