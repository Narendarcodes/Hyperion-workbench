/**
 * IndicConformer Service Provider for the speech-to-text capability seam over
 * the subprocess capability seam. Each transcription spawns the bundled
 * `py/transcribe.py` sidecar under the configured interpreter; the sidecar
 * owns NeMo imports, checkpoint restore, and decoding, while this provider
 * owns request defaulting, deadlines, and transcript validation. The engine
 * (AI4Bharat NeMo, `nemo-v2` branch) and the `.nemo` checkpoint live outside
 * the harness — see https://github.com/AI4Bharat/IndicConformerASR.
 * @module @deepseek-ai/dsh-asr-nemo
 */

import { dirname, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { ASR_SETTINGS_NAMESPACE, AsrTranscriber } from '@deepseek-ai/dsh-asr'
import type { AsrRequest, AsrResult, AsrSpec } from '@deepseek-ai/dsh-asr'
import type { SubprocessCollect, SubprocessHandle, SubprocessOutputReader, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess'
import type {} from '@deepseek-ai/dsh-settings'
import { clampTimeout, deadline, MAX_TIMER_DELAY_MS, timeoutOf } from '@deepseek-ai/dsh-timeout'

/** Default per-stream in-memory output cap (the `maxOutputBytes` config). */
const DEFAULT_MAX_OUTPUT_BYTES = 64_000
/** Default per-stream spill-file cap (the `maxSpillBytes` config). */
const DEFAULT_MAX_SPILL_BYTES = 64 * 1024 * 1024

/** Default SIGTERM→SIGKILL grace period (the `graceMs` config). */
const DEFAULT_GRACE_MS = 3_000

/**
 * Default foreground deadline: restoring a 600M checkpoint and decoding on
 * CPU takes minutes, so the budget is larger than a shell default
 * (the `timeoutMs` config).
 */
const DEFAULT_TIMEOUT_MS = 300_000

/** Upper bound for per-call deadline overrides (the `maxTimeoutMs` config). */
const DEFAULT_MAX_TIMEOUT_MS = 1_800_000

/** Plugin config (all optional — `static Config` supplies the defaults). */
export interface Config {
  /**
   * Local `.nemo` checkpoint path handed to the sidecar's `restore_from`
   * (required: no bundled weights ship with the harness). Download from the
   * links in the IndicConformerASR README or the AI4Bharat HuggingFace
   * collection; the multilingual 600M checkpoint covers all 22 languages.
   */
  model: string
  /**
   * Language code decoded with when a request carries none (required: the
   * multilingual checkpoint needs an explicit code such as `hi`, `bn`, `ta`).
   */
  defaultLanguage: string
  /** Interpreter that runs the sidecar (default: `python3` from `PATH`). */
  pythonBin?: string
  /** Sidecar entry override (default: the bundled `py/transcribe.py`). */
  scriptPath?: string
  /** Default transcription deadline in milliseconds. */
  timeoutMs?: number
  /** Upper bound for per-call deadline overrides. */
  maxTimeoutMs?: number
  /** Per-stream in-memory output cap; overflow spills to a temp file. */
  maxOutputBytes?: number
  /** Per-stream spill-file cap; larger streams retain only their tail. */
  maxSpillBytes?: number
  /** Grace period for kill escalation and inherited pipes. */
  graceMs?: number
}

/** The shape after schemastery applied the defaults (model stays required). */
type ResolvedConfig = Required<Omit<Config, 'model' | 'defaultLanguage' | 'scriptPath'>> & Pick<Config, 'model' | 'defaultLanguage' | 'scriptPath'>

/**
 * Sidecar entry on the real filesystem: beside `src/` under vitest and beside
 * `lib/` once built. An external interpreter can only open OS paths, so this
 * resolves through `import.meta.url` rather than any virtual filesystem.
 * @returns the absolute path of the bundled `py/transcribe.py`.
 */
export function bundledScriptPath(): string {
  return fileURLToPath(new URL('../../py/transcribe.py', import.meta.url))
}

function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`asr-nemo: ${name} must be a positive finite number`)
  }
}
/**
 * Reject a resolved section this provider could not run with. The schema
 * expresses neither "non-empty" nor the timer bound `graceMs` has to fit, so
 * a stored value is refused where it is written instead of failing at the
 * next transcription.
 * @param config - the resolved section, schema-valid by construction.
 * @throws Error naming the field that cannot be used.
 */
