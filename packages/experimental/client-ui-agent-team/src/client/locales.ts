/** Agent Teams Web dictionary. */

/** Locale namespace owned by the Agent Teams Web UI. */
export const NS = 'agent-team'

/** Agent Teams locale key union. */
export type TeamKey = keyof typeof en

/** English dictionary (the key-set source of truth). */
export const en = {
  trigger: 'Agent Team',
  refresh: 'Refresh Team',
  close: 'Close',
  loading: 'Loading Team…',
  empty: 'No shared tasks yet',
  roster: 'Members',
  tasks: 'Shared tasks',
  model: 'Model',
  open: 'Open teammate conversation',
  create: 'New task',
  subject: 'Task subject',
  description: 'Task description',
  blockers: 'Blocking task ids (comma separated)',
  scopes: 'Write scopes (comma separated)',
  save: 'Save',
  cancel: 'Cancel',
  edit: 'Edit',
  complete: 'Complete',
  reopen: 'Reopen',
  delete: 'Delete',
  owner: 'Owner',
  unowned: 'Unowned',
  blockedBy: 'Blocked by',
  writeScopes: 'Write scopes',
  ready: 'Ready',
  blocked: 'Blocked by dependencies',
  conflict: 'Task state changed and was reloaded. Review it before retrying.',
  'memberStatus.running': 'Running',
  'memberStatus.idle': 'Idle',
  'memberStatus.inactive': 'Inactive',
  'memberStatus.provisioning': 'Provisioning',
  'memberStatus.failed': 'Failed',
  'status.pending': 'Pending',
  'status.in_progress': 'In progress',
  'status.completed': 'Completed',
}
