/** Chat-owned selection state shared by the transcript and details panel. */

/** Tool call identity as carried by Chat nodes. */
export type ToolCallId = string

/** Selection target for the Chat details linkage channel. */
export interface SelectionTarget {
  turnSeq: number
  stepSeq?: number
  callId?: ToolCallId
  toolName?: string
}

/** One manually expanded Turn answer generation. */
export interface TurnProcessViewEntry {
  readonly turn: number
  readonly answerStep: number
}

/** Document target resolved from a footnote definition at click time. */
export interface SelectedCitationTarget {
  /** Raw link destination or path token, exactly as authored. */
  href?: string | undefined
  /** 1-based page number when the footnote names one. */
  page?: number | undefined
  /** Display name derived from the destination or token. */
  title?: string | undefined
}

/** Selected citation for the Chat | PDF side view. */
export interface SelectedCitation {
  /** 1-based badge number in first-reference order. */
  index: number
  /** Upper-cased footnote identifier backing the badge. */
  identifier: string
  /** Document target resolved from the footnote definition. */
  target: SelectedCitationTarget
}

/** Per-Session state shared only by the Chat view and details surface. */
export interface ChatStoreState {
  selection: SelectionTarget | null
  selectedCitation: SelectedCitation | null
  turnProcesses: TurnProcessViewEntry[]
}
