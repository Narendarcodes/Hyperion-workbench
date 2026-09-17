/** `approval` namespace dictionaries. */

/** Approval dictionary key union. */
export type ApprovalKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  waiting: 'Waiting for approval',
  'detail.aria': 'Approval details',
  escalation: 'Tool {toolName} requests privileged execution',
  reject: 'Reject',
  allowOnce: 'Allow once',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  waiting: 'अनुमोदन प्रतीक्षारत',
  'detail.aria': 'अनुमोदन विवरण',
  escalation: 'उपकरण {toolName} विशेषाधिकार निष्पादन का अनुरोध करता है',
  reject: 'अस्वीकार करें',
  allowOnce: 'एक बार अनुमति दें',
}
