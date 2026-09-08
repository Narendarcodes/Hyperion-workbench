/** `subagent` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'subagent'

/** English dictionary (the key-set source of truth). */
export const en = {
  'diagnostic.corrupt': 'corrupted session record',
  'diagnostic.unsupported': 'unsupported subagent record version',
  'diagnostic.unavailable': 'session record temporarily unavailable',
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}m {seconds}s',
  'duration.hours': '{hours}h {minutes}m {seconds}s',
  'duration.days': '{days}d',
  'duration.daysHours': '{days}d {hours}h',
  'duration.months': '~{months}mo',
  'duration.monthsDays': '~{months}mo {days}d',
  'duration.years': '~{years}y',
  'duration.yearsMonths': '~{years}y {months}mo',
  'duration.exactDays': '{days}d {hours}h {minutes}m {seconds}s',
  'duration.exactTitle': 'Total active duration: {duration}',
  'tokens.thousand': '{value}K',
  'tokens.million': '{value}M',
  'tokens.total': '{value} tok',
  'loading.label': 'Loading subagents…',
  'loading.aria': 'Loading subagents',
  'load.error': 'Unable to load subagents',
  'retry': 'Retry',
  'mode.oneShot': 'one-shot',
  'mode.continuable': 'continuable',
  'activity.running': 'running',
  'activity.inactive': 'not running',
  'branch.collapse': 'Collapse {label} descendants',
  'branch.expand': 'Expand {label} descendants',
  'count.total.one': '{count} subagent',
  'count.total.other': '{count} subagents',
  'count.running.one': '{count} subagent running',
  'count.running.other': '{count} subagents running',
  'switcher.aria': 'Switch subagent: {title}',
  'tree.aria': 'Subagent sessions',
  'readonly.oneShot.title': 'One-shot subagent record',
  'readonly.title': 'This subagent is read-only for now',
  'readonly.oneShot.body': 'One-shot tasks do not accept follow-ups; review the full execution record here.',
  'readonly.body': 'The parent session is offline; reopen it to continue sending messages.',
}

/** Key domain of the `subagent` namespace. */
export type SubagentKey = keyof typeof en