export function assertServiceableAsrConfig(config: Config): void {
  const resolved = config as ResolvedConfig
  if (typeof resolved.model !== 'string' || resolved.model.trim().length === 0) {
    throw new Error('asr-nemo: model must be a non-empty .nemo checkpoint path')
  }
  if (typeof resolved.defaultLanguage !== 'string' || resolved.defaultLanguage.trim().length === 0) {
    throw new Error('asr-nemo: defaultLanguage must be a non-empty language code')
  }
  assertPositiveFinite('timeoutMs', resolved.timeoutMs)
  assertPositiveFinite('maxTimeoutMs', resolved.maxTimeoutMs)
  assertPositiveFinite('maxOutputBytes', resolved.maxOutputBytes)
  assertPositiveFinite('maxSpillBytes', resolved.maxSpillBytes)
  assertPositiveFinite('graceMs', resolved.graceMs)
  if (resolved.graceMs > MAX_TIMER_DELAY_MS) {
    throw new Error(`asr-nemo: graceMs must be no greater than ${MAX_TIMER_DELAY_MS}`)
  }
}

/**
 * Validate one sidecar stdout document into a transcript. The sidecar prints
 * exactly one JSON object; anything else is an engine-protocol failure, not a
 * transcript.
 * @param stdout - the sidecar's complete stdout text.
 * @param spec - the resolved spec the sidecar ran with.
 * @param model - the checkpoint identity to attribute the transcript to.
 * @returns the validated transcript.
 * @throws Error when stdout is not a JSON object with a string `text` field.
 */
export function parseTranscript(stdout: string, spec: AsrSpec, model: string): AsrResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout) as unknown
  } catch {
    throw new Error(`asr-nemo: transcriber printed invalid JSON: ${stdout.slice(0, 500)}`)
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('asr-nemo: transcriber JSON must be an object with a string "text" field')
  }
  const record = parsed as { text?: unknown; language?: unknown }
  if (typeof record.text !== 'string') {
    throw new Error('asr-nemo: transcriber JSON must be an object with a string "text" field')
  }
  return {
    text: record.text,
    language: typeof record.language === 'string' && record.language.length > 0 ? record.language : spec.language,
    model,
  }
}

/**
 * IndicConformer transcriber over `ctx.subprocess`. Bounded output, spill
 * files, and SIGTERM→SIGKILL escalation are the subprocess service's
 * mechanics; this provider supplies their configured budgets per spawn.
 */
export class IndicConformerTranscriber extends AsrTranscriber {
  static inject = ['subprocess']

  static Config: z<Config> = z.object({
    model: z.string(),
    defaultLanguage: z.string(),
    pythonBin: z.string().default('python3'),
    scriptPath: z.string(),
    timeoutMs: z.number().default(DEFAULT_TIMEOUT_MS),
    maxTimeoutMs: z.number().default(DEFAULT_MAX_TIMEOUT_MS),
    maxOutputBytes: z.number().default(DEFAULT_MAX_OUTPUT_BYTES),
    maxSpillBytes: z.number().default(DEFAULT_MAX_SPILL_BYTES),
    graceMs: z.number().default(DEFAULT_GRACE_MS),
  })

  /** The currently authoritative config: the settings section, or the composition entry. */
  private source: () => ResolvedConfig

  /** Validated config (schemastery applied the defaults before construction). */
  get config(): ResolvedConfig {
    return this.source()
  }

  constructor(ctx: Context, config: Config) {
    super(ctx)
    // Schemastery fills these fields before construction; the type does not encode that step.
    const entry = config as ResolvedConfig
    assertServiceableAsrConfig(entry)
    this.source = () => entry
    ctx.inject(['settings'], (settingsCtx) => {
      settingsCtx.settings.installSection(ctx, ASR_SETTINGS_NAMESPACE, IndicConformerTranscriber.Config, entry, {
        validate: assertServiceableAsrConfig,
        setSource: (current) => {
          this.source = current as () => ResolvedConfig
        },
        // Every field is read through the getter at each transcription, so
        // nothing derived from the source needs rebuilding when the document
        // changes.
        onChange: () => {},
      })
    })
  }

