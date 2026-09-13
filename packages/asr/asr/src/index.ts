/**
 * Service Definition for the `ctx.asr` speech-to-text capability seam: one
 * foreground transcription of an audio file per call. Language defaulting,
 * deadlines, engine startup, and transcript parsing belong to providers;
 * model-facing presentation belongs to Consumers.
 * @module @deepseek-ai/dsh-asr
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type { AsrRequest, AsrResult, AsrSpec } from './types.ts'

/**
 * Settings namespace of this capability, owned here rather than by any
 * provider because it names the capability, not an implementation: a host
 * composes exactly one provider of `ctx.asr` (mounting a second fails loud
 * on a duplicate service registration), so providers share one namespace
 * without ever registering it twice.
 */
export const ASR_SETTINGS_NAMESPACE = 'asr'

export type {
  AsrRequest,
  AsrResult,
  AsrSpec,
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    asr: AsrTranscriber
  }
}

/**
 * Abstract speech-to-text service. Subclass, implement the abstract methods,
 * and load the subclass as a plugin — it registers as `ctx.asr` (one
 * implementation per context; loading a second throws, which is cordis'
 * standard duplicate-service behavior).
 *
 * Implementations must honor these semantics:
 * - {@link resolve} rejects only for unusable requests or configuration.
 *   An empty or relative `audioPath` and an empty `language` fail here, so
 *   `transcribe` never guesses what to decode.
 * - {@link transcribe} rejects only for infrastructure failures: a missing
 *   engine, an unreadable audio file, an engine crash, a timeout kill, or an
 *   abort kill. Detected silence is a successful outcome — an {@link AsrResult}
 *   with empty `text` — never a rejection.
 */
export abstract class AsrTranscriber extends Service {
  constructor(ctx: Context) {
    super(ctx, 'asr')
  }

  /**
   * Apply implementation-owned defaults and caps to a request before execution.
   * @param request - the caller's request; omitted fields get this
   *   implementation's defaults, capped fields are clamped.
   * @returns the fully-specified spec to hand to {@link transcribe}.
   */
  abstract resolve(request: AsrRequest): AsrSpec

  /**
   * Transcribe one audio file; resolves when the engine finishes.
   * @param spec - a resolved spec from {@link resolve}, never a raw request.
   * @returns the transcript with its attribution facts.
   */
  abstract transcribe(spec: AsrSpec): Promise<AsrResult>
}

export default AsrTranscriber
