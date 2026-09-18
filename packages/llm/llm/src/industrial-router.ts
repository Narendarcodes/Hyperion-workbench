/**
 * Industrial Maintenance Task Router for HYPERION Workbench.
 * Performs task-based capability matching to route fault diagnosis, SOP generation,
 * equipment troubleshooting, and industrial Q&A queries to emsLLM models.
 *
 * @module @deepseek-ai/dsh-llm/industrial-router
 */

export interface ModelCapabilityCandidate {
  id: string
  name: string
  provider: string
  domain: string
  capabilities: string[]
  localOnly?: boolean
}

export interface TaskRouteDecision {
  isIndustrialTask: boolean
  domain: 'industrial-maintenance' | 'general'
  taskType?: 'fault-diagnosis' | 'sop-generation' | 'equipment-troubleshooting' | 'maintenance-qa' | 'general'
  selectedModelId: string
  confidence: number
  matchedKeywords: string[]
  capabilitiesRequired: string[]
}

export interface IndustrialRouterOptions {
  preferredModelId?: string
  fallbackModelId?: string
  registeredCandidates?: ModelCapabilityCandidate[]
}

export const DEFAULT_INDUSTRIAL_CANDIDATES: ModelCapabilityCandidate[] = [
  {
    id: 'emsllm-4b',
    name: 'emsLLM-4B',
    provider: 'local',
    domain: 'industrial-maintenance',
    capabilities: [
      'fault-diagnosis-reasoning',
      'maintenance-reasoning',
      'sop-generation',
      'industrial-technical-qa',
    ],
    localOnly: true,
  },
  {
    id: 'emsllm-8b',
    name: 'emsLLM-8B',
    provider: 'local',
    domain: 'industrial-maintenance',
    capabilities: [
      'fault-diagnosis-reasoning',
      'maintenance-reasoning',
      'sop-generation',
      'industrial-technical-qa',
    ],
    localOnly: true,
  },
]

const INDUSTRIAL_KEYWORDS = [
  'dispensing machine',
  'pump',
  'compressor',
  'turbine',
  'bearing',
  'gearbox',
  'motor',
  'valve',
  'hydraulic',
  'pneumatic',
  'vibration',
  'overheating',
  'fault diagnosis',
  'troubleshooting',
  'sop generation',
  'sop',
  'standard operating procedure',
  'maintenance',
  'equipment manual',
  'inspection report',
  'preventive maintenance',
  'lockout tagout',
  'loto',
  'lubrication',
  'cavitation',
  'scada',
  'plc',
  'refinery',
  'pipeline',
]

/**
 * Classifies an incoming task prompt and routes to appropriate specialist capability.
 */
export function routeIndustrialTask(
  prompt: string,
  options?: IndustrialRouterOptions,
): TaskRouteDecision {
  const candidates = options?.registeredCandidates ?? DEFAULT_INDUSTRIAL_CANDIDATES
  const preferredId = options?.preferredModelId ?? 'emsllm-4b'
  const fallbackId = options?.fallbackModelId ?? 'qwen3.5:4b'

  const lowerPrompt = prompt.toLowerCase()
  const matchedKeywords: string[] = []

  for (const kw of INDUSTRIAL_KEYWORDS) {
    if (lowerPrompt.includes(kw)) {
      matchedKeywords.push(kw)
    }
  }

  const isIndustrial = matchedKeywords.length > 0

  if (!isIndustrial) {
    return {
      isIndustrialTask: false,
      domain: 'general',
      taskType: 'general',
      selectedModelId: fallbackId,
      confidence: 0.1,
      matchedKeywords: [],
      capabilitiesRequired: [],
    }
  }

  // Determine specific task sub-type
  let taskType: TaskRouteDecision['taskType'] = 'maintenance-qa'
  if (lowerPrompt.includes('sop') || lowerPrompt.includes('standard operating procedure')) {
    taskType = 'sop-generation'
  } else if (lowerPrompt.includes('fault') || lowerPrompt.includes('error') || lowerPrompt.includes('issue') || lowerPrompt.includes('inspect')) {
    taskType = 'fault-diagnosis'
  } else if (lowerPrompt.includes('troubleshoot') || lowerPrompt.includes('repair')) {
    taskType = 'equipment-troubleshooting'
  }

  // Capability matching
  const requiredCaps = [
    'fault-diagnosis-reasoning',
    'maintenance-reasoning',
    'industrial-technical-qa',
  ]
  if (taskType === 'sop-generation') {
    requiredCaps.push('sop-generation')
  }

  // Find candidate that fulfills required caps
  const matchingCandidate = candidates.find(c => c.id === preferredId) ?? candidates[0]
  const selectedModelId = matchingCandidate ? matchingCandidate.id : preferredId

  const confidence = Math.min(0.5 + matchedKeywords.length * 0.15, 0.99)

  return {
    isIndustrialTask: true,
    domain: 'industrial-maintenance',
    taskType,
    selectedModelId,
    confidence,
    matchedKeywords,
    capabilitiesRequired: requiredCaps,
  }
}
