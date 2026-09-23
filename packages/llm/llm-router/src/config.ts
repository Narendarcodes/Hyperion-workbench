export interface LayaQuestionChoice {
  type: 'choice'
  instructions: string
  criteria: Record<string, string>
}

export interface LayaQuestionScore {
  type: 'score'
  instructions: string
  criteria: string[]
}

export type LayaQuestion = LayaQuestionChoice | LayaQuestionScore

export type MatchCondition = Record<string, unknown | { $eq?: unknown; $gt?: number; $lt?: number }>

export interface RoutingRule {
  match?: MatchCondition | MatchCondition[] // If array, OR. If object, properties are AND.
  scoreCapabilities?: {
    coding?: number
    reasoning?: number
    creative?: number
    qa?: number
  }
  scoreCostTier?: {
    low?: number
    medium?: number
    high?: number
  }
}

export interface RoutingEngineConfig {
  layaQuestions: Record<string, LayaQuestion>
  rules: RoutingRule[]
}

export const DEFAULT_ROUTING_CONFIG: RoutingEngineConfig = {
  layaQuestions: {
    task_type: {
      type: 'choice',
      instructions: 'What type of task is this?',
      criteria: {
        coding: 'writing, debugging or modifying code',
        reasoning: 'complex logic, planning, math or deep analysis',
        qa: 'simple question answering, information extraction, summarization',
        creative: 'writing stories, drafting emails, brainstorming',
        other: 'everything else',
      },
    },
    complexity: {
      type: 'score',
      instructions: 'How complex is this request?',
      criteria: ['simple', 'moderate', 'highly complex'],
    },
  },
  rules: [
    {
      match: { task_type: 'coding' },
      scoreCapabilities: { coding: 10 },
    },
    {
      match: { task_type: 'coding', complexity: { $gt: 0.5 } },
      scoreCapabilities: { reasoning: 5 },
    },
    {
      match: { task_type: 'reasoning' },
      scoreCapabilities: { reasoning: 10 },
    },
    {
      match: { task_type: 'creative' },
      scoreCapabilities: { creative: 10 },
    },
    {
      match: [{ task_type: 'qa' }, { task_type: 'other' }],
      scoreCapabilities: { qa: 10 },
    },
    {
      match: { complexity: { $lt: 0.3 } },
      scoreCostTier: { high: -5, low: 2 },
    },
    {
      match: { complexity: { $gt: 0.8 } },
      scoreCapabilities: { reasoning: 2, coding: 2 },
    },
  ],
}
