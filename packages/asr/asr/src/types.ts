/**
 * Shared request/spec/result vocabulary for the `ctx.asr` capability seam.
 * @module @deepseek-ai/dsh-asr/types
 */

/**
 * Caller-supplied transcription request: an audio file plus optional overrides.
 * Providers fill every omission from their validated configuration in
 * `resolve()`, so callers never rely on hidden defaults inside `transcribe`.
 */
export interface AsrRequest {
  /** Absolute path to the audio file to transcribe. */
  audioPath: string
  /**
   * Language code the engine should decode with (the provider documents the
   * accepted codes; IndicConformer providers accept the 22 official Indian
   * language codes such as `hi`, `bn`, `ta`). Falls back to the provider's
   * configured default language.
   */
  language?: string
  /** Optional transcription deadline in milliseconds. */
  timeoutMs?: number
  /** Caller-owned cancellation; aborts the transcription when it fires. */
  signal?: AbortSignal
}

/**
 * Fully-specified transcription spec: every field explicit, produced by
 * `resolve()` before anything runs.
 */
export interface AsrSpec {
  /** Absolute path to the audio file to transcribe. */
  audioPath: string
  /** Language code the engine decodes with. */
  language: string
  /** Deadline in milliseconds, already capped by the provider configuration. */
  timeoutMs: number
  /** Caller-owned cancellation; aborts the transcription when it fires. */
  signal?: AbortSignal
}

/**
 * Settled transcription outcome: the transcript plus the facts a caller needs
 * to attribute it.
 */
export interface AsrResult {
  /** Transcript text, possibly empty when the engine detected no speech. */
  text: string
  /** Language code the engine decoded with. */
  language: string
  /** Engine model identity (checkpoint path, registry id, or provider name). */
  model: string
}