  /**
   * Resolve a request into a fully-specified spec: fill `language` from
   * `config.defaultLanguage` and `timeoutMs` from `config.timeoutMs`, capped
   * at `config.maxTimeoutMs`. The tool layer calls this before
   * {@link transcribe}, so that method receives explicit values and never
   * re-defaults.
   */
  resolve(request: AsrRequest): AsrSpec {
    if (request.audioPath.trim().length === 0) {
      throw new Error('asr-nemo: request.audioPath must be a non-empty string')
    }
    if (!isAbsolute(request.audioPath)) {
      throw new Error(`asr-nemo: request.audioPath must be absolute, got ${JSON.stringify(request.audioPath)}`)
    }
    const language = request.language ?? this.config.defaultLanguage
    if (language.trim().length === 0) {
      throw new Error('asr-nemo: request.language must be a non-empty string')
    }
    return {
      audioPath: request.audioPath,
      language,
      timeoutMs: clampTimeout(
        request.timeoutMs,
        this.config.timeoutMs,
        this.config.maxTimeoutMs,
        'asr-nemo: request.timeoutMs',
      ),
      ...request.signal !== undefined ? { signal: request.signal } : {},
    }
  }

  /** The collect-mode readers the provider itself requested (present by construction). */
  private static collected(handle: SubprocessHandle): { stdout: SubprocessOutputReader; stderr: SubprocessOutputReader } {
    const { stdout, stderr } = handle.collected
    /* v8 ignore start -- collect dispositions expose both readers by the seam contract; defensive. */
    if (stdout === undefined || stderr === undefined) {
      throw new Error('asr-nemo: subprocess implementation dropped a requested collect stream')
    }
    /* v8 ignore stop */
    return { stdout, stderr }
  }

  /** Map one resolved spec onto a fully-specified subprocess spawn. */
  private spawnSpec(spec: AsrSpec, argv: readonly string[], signal: AbortSignal | undefined): SubprocessSpawnSpec {
    const collect = (maxBytes: number): SubprocessCollect =>
      ({ maxBytes, spill: { maxBytes: this.config.maxSpillBytes } })
    return {
      argv,
      cwd: dirname(spec.audioPath),
      stdio: {
        stdin: 'ignore',
        stdout: collect(this.config.maxOutputBytes),
        stderr: collect(this.config.maxOutputBytes),
      },
      graceMs: this.config.graceMs,
      signal,
    }
  }

  /**
   * Transcribe one audio file through the sidecar; resolves with the validated
   * transcript when the engine finishes.
   * @param spec - a resolved spec from {@link resolve}, never a raw request.
   * @returns the transcript with its attribution facts.
   */
  async transcribe(spec: AsrSpec): Promise<AsrResult> {
    // One deadline combines timeout and upstream cancellation; disposal clears its timer.
    using d = deadline(spec.signal, spec.timeoutMs, 'ASR_TIMEOUT')
    const python = await this.ctx.subprocess.resolveExecutable(this.config.pythonBin)
    const script = this.config.scriptPath ?? bundledScriptPath()
    const handle = this.ctx.subprocess.spawn(this.spawnSpec(
      spec,
      [python, script, '--model', this.config.model, '--audio', spec.audioPath, '--language', spec.language],
      d.signal,
    ))
    const outcome = await handle.done
    // Only this provider's timeout reason counts as a timeout; outer aborts count as aborts.
    if (timeoutOf(d.signal, 'ASR_TIMEOUT') !== undefined) {
      throw new Error(`asr-nemo: transcription timed out after ${String(spec.timeoutMs)}ms`)
    }
    if (d.signal.aborted) {
      const error = new Error('asr-nemo: transcription aborted')
      error.name = 'AbortError'
      throw error
    }
    const { stdout, stderr } = IndicConformerTranscriber.collected(handle)
    if (outcome.exitCode !== 0) {
      const cause = outcome.exitCode === null ? `signal ${String(outcome.signal)}` : `exit ${String(outcome.exitCode)}`
      throw new Error(`asr-nemo: transcriber failed (${cause}): ${stderr.readFrom(0).text.slice(-2000)}`)
    }
    return parseTranscript(stdout.readFrom(0).text, spec, this.config.model)
  }
}

export default IndicConformerTranscriber
