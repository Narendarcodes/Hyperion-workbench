/**
 * P&ID workspace configuration. The CDU-03 schematic and its equipment,
 * line and document tables are a bundled SAMPLE (no MRPL as-built P&ID is in
 * the indexed corpus yet); tag evidence is always read live from the RAG
 * service through the MRPL data source.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/pid/config
 */

export interface PidWorkspaceConfig {
  /** Shown wherever sample (non-corpus) P&ID data is rendered. */
  readonly sampleLabel: string
  /** Passages requested from evidence search for a selected tag. */
  readonly evidenceLimit: number
  /** Question sent to the grounded-answer route for a selected tag. */
  readonly tagQuestion: (tag: string, name: string) => string
  /** Search query sent to evidence search for a selected tag. */
  readonly tagQuery: (tag: string, name: string) => string
}

export const PID_WORKSPACE_CONFIG: PidWorkspaceConfig = {
  sampleLabel: 'Sample CDU-03 data · not from the indexed corpus',
  evidenceLimit: 5,
  tagQuestion: (tag, name) => `What do the indexed documents say about ${tag} (${name})? Cover failures, inspection findings and safety recommendations relevant to this equipment.`,
  tagQuery: (tag, name) => `${tag} ${name}`,
}
