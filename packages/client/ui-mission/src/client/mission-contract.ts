/**
 * Mission contract and snapshot types for the Mission View.
 * @module @deepseek-ai/dsh-client-ui-mission/client/mission-contract
 */

import type {
  MissionAgentStatus,
  MissionPhase,
  MissionStationId,
  PhaseState,
} from './mission-vocabulary.ts'

/** One deliverable artifact produced by mutation tools in the session. */
export interface MissionDeliverable {
  readonly path: string
  readonly seq: number
}

/** One human interaction or verification item. */
export interface MissionVerificationItem {
  readonly kind: 'approval' | 'question' | 'goal'
  readonly status: 'pending' | 'decided'
  readonly seq: number
  readonly title?: string | undefined
}

/** Sovereignty and isolation policy state for the session. */
export interface MissionSovereigntyState {
  readonly sandboxMode: string
  readonly approvalPolicy: string
  readonly provider: string | null
  readonly model: string | null
  readonly egress: 'unavailable'
}

/** Location kind for agents in the office simulation. */
export type MissionLocationKind = 'cabin' | 'shared' | 'orchestrator' | 'entrance'

/** Observable location in the visual office simulation. */
export interface MissionLocation {
  readonly kind: MissionLocationKind
  readonly zone: string
  readonly seatId?: string | undefined
}

/** One discrete activity executed by an agent. */
export interface MissionActivity {
  readonly kind: string
  readonly label: string
  readonly tool?: string | undefined
  readonly file?: string | undefined
  readonly status: MissionAgentStatus
  readonly evidenceSeqs: readonly number[]
}

/** One step within a mission task. */
export interface MissionTaskStep {
  readonly id: string
  readonly taskId: string
  readonly agentId: string
  readonly label: string
  readonly capability: string
  readonly status: 'pending' | 'in_progress' | 'completed' | 'failed'
  readonly evidenceSeqs: readonly number[]
}

/** One unit of work assigned to one or more agents. */
export interface MissionTask {
  readonly id: string
  readonly title: string
  readonly description?: string | undefined
  readonly assignedAgentIds: readonly string[]
  readonly status: 'pending' | 'in_progress' | 'completed' | 'failed'
  readonly steps: readonly MissionTaskStep[]
}

/** One dedicated personal cabin assigned to an agent. */
export interface MissionCabin {
  readonly id: string
  readonly agentId: string
  readonly label: string
  readonly seatIndex?: number | undefined
  readonly status: MissionAgentStatus
}

/** State of one specialist worker assigned to an office station. */
export interface MissionWorker {
  readonly id: string
  readonly role?: string | undefined
  readonly capabilities?: readonly string[] | undefined
  readonly cabinId?: string | undefined
  readonly activeTaskId?: string | undefined
  readonly activeStepId?: string | undefined
  readonly currentActivity?: MissionActivity | undefined
  readonly currentLocation?: MissionLocation | undefined
  readonly station: MissionStationId
  readonly label: string
  readonly status: MissionAgentStatus
  readonly bubble: string | null
  readonly evidenceSeqs: readonly number[]
  readonly currentTool?: string | undefined
}

/** Overall office simulation state covering orchestrator dais and specialist desks. */
export interface MissionOfficeState {
  readonly orchestrator: {
    readonly status: MissionAgentStatus
    readonly bubble: string
  }
  readonly workers: readonly MissionWorker[]
  readonly cabins?: readonly MissionCabin[] | undefined
  readonly tasks?: readonly MissionTask[] | undefined
}

/** One chronological activity entry in the mission feed. */
export interface MissionActivityEntry {
  readonly id: string
  readonly seq: number
  readonly time: number
  readonly agentId: string
  readonly label: string
  readonly status: MissionAgentStatus
  readonly detail?: string | undefined
}

/** The complete immutable Mission Snapshot projected from session events. */
export interface MissionSnapshot {
  readonly phases: Record<MissionPhase, PhaseState>
  readonly office: MissionOfficeState
  readonly activity: readonly MissionActivityEntry[]
  readonly deliverables: readonly MissionDeliverable[]
  readonly verification: readonly MissionVerificationItem[]
  readonly sovereignty: MissionSovereigntyState
}

/** Initial empty mission snapshot before events are processed. */
export const EMPTY_MISSION_SNAPSHOT: MissionSnapshot = {
  phases: {
    input: { status: 'future', evidenceSeqs: [] },
    understand: { status: 'future', evidenceSeqs: [] },
    plan: { status: 'future', evidenceSeqs: [] },
    retrieve: { status: 'future', evidenceSeqs: [] },
    execute: { status: 'future', evidenceSeqs: [] },
    verify: { status: 'future', evidenceSeqs: [] },
    deliver: { status: 'future', evidenceSeqs: [] },
  },
  office: {
    orchestrator: {
      status: 'idle',
      bubble: '',
    },
    workers: [],
    cabins: [],
    tasks: [],
  },
  activity: [],
  deliverables: [],
  verification: [],
  sovereignty: {
    sandboxMode: 'standard',
    approvalPolicy: 'prompt',
    provider: null,
    model: null,
    egress: 'unavailable',
  },
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ConversationViewSnapshotMap {
    /** Independently assembled data consumed by the Mission view. */
    mission: MissionSnapshot
  }
}
