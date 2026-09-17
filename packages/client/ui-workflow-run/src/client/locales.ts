/** `workflowRun` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'workflowRun'

/** English dictionary (the key-set source of truth). */
export const en = {
  'run.title': '{name}',
  'run.members.one': '{count} member',
  'run.members.other': '{count} members',
  'run.empty': 'No members started',
  'phase.unassigned': 'Unphased',
  'phase.empty': 'Empty phase name',
  'statusCount.running': 'Running {count}',
  'statusCount.completed': 'Completed {count}',
  'statusCount.failed': 'Failed {count}',
  'statusCount.cancelled': 'Cancelled {count}',
  'statusCount.interrupted': 'Interrupted {count}',
  'member.empty': 'Empty member name',
  'member.open': 'Open {name}',
  'status.running': 'Running',
  'status.completed': 'Completed',
  'status.failed': 'Failed',
  'status.cancelled': 'Cancelled',
  'status.interrupted': 'Interrupted',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'run.title': '{name}',
  'run.members.one': '{count} सदस्य',
  'run.members.other': '{count} सदस्य',
  'run.empty': 'कोई सदस्य आरंभ नहीं हुआ',
  'phase.unassigned': 'अचरणबद्ध',
  'phase.empty': 'रिक्त चरण नाम',
  'statusCount.running': 'चल रहे {count}',
  'statusCount.completed': 'पूर्ण {count}',
  'statusCount.failed': 'विफल {count}',
  'statusCount.cancelled': 'रद्द {count}',
  'statusCount.interrupted': 'बाधित {count}',
  'member.empty': 'रिक्त सदस्य नाम',
  'member.open': '{name} खोलें',
  'status.running': 'चल रहा है',
  'status.completed': 'पूर्ण',
  'status.failed': 'विफल रहा',
  'status.cancelled': 'रद्द',
  'status.interrupted': 'बाधित',
}

/** Union of this namespace's dictionary keys. */
export type WorkflowRunKey = keyof typeof en
