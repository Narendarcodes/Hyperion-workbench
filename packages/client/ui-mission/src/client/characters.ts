/**
 * Characters and visual styling definitions for the specialist agents in Hyperion Mission View.
 * @module @deepseek-ai/dsh-client-ui-mission/client/characters
 */

/** Visual configuration for one character role. */
export interface CharacterStyle {
  readonly role: string
  readonly color: string
  readonly hairColor: string
  readonly accessory?: string | undefined
  readonly station: string | null
}

/** Pre-configured character styles for the orchestrator and 6 specialist roles. */
export const CHARACTERS: Readonly<Record<string, CharacterStyle>> = {
  orchestrator: {
    role: 'Orchestrator',
    color: '#7c3aed',
    hairColor: '#4c1d95',
    accessory: 'crown',
    station: null,
  },
  documents: {
    role: 'Document Agent',
    color: '#2563eb',
    hairColor: '#1e3a8a',
    accessory: 'glasses',
    station: 'documents',
  },
  knowledge: {
    role: 'Knowledge Agent',
    color: '#0891b2',
    hairColor: '#164e63',
    accessory: 'headset',
    station: 'knowledge',
  },
  analysis: {
    role: 'Analysis Agent',
    color: '#d97706',
    hairColor: '#78350f',
    accessory: 'tie',
    station: 'analysis',
  },
  code: {
    role: 'Coding Agent',
    color: '#059669',
    hairColor: '#064e3b',
    accessory: 'hoodie',
    station: 'code',
  },
  testing: {
    role: 'Test Specialist',
    color: '#0284c7',
    hairColor: '#075985',
    accessory: 'headset',
    station: 'testing',
  },
  verification: {
    role: 'Verifier',
    color: '#dc2626',
    hairColor: '#7f1d1d',
    accessory: 'badge',
    station: 'verification',
  },
  report: {
    role: 'Report Agent',
    color: '#4f46e5',
    hairColor: '#312e81',
    accessory: 'clipboard',
    station: 'report',
  },
}
