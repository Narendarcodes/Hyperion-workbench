/** `job` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'job'

/** English dictionary (the key-set source of truth). */
export const en = {
  'count.live.one': '{count} background job running',
  'count.live.other': '{count} background jobs running',
  'count.idle.one': '{count} background job',
  'count.idle.other': '{count} background jobs',
  'list.aria': 'Background jobs',
  'status.running': 'running',
  'status.stopping': 'stopping',
  'status.completed': 'completed',
  'status.killed': 'cancelled',
  'status.failed': 'failed',
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}m {seconds}s',
  'duration.hours': '{hours}h {minutes}m',
  'duration.title.live': 'Running for {duration}',
  'duration.title.done': 'Took {duration}',
}

/** Hindi dictionary (mirrors the en key set). */
export const hi = {
  'count.live.one': '{count} पृष्ठभूमि कार्य चल रहा है',
  'count.live.other': '{count} पृष्ठभूमि कार्य चल रहे हैं',
  'count.idle.one': '{count} पृष्ठभूमि कार्य',
  'count.idle.other': '{count} पृष्ठभूमि कार्य',
  'list.aria': 'पृष्ठभूमि कार्य',
  'status.running': 'चल रहा है',
  'status.stopping': 'रुक रहा है',
  'status.completed': 'पूर्ण',
  'status.killed': 'रद्द',
  'status.failed': 'विफल रहा',
  'duration.seconds': '{seconds}से.',
  'duration.minutes': '{minutes}मि. {seconds}से.',
  'duration.hours': '{hours}घं. {minutes}मि.',
  'duration.title.live': '{duration} से चल रहा है',
  'duration.title.done': '{duration} लगा',
}

/** Telugu dictionary (mirrors the en key set). */
export const te = {
  'count.live.one': '{count} నేపథ్య పని నడుస్తోంది',
  'count.live.other': '{count} నేపథ్య పనులు నడుస్తున్నాయి',
  'count.idle.one': '{count} నేపథ్య పని',
  'count.idle.other': '{count} నేపథ్య పనులు',
  'list.aria': 'నేపథ్య పనులు',
  'status.running': 'నడుస్తోంది',
  'status.stopping': 'ఆగుతోంది',
  'status.completed': 'పూర్తయ్యింది',
  'status.killed': 'రద్దు చేయబడింది',
  'status.failed': 'విఫలమైంది',
  'duration.seconds': '{seconds}సె.',
  'duration.minutes': '{minutes}ని. {seconds}సె.',
  'duration.hours': '{hours}గం. {minutes}ని.',
  'duration.title.live': '{duration} నుండి నడుస్తోంది',
  'duration.title.done': '{duration} పట్టింది',
}

/** Key domain of the `job` namespace. */
export type JobKey = keyof typeof en
