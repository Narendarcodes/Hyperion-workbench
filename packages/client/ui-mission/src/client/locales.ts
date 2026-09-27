/** `mission` namespace dictionaries for the complete Mission View surface. */
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'

/** Dictionary namespace owned by this plugin. */
export const NS = 'mission'

/** The mission dictionary key union. */
export type MissionKey = keyof typeof en

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The complete mission simulation, roadmap, feed, and status copy. */
    mission: MissionKey
  }
}

/** Namespace-bound translator threaded through mission presentation code. */
export type MissionTranslate = TranslateNS<typeof NS>

/** English dictionary for the Mission View. */
export const en = {
  'view.mission': 'Simulation',
  'header.task': 'Active Simulation',
  'header.phase': 'Phase: {phase}',
  'card.agentStatus': 'Agent Status',
  'card.missionPhase': 'Simulation Phase',
  'card.recentActivity': 'Recent Activity',
  'status.inProgress': 'Simulation in progress',
  'status.finished': 'Simulation completed',
  'activity.viewAll': 'View all →',
  'sovereignty.sandbox': 'Sandbox: {mode}',
  'sovereignty.approval': 'Approval: {policy}',
  'sovereignty.model': 'Model: {model}',
  'sovereignty.egress': 'Telemetry unavailable',
  'status.working': 'Working {count}',
  'status.searching': 'Searching {count}',
  'status.waiting': 'Waiting {count}',
  'status.blocked': 'Blocked {count}',
  'status.completed': 'Completed {count}',
  'status.ready': 'Ready',
  'phase.input': 'Input',
  'phase.understand': 'Understand',
  'phase.plan': 'Plan',
  'phase.retrieve': 'Retrieve',
  'phase.execute': 'Execute',
  'phase.verify': 'Verify',
  'phase.deliver': 'Deliver',
  'roadmap.aria': 'Simulation phase roadmap',
  'deliverables.title': 'Deliverables ({count})',
  'deliverables.none': 'No artifacts generated yet',
  'activity.title': 'Simulation Activity Feed',
  'activity.toggle': 'View Activity Feed',
  'activity.hide': 'Hide Activity Feed',
  'activity.empty': 'No activity recorded yet',
  'activity.seq': 'seq {seq}',
  'verification.banner': 'Verification Required: {tool}',
  'verification.action': 'Open Verification',
  'simulation.aria': 'Live Hyperion office',
  'office.openStudio': 'Open the live office',
  'station.documents': 'Document Agent',
  'station.knowledge': 'Knowledge Agent',
  'station.analysis': 'Analysis Agent',
  'station.code': 'Coding Agent',
  'station.verification': 'Verifier',
  'station.report': 'Report Agent',
}
export const hi = en
export const te = en
