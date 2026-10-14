/**
 * HTTP Service Provider for the speech-to-text capability seam. Each
 * transcription is one POST to a long-lived STT sidecar (the bundled
 * `py/stt_server.py`) that keeps its engines warm and routes each language
 * to an engine — by default IndicConformer for Telugu/Hindi, Whisper turbo
 * for English, SraVaani as fallback (see docs/benchmarks/stt.md). The
 * provider owns request defaulting, per-language engine selection,
 * deadlines, and response validation; the sidecar owns model loading,
 * decoding, and plant-tag normalisation.
 * @module @deepseek-ai/dsh-asr-http
 */

import { readFile, stat } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { ASR_SETTINGS_NAMESPACE, AsrTranscriber } from '@deepseek-ai/dsh-asr'
import type { AsrRequest, AsrResult, AsrSpec } from '@deepseek-ai/dsh-asr'
import type {} from '@deepseek-ai/dsh-settings'
import { clampTimeout, deadline, timeoutOf } from '@deepseek-ai/dsh-timeout'

/** Default foreground deadline: engines are warm, so a clip decodes in well under a second. */
const DEFAULT_TIMEOUT_MS = 60_000
/** Upper bound for per-call deadline overrides. */
const DEFAULT_MAX_TIMEOUT_MS = 600_000
/** Largest audio file the provider uploads (the sidecar caps request bodies at 64 MiB of base64). */
const DEFAULT_MAX_AUDIO_BYTES = 32 * 1024 * 1024

/** How the sidecar reaches the audio: upload the bytes, or pass the path on a shared filesystem. */
export type AsrHttpTransport = 'upload' | 'path'
/** Sidecar post-processing: `plant` folds spelled equipment tags and number words; `none` returns the raw transcript. */
export type AsrHttpNormalize = 'plant' | 'none'

/** Plugin config (all optional except endpoint/defaultLanguage — `static Config` supplies the defaults). */
export interface Config {
  /** Sidecar base URL, e.g. `http://127.0.0.1:8790` (required). */
  endpoint: string
  /** Language code decoded with when a request carries none (required). */
  defaultLanguage: string
  /**
   * Per-language engine override sent with each request (`{ en: 'whisper-turbo' }`).
   * Languages absent here use the sidecar's own `--route` table; `*` applies to every
   * language without its own entry.
   */
  engines?: Record<string, string>
  /** Sidecar post-processing (default `plant`). */
  normalize?: AsrHttpNormalize
  /** Audio hand-off (default `upload`; `path` needs the sidecar to see the same filesystem). */
  transport?: AsrHttpTransport
  /** Default transcription deadline in milliseconds. */
  timeoutMs?: number
  /** Upper bound for per-call deadline overrides. */
  maxTimeoutMs?: number
  /** Largest audio file accepted for upload, in bytes. */
  maxAudioBytes?: number
}

/** The shape after schemastery applied the defaults. */
export type ResolvedConfig = Required<Omit<Config, 'engines'>> & Pick<Config, 'engines'>

/**
 * Sidecar entry on the real filesystem, beside `src/` under vitest and beside
 * `lib/` once built — for deploy scripts that launch the bundled server.
 * @returns the absolute path of the bundled `py/stt_server.py`.
 */
export function bundledServerPath(): string {
  return fileURLToPath(new URL('../py/stt_server.py', import.meta.url))
}

function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`asr-http: ${name} must be a positive finite number`)
  }
}

/**
 * Reject a resolved section this provider could not run with, where it is
 * written rather than at the next transcription.
 * @param config - the resolved section, schema-valid by construction.
 * @throws Error naming the field that cannot be used.
 */
