/**
 * Readable text for RAG abstention reason codes.
 *
 * The Hyperion RAG pipeline (packages/tool/tool-hyperion-rag/scripts/hyperion_rag/pipeline.py)
 * abstains with a machine code: `no_evidence`, `retrieval_gate<threshold>`, `model`,
 * `no_verified_citation`, `unparseable_model_output` (and the bench's `infra_error`).
 * Screens never print the code; they render `describeAbstain(code, subject)`.
 * Wording lives here so hosts can override it with `configureAbstain()`.
 * `{subject}` in a template is replaced by the tag / topic asked about.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/mrpl/abstain
 */

export interface AbstainConfig {
  /** Lead-in shown before the reason ("No grounded answer"). */
  readonly headline: string
  /** Exact reason code → text. */
  readonly reasons: Readonly<Record<string, string>>
  /** Code prefix → text, for parameterised codes such as `retrieval_gate<0.35>`. */
  readonly prefixReasons: Readonly<Record<string, string>>
  /** Text for an unknown or missing code. */
  readonly fallback: string
  /** Stands in for `{subject}` when the caller names none. */
  readonly defaultSubject: string
}

const DEFAULTS: AbstainConfig = {
  headline: 'No grounded answer',
  reasons: {
    model: "{subject} isn't covered by the indexed documents. The closest passages don't answer it, so Hyperion didn't guess.",
    no_evidence: "{subject} isn't in the indexed documents. No passage mentions it.",
    no_verified_citation: "Hyperion drafted an answer about {subject}, but none of its quotes could be checked against the source pages, so it was withheld.",
    unparseable_model_output: "The language model's reply about {subject} couldn't be read. Try again.",
    infra_error: 'The document search service failed while answering about {subject}. Try again.',
  },
  prefixReasons: {
    retrieval_gate: 'The indexed passages closest to {subject} matched too weakly to support an answer.',
  },
  fallback: "The indexed documents don't support an answer about {subject}.",
  defaultSubject: 'this question',
}

let current: AbstainConfig = DEFAULTS

export function abstainConfig(): AbstainConfig {
  return current
}

/** Override part of the wording (hosts, tests). */
export function configureAbstain(patch: Partial<AbstainConfig>): void {
  current = { ...current, ...patch }
}

function capitalise(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)
}

/** Readable, honest text for an abstention reason code. */
export function describeAbstain(code: string | null | undefined, subject?: string | null): string {
  const cfg = current
  const key = code?.trim() ?? ''
  let template = key === '' ? undefined : cfg.reasons[key]
  if (template === undefined && key !== '') {
    for (const [prefix, text] of Object.entries(cfg.prefixReasons)) {
      if (key.startsWith(prefix)) {
        template = text
        break
      }
    }
  }
  // Codes are identifiers; a reason that is already prose (has whitespace) is shown as written.
  if (template === undefined && /\s/.test(key)) return key
  const who = subject?.trim() || cfg.defaultSubject
  const text = (template ?? cfg.fallback).replace(/\{subject\}/g, who)
  // A template that opens with `{subject}` and a generic subject ("this question") still reads as a sentence.
  return capitalise(text)
}
