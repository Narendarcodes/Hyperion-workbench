// Task-driven office zone labels for the Hyperion demo.

export const HYPERION_TASK_TYPES = [
  'inspection',
  'calculation',
  'pid',
  'knowledge',
  'generic',
] as const

export type HyperionTaskType = (typeof HYPERION_TASK_TYPES)[number]

export type TaskZoneMap = {
  analysis: string
  verification: string
  review: string
  deliverable: string
}

const TASK_ZONE_MAPS: Record<HyperionTaskType, TaskZoneMap> = {
  inspection: {
    analysis: 'Document Analysis',
    verification: 'Verification',
    review: 'Manager Review',
    deliverable: 'Approval Note',
  },
  calculation: {
    analysis: 'Calculation Bench',
    verification: 'Sandbox Test',
    review: 'Verification',
    deliverable: 'Working Result',
  },
  pid: {
    analysis: 'P&ID Review',
    verification: 'Cross-Reference',
    review: 'Verification',
    deliverable: 'Marked-up Drawing',
  },
  knowledge: {
    analysis: 'Knowledge Search',
    verification: 'Evidence Check',
    review: 'Verification',
    deliverable: 'Grounded Answer',
  },
  generic: {
    analysis: 'Document Analysis',
    verification: 'Verification',
    review: 'Review',
    deliverable: 'Deliverable',
  },
}

export const detectTaskType = (text: string | null | undefined): HyperionTaskType => {
  const value = (text ?? '').toLowerCase()
  if (/p[& ]?id|piping|instrumentation|drawing|pfd/.test(value)) return 'pid'
  if (/calculat|comput|sandbox|code|spreadsheet|xlsx/.test(value)) return 'calculation'
  if (/inspect|report|approval note|finding|ocr|scan/.test(value)) return 'inspection'
  if (/sop|manual|procedure|knowledge|which page|section/.test(value)) return 'knowledge'
  return 'generic'
}

export const resolveTaskZones = (text: string | null | undefined): TaskZoneMap =>
  TASK_ZONE_MAPS[detectTaskType(text)]

export const resolvePlaceLabel = (
  zoneId: string,
  fallback: string,
  taskText?: string | null,
): string => {
  const zones = resolveTaskZones(taskText ?? null)
  switch (zoneId) {
    case 'gym':
    case 'z-gym':
      return zones.analysis
    case 'phone_booth':
    case 'phone-booth':
    case 'z-phone':
      return detectTaskType(taskText ?? null) === 'pid' ? 'P&ID Review' : 'Evidence Call'
    case 'qa_lab':
      return zones.verification
    case 'z-product':
      return zones.review
    case 'z-reading':
      return 'Skill Catalogue'
    case 'z-meeting':
      return 'Orchestrator'
    default:
      return fallback
  }
}