export function assertServiceableAsrHttpConfig(config: Config): void {
  const resolved = config as ResolvedConfig
  if (typeof resolved.endpoint !== 'string' || !/^https?:\/\/[^\s/]+/.test(resolved.endpoint)) {
    throw new Error('asr-http: endpoint must be an http(s) URL')
  }
  if (typeof resolved.defaultLanguage !== 'string' || resolved.defaultLanguage.trim().length === 0) {
    throw new Error('asr-http: defaultLanguage must be a non-empty language code')
  }
  for (const [language, engine] of Object.entries(resolved.engines ?? {})) {
    if (language.trim().length === 0 || typeof engine !== 'string' || engine.trim().length === 0) {
      throw new Error('asr-http: engines must map non-empty language codes to non-empty engine names')
    }
  }
  assertPositiveFinite('timeoutMs', resolved.timeoutMs)
  assertPositiveFinite('maxTimeoutMs', resolved.maxTimeoutMs)
  assertPositiveFinite('maxAudioBytes', resolved.maxAudioBytes)
}

/**
 * Pick the engine override for one language: an exact entry, then `*`.
 * @returns the engine name, or undefined to let the sidecar route.
 */
export function engineFor(engines: Record<string, string> | undefined, language: string): string | undefined {
  // `auto` asks the sidecar to detect and route; a wildcard override must not skip that.
  if (language === 'auto') return engines?.auto
  return engines?.[language] ?? engines?.['*']
}

/** Sidecar response document (validated by {@link parseSidecarResponse}). */
interface SidecarDocument {
  text: string
  language?: unknown
  engine?: unknown
  model?: unknown
}

/**
 * Validate one sidecar response body into a transcript.
 * @param body - the sidecar's complete response text (status already 2xx).
 * @param spec - the resolved spec the request ran with.
 * @returns the transcript, attributed `engine:model` when the sidecar names both.
 * @throws Error when the body is not a JSON object with a string `text` field.
 */
export function parseSidecarResponse(body: string, spec: AsrSpec): AsrResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(body) as unknown
  } catch {
    throw new Error(`asr-http: sidecar returned invalid JSON: ${body.slice(0, 500)}`)
  }
  if (typeof parsed !== 'object' || parsed === null || typeof (parsed as { text?: unknown }).text !== 'string') {
    throw new Error('asr-http: sidecar JSON must be an object with a string "text" field')
  }
  const doc = parsed as SidecarDocument
  const language = typeof doc.language === 'string' && doc.language.length > 0 ? doc.language : spec.language
  const engine = typeof doc.engine === 'string' && doc.engine.length > 0 ? doc.engine : undefined
  const model = typeof doc.model === 'string' && doc.model.length > 0 ? doc.model : undefined
  const identity = [engine, model].filter((x): x is string => x !== undefined).join(':')
  return { text: doc.text, language, model: identity.length > 0 ? identity : 'asr-http' }
}

/** Extract the sidecar's `error` message from a non-2xx body, falling back to the raw text. */
function sidecarError(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: unknown }
    if (typeof parsed.error === 'string') return parsed.error
  } catch {
    // not JSON: report the raw body below
  }
  return body.slice(0, 500)
}

/**
 * Environment-backed defaults: `HYPERION_STT_URL` (sidecar base URL; empty
 * fails loud at load) and `HYPERION_ASR_LANGUAGE` (default `auto` = the
 * sidecar detects among its `--auto-languages`, te/hi/en by default).
 */
export function envConfigDefaults(env: Record<string, string | undefined> = process.env): Pick<Config, 'endpoint' | 'defaultLanguage'> {
  return { endpoint: env.HYPERION_STT_URL ?? '', defaultLanguage: env.HYPERION_ASR_LANGUAGE ?? 'auto' }
}

const ENV_DEFAULTS = envConfigDefaults()

/**
 * Transcriber over a persistent HTTP STT sidecar. One request per call; the
 * sidecar serialises GPU work per engine, so concurrent calls queue there.
 */
export class HttpTranscriber extends AsrTranscriber {
  static Config: z<Config> = z.object({
    endpoint: z.string().default(ENV_DEFAULTS.endpoint),
    defaultLanguage: z.string().default(ENV_DEFAULTS.defaultLanguage),
    engines: z.dict(z.string()),
    normalize: z.union(['plant', 'none'] as const).default('plant'),
    transport: z.union(['upload', 'path'] as const).default('upload'),
    timeoutMs: z.number().default(DEFAULT_TIMEOUT_MS),
    maxTimeoutMs: z.number().default(DEFAULT_MAX_TIMEOUT_MS),
    maxAudioBytes: z.number().default(DEFAULT_MAX_AUDIO_BYTES),
  })

