/**
 * Route paths and wire payload types for the Hyperion bridge.
 * @module @deepseek-ai/dsh-host-hyperion-bridge/shared
 */

/** Route path constants shared with browser consumers. */
export const HYPERION_HEALTH_ROUTE = '/hyperion/health'
export const HYPERION_STATE_ROUTE = '/hyperion/state'
export const HYPERION_REGISTRY_ROUTE = '/hyperion/registry'
export const HYPERION_SKILLS_ROUTE = '/hyperion/skills'
export const HYPERION_TELEMETRY_ROUTE = '/hyperion/telemetry'
export const HYPERION_CHAT_ROUTE = '/hyperion/chat'
export const HYPERION_TURN_ROUTE = '/hyperion/turn'

/** One plan line with CLI-style state for office bubbles. */
export interface HyperionPlanLine {
  readonly label: string
  readonly state: 'done' | 'current' | 'queued'
}

/** One pending human verification item. */
export interface HyperionVerification {
  readonly id: string
  readonly tool: string
  readonly reason?: string | undefined
}

/** Sovereignty slice folded from session policy events. */
export interface HyperionSovereignty {
  readonly sandboxMode: string
  readonly approvalPolicy: string
}

/** The hyperion envelope riding on turn frames (mirrors the Studio demo shape). */
export interface HyperionEnvelope {
  readonly taskType: 'inspection' | 'calculation' | 'pid' | 'knowledge' | 'generic'
  readonly zones: {
    readonly analysis: string
    readonly verification: string
    readonly review: string
    readonly deliverable: string
  }
  readonly stage: number
  readonly stageCount: number
  readonly plan: readonly HyperionPlanLine[]
  readonly skill: string | null
  readonly crew: Readonly<Record<string, string>>
  readonly verification: readonly HyperionVerification[]
  readonly sovereignty: HyperionSovereignty
}

/** One normalized session event the envelope fold consumes. */
export interface HyperionSourceEvent {
  readonly seq: number
  readonly type: string
  readonly text?: string | undefined
  readonly tool?: string | undefined
  readonly skill?: string | undefined
  readonly todos?: readonly { readonly content: string; readonly status: string }[] | undefined
  readonly approvalId?: string | undefined
  readonly approvalTool?: string | undefined
  readonly approvalReason?: string | undefined
  readonly approvalOutcome?: string | undefined
  readonly sandboxMode?: string | undefined
  readonly approvalPolicy?: string | undefined
}
