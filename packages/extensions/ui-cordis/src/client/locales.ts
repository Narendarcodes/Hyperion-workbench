/** Cordis dynamic-plugin UI dictionary. */

export const NS = 'cordis'


/** Translation keys owned by the Cordis UI namespace. */
export type CordisKey = keyof typeof en

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Dynamic Cordis UI copy. */
    cordis: CordisKey
  }
}

/** English Cordis UI messages. */
export const en = {
  'row.defineTitle': 'Register Cordis Plugin',
  'row.runTitle': 'Run Cordis Plugin',
  'row.updateTitle': 'Update Cordis Plugin',
  'row.stopTitle': 'Stop Cordis Plugin',
  'row.removeTitle': 'Remove Cordis Plugin',
  'purpose.missing': '(no purpose given)',
  'status.idle': 'Ready',
  'status.awaitingApproval': 'Awaiting approval',
  'status.failed': 'Run failed',
  'status.clientPending': 'Client ready to activate',
  'status.running': 'Running',
  'status.removed': 'Removed',
  'status.superseded': 'Newer run available',
  'run.removed': 'This package no longer exists',
  'run.superseded': 'A newer run card is available below',
  'panel.hint': 'Run controls live in the Cordis panel above Settings',
  'panel.plugins.aria': 'Cordis plugins',
  'panel.approvals.aria': 'Cordis approvals',
  'panel.trigger': 'Cordis Plugin',
  'panel.runningCount': '{count} running',
  'panel.title': 'Cordis plugins',
  'panel.empty': 'No plugins defined yet',
  'panel.loading': 'Reading…',
  'panel.readFailed': 'Reading the plugin inventory failed: {message}',
  'panel.group.current': 'This session',
  'panel.group.others': 'Other sessions',
  'panel.version': 'Version',
  'panel.current': 'Current: {packageId}',
  'panel.next': 'Next: {packageId}',
  'action.approve': 'Allow',
  'action.approveOnce': 'Allow this version only',
  'action.approvePlugin': 'Allow future versions of this plugin',
  'action.decline': 'Decline',
  'action.run': 'Run',
  'action.stop': 'Stop',
  'action.remove': 'Remove',
  'action.retry': 'Retry',
  'action.rollback': 'Roll back',
  'action.inspect': 'Inspect',
  'render.failedAbdicated': 'Rendering failed in {slot}; the default UI was restored:',
  'render.failedHeld': 'Rendering failed in {slot}:',
  'a11y.defining': 'Defining the plugin',
  'a11y.failed': 'Definition failed',
  'a11y.stopped': 'Definition interrupted',
  'body.source': 'Plugin source',
  'body.hostCode': 'Host',
  'body.clientCode': 'Client',
  'body.output': 'Result',
  'body.copy': 'Copy',
  'body.copied': 'Copied',
}
