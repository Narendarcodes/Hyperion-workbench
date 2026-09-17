/** `question` namespace dictionaries. */

/** The question namespace key union. */
export type QuestionKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  'error.incomplete': 'Please complete this question first.',
  'error.unanswered': 'Please select an option or enter a custom answer.',
  'nav.prev': 'Previous question',
  'nav.next': 'Next question',
  'nav.minimize': 'Collapse the question card',
  'nav.maximize': 'Expand the question card',
  'nav.cancel': 'Dismiss all questions',
  'option.recommended': 'Recommended',
  'custom.placeholder': 'Type your answer',
  'action.skip': 'Skip this question',
  'action.next': 'Next',
  'plan.header': 'Plan review',
  'plan.approve': 'Approve',
  'plan.decline': 'Refuse',
  'plan.discuss': 'Chat about it',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'error.incomplete': 'पहले यह प्रश्न पूर्ण करें।',
  'error.unanswered': 'विकल्प चुनें या कस्टम उत्तर लिखें।',
  'nav.prev': 'पूर्व प्रश्न',
  'nav.next': 'अगला प्रश्न',
  'nav.minimize': 'प्रश्न कार्ड समेटें',
  'nav.maximize': 'प्रश्न कार्ड फैलाएँ',
  'nav.cancel': 'सभी प्रश्न हटाएँ',
  'option.recommended': 'अनुशंसित',
  'custom.placeholder': 'अपना उत्तर लिखें',
  'action.skip': 'यह प्रश्न छोड़ें',
  'action.next': 'आगे',
  'plan.header': 'योजना समीक्षा',
  'plan.approve': 'अनुमोदित करें',
  'plan.decline': 'अस्वीकार करें',
  'plan.discuss': 'इस पर चर्चा करें',
}
