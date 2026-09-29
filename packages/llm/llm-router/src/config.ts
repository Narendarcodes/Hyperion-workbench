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

export type MatchOperator = { $eq?: unknown; $gt?: number; $lt?: number; $gte?: number; $lte?: number }

export type MatchCondition = Record<string, string | number | boolean | MatchOperator>

export interface RoutingRule {
  match?: MatchCondition | MatchCondition[] // If array, OR. If object, properties are AND.
  scoreCapabilities?: {
    ocr_document?: number
    code_automation?: number
    engineering_reasoning?: number
    deliverable_report?: number
    conversational?: number
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
      instructions: 'What type of industrial engineering operation is requested?',
      criteria: {
        ocr_document: 'OCR, extract text, extract table, scanned blueprint, engineering drawing, technical schematic, image or document reading',
        code_automation: 'writing code, Python script, programming, software development, debugging code, algorithm implementation',
        engineering_reasoning: 'root cause analysis, mechanical or electrical calculations, failure diagnosis, physics math analysis',
        deliverable_report: 'drafting formal engineering reports, SOPs, summary documentation, technical writing',
        conversational: 'greetings (hi, hello, hey), brief acknowledgments, UI navigation, casual conversation',
        spec_compliance: 'specification compliance verification, checking lab values against a standard specification document, pass/fail determination, specification limits',
      },
    },
    complexity: {
      type: 'score',
      instructions: 'How complex is this industrial engineering request?',
      criteria: ['trivial or greeting', 'standard engineering task', 'mission-critical multi-step analysis'],
    },
  },
  rules: [
    // 1. OCR / Blueprint / Document inspection -> Strongly prioritize OCR specialist (GLM-OCR)
    {
      match: { task_type: 'ocr_document' },
      scoreCapabilities: { ocr_document: 25 },
    },
    // 2. Conversational greetings (hi, hello) or very low complexity -> Heavily favor low-cost / free local tier, penalize expensive models
    {
      match: [{ task_type: 'conversational' }, { complexity: { $lt: 0.25 } }],
      scoreCapabilities: { conversational: 15 },
      scoreCostTier: { high: -20, medium: -10, low: 10 },
    },
    // 3. Code & Automation tasks -> Favor local automation & scripting models (Qwen 3.5 4B)
    {
      match: { task_type: 'code_automation' },
      scoreCapabilities: { code_automation: 12 },
    },
    // 4. Highly complex code & automation -> Escalate to top-tier reasoning models
    {
      match: { task_type: 'code_automation', complexity: { $gte: 0.75 } },
      scoreCapabilities: { engineering_reasoning: 8 },
      scoreCostTier: { high: 5, medium: 2 },
    },
    // 5. Engineering reasoning & Root cause diagnosis -> Favor deep reasoning models
    {
      match: { task_type: 'engineering_reasoning' },
      scoreCapabilities: { engineering_reasoning: 15 },
    },
    // 6. Highly complex engineering calculations -> Prefer high compute models
    {
      match: { task_type: 'engineering_reasoning', complexity: { $gte: 0.75 } },
      scoreCapabilities: { engineering_reasoning: 10 },
      scoreCostTier: { high: 8 },
    },
    // 7. Deliverable report generation -> Favor synthesis and technical writing
    {
      match: { task_type: 'deliverable_report' },
      scoreCapabilities: { deliverable_report: 12 },
    },
    // 8. General moderate complexity -> Keep on low-cost local models if possible
    {
      match: { complexity: { $lt: 0.70 } },
      scoreCostTier: { high: -15, low: 5 },
    },
    // 9. Specification compliance checks (e.g. MRPL MG 91) -> Favor the local
    // scripting model with the locked template discipline (Qwen 3.5 4B) and
    // keep closed-world checks off the cloud tiers. Weight 15 keeps qwen
    // ahead of gemma4 in every complexity band and at worst ties the cloud
    // low tier, where registry order keeps qwen first.
    {
      match: { task_type: 'spec_compliance' },
      scoreCapabilities: { code_automation: 15 },
      scoreCostTier: { high: -15, medium: -10, low: 5 },
    },
  ],
}
