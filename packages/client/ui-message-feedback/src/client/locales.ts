/** `feedback` namespace dictionaries. */

/** The feedback namespace key union. */
export type MessageFeedbackKey = keyof typeof en

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The per-message feedback controls' copy. */
    feedback: MessageFeedbackKey
  }
}

/** English dictionary (the key-set source of truth). */
export const en = {
  'action.like': 'Good response',
  'action.likeActive': 'Remove rating',
  'action.dislike': 'Bad response',
  'action.dislikeActive': 'Remove rating',
  'note.open': 'Add a note',
  'note.dialog': 'Feedback',
  'note.placeholder': 'What was good, or what went wrong? (optional)',
  'note.save': 'Save',
  'note.cancel': 'Cancel',
  'note.aria': 'Feedback note',
  'error.conflict': 'This feedback changed elsewhere; the latest state is shown',
  'error.load': 'Could not load feedback',
  'error.generic': 'Could not save feedback',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'action.like': 'अच्छा उत्तर',
  'action.likeActive': 'रेटिंग हटाएँ',
  'action.dislike': 'खराब उत्तर',
  'action.dislikeActive': 'रेटिंग हटाएँ',
  'note.open': 'टिप्पणी जोड़ें',
  'note.dialog': 'प्रतिपुष्टि',
  'note.placeholder': 'क्या अच्छा था, या क्या गलत हुआ? (वैकल्पिक)',
  'note.save': 'सहेजें',
  'note.cancel': 'रद्द करें',
  'note.aria': 'प्रतिपुष्टि टिप्पणी',
  'error.conflict': 'यह प्रतिपुष्टि अन्यत्र बदली; नवीनतम स्थिति दिख रही है',
  'error.load': 'प्रतिपुष्टि लोड नहीं हो सकी',
  'error.generic': 'प्रतिपुष्टि सहेजी नहीं जा सकी',
}