  /** The currently authoritative config: the settings section, or the composition entry. */
  private source: () => ResolvedConfig

  /** Validated config (schemastery applied the defaults before construction). */
  get config(): ResolvedConfig {
    return this.source()
  }

  constructor(ctx: Context, config: Config) {
    super(ctx)
    const entry = config as ResolvedConfig
    assertServiceableAsrHttpConfig(entry)
    this.source = () => entry
    ctx.inject(['settings'], (settingsCtx) => {
      settingsCtx.settings.installSection(ctx, ASR_SETTINGS_NAMESPACE, HttpTranscriber.Config, entry, {
        validate: assertServiceableAsrHttpConfig,
        setSource: (current) => {
          this.source = current as () => ResolvedConfig
        },
        // Every field is read through the getter per call; nothing to rebuild.
        onChange: () => {},
      })
    })
  }

  /** Fill language and deadline from configuration, capping the deadline. */
  resolve(request: AsrRequest): AsrSpec {
    if (request.audioPath.trim().length === 0) {
      throw new Error('asr-http: request.audioPath must be a non-empty string')
    }
    if (!isAbsolute(request.audioPath)) {
      throw new Error(`asr-http: request.audioPath must be absolute, got ${JSON.stringify(request.audioPath)}`)
    }
    const language = request.language ?? this.config.defaultLanguage
    if (language.trim().length === 0) {
      throw new Error('asr-http: request.language must be a non-empty string')
    }
    return {
      audioPath: request.audioPath,
      language,
      timeoutMs: clampTimeout(request.timeoutMs, this.config.timeoutMs, this.config.maxTimeoutMs, 'asr-http: request.timeoutMs'),
      ...request.signal !== undefined ? { signal: request.signal } : {},
    }
  }

  /** Build the JSON request body for one spec (reads the audio for `upload`). */
  private async requestBody(spec: AsrSpec): Promise<string> {
    const config = this.config
    const body: Record<string, string> = { language: spec.language, normalize: config.normalize }
    const engine = engineFor(config.engines, spec.language)
    if (engine !== undefined) body.engine = engine
    if (config.transport === 'path') {
      body.audio_path = spec.audioPath
    } else {
      let size: number
      try {
        size = (await stat(spec.audioPath)).size
      } catch (error) {
        throw new Error(`asr-http: cannot read audio ${spec.audioPath}: ${(error as Error).message}`)
      }
      if (size > config.maxAudioBytes) {
        throw new Error(`asr-http: audio is ${String(size)} bytes, above maxAudioBytes ${String(config.maxAudioBytes)}`)
      }
      body.audio_b64 = (await readFile(spec.audioPath)).toString('base64')
    }
    return JSON.stringify(body)
  }

  /**
   * Transcribe one audio file through the sidecar.
   * @param spec - a resolved spec from {@link resolve}, never a raw request.
   * @returns the transcript with its attribution facts.
   */
  async transcribe(spec: AsrSpec): Promise<AsrResult> {
    using d = deadline(spec.signal, spec.timeoutMs, 'ASR_TIMEOUT')
    const body = await this.requestBody(spec)
    const url = `${this.config.endpoint.replace(/\/+$/, '')}/v1/transcribe`
    let status: number
    let text: string
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: d.signal,
      })
      status = response.status
      text = await response.text()
    } catch (error) {
      if (timeoutOf(d.signal, 'ASR_TIMEOUT') !== undefined) {
        throw new Error(`asr-http: transcription timed out after ${String(spec.timeoutMs)}ms`)
      }
      if (d.signal.aborted) {
        const abort = new Error('asr-http: transcription aborted')
        abort.name = 'AbortError'
        throw abort
      }
      throw new Error(`asr-http: sidecar unreachable at ${url}: ${(error as Error).message}`)
    }
    if (status < 200 || status >= 300) {
      throw new Error(`asr-http: sidecar answered ${String(status)}: ${sidecarError(text)}`)
    }
    return parseSidecarResponse(text, spec)
  }
}

export default HttpTranscriber
