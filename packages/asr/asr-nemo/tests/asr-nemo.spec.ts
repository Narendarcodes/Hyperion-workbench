import { describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess'
import type {
  SubprocessOutcome,
  SubprocessOutputRead,
  SubprocessOutputReader,
  SubprocessSpawnSpec,
} from '@deepseek-ai/dsh-subprocess'
import type {} from '@deepseek-ai/dsh-asr'
import {
  assertServiceableAsrConfig,
  bundledScriptPath,
  IndicConformerTranscriber,
  parseTranscript,
} from '@deepseek-ai/dsh-asr-nemo'
import type { Config } from '@deepseek-ai/dsh-asr-nemo'

/** In-memory output reader: the whole text from any offset, never lossy. */
function reader(text: string): SubprocessOutputReader {
  return {
    readFrom: (fromByte: number): SubprocessOutputRead => ({
      text: text.slice(fromByte),
      nextOffset: text.length,
      lossy: false,
    }),
  }
}

/**
 * Scripted subprocess stand-in. Tests set the stdout/stderr/exit facts (or a
 * hang) before transcribing; every spawn is captured for argv assertions.
 */
class FakeSubprocess extends SubprocessRuntime {
  lastSpec: SubprocessSpawnSpec | undefined
  stdout = ''
  stderr = ''
  exitCode: number | null = 0
  deathSignal: NodeJS.Signals | null = null
  hangUntilAbort = false
  doneError: unknown
  resolveError: unknown

  async resolveExecutable(command: string): Promise<string> {
    if (this.resolveError !== undefined) throw this.resolveError
    return `/bin/${command}`
  }

  spawn(spec: SubprocessSpawnSpec): ReturnType<SubprocessRuntime['spawn']> {
    this.lastSpec = spec
    let done: Promise<SubprocessOutcome>
    if (this.doneError !== undefined) {
      done = Promise.reject(this.doneError)
    } else if (this.hangUntilAbort) {
      done = new Promise<SubprocessOutcome>((resolve) => {
        const finish = (): void => resolve({ exitCode: null, signal: 'SIGTERM' })
        if (spec.signal?.aborted === true) finish()
        else spec.signal?.addEventListener('abort', finish, { once: true })
      })
    } else {
      done = Promise.resolve({ exitCode: this.exitCode, signal: this.deathSignal })
    }
    return {
      stdin: undefined,
      stdout: undefined,
      stderr: undefined,
      collected: { stdout: reader(this.stdout), stderr: reader(this.stderr) },
      done,
      terminate: (): void => {},
      waitForExit: async (): Promise<boolean> => true,
    }
  }

  spawnTerminal(): Promise<never> {
    throw new Error('FakeSubprocess spawns no terminals')
  }
}

/** Minimal `settings` service: captures the installed section for inspection. */
class StubSettings extends Service {
  namespace: string | undefined
  hooks:
    | {
      validate: (config: Config) => void
      setSource: (current: () => Config) => void
      onChange: () => void
    }
    | undefined

  constructor(ctx: Context) {
    super(ctx, 'settings')
  }

  installSection(...args: unknown[]): void {
    this.namespace = args[1] as string
    this.hooks = args[4] as NonNullable<StubSettings['hooks']>
  }
}

const BASE_CONFIG: Config = { model: '/models/multi.nemo', defaultLanguage: 'hi' }

/** Complete section as schemastery builds it before construction. */
const FULL_CONFIG: Config = {
  ...BASE_CONFIG,
  pythonBin: 'python3',
  timeoutMs: 300_000,
  maxTimeoutMs: 1_800_000,
  maxOutputBytes: 64_000,
  maxSpillBytes: 67_108_864,
  graceMs: 3_000,
}

async function harness(config: Config = BASE_CONFIG): Promise<{ ctx: Context; fake: FakeSubprocess }> {
  const ctx = new Context()
  await ctx.plugin(FakeSubprocess)
  await ctx.plugin(IndicConformerTranscriber, config)
  const fake = ctx.get('subprocess') as FakeSubprocess
  return { ctx, fake }
}

describe('IndicConformerTranscriber resolve', () => {
  it('fills language and deadline from configuration', async () => {
    const { ctx } = await harness()
    expect(ctx.asr.resolve({ audioPath: '/audio/note.wav' })).toEqual({
      audioPath: '/audio/note.wav',
      language: 'hi',
      timeoutMs: 300_000,
    })
  })

  it('honors per-request language, deadline, and signal, capping the deadline', async () => {
    const { ctx } = await harness()
    const controller = new AbortController()
    const spec = ctx.asr.resolve({
      audioPath: '/audio/note.wav',
      language: 'ta',
      timeoutMs: 9_999_999,
      signal: controller.signal,
    })
    expect(spec.language).toBe('ta')
    expect(spec.timeoutMs).toBe(1_800_000)
    expect(spec.signal).toBe(controller.signal)
  })

  it('rejects an empty or relative audio path and an empty language', async () => {
    const { ctx } = await harness()
    expect(() => ctx.asr.resolve({ audioPath: '   ' })).toThrow(/request\.audioPath must be a non-empty string/)
    expect(() => ctx.asr.resolve({ audioPath: 'relative/note.wav' })).toThrow(/request\.audioPath must be absolute/)
    expect(() => ctx.asr.resolve({ audioPath: '/audio/note.wav', language: '' })).toThrow(
      /request\.language must be a non-empty string/,
    )
  })
})

describe('assertServiceableAsrConfig', () => {
  it('rejects an empty model or default language', () => {
    expect(() => assertServiceableAsrConfig({ ...FULL_CONFIG, model: '  ' })).toThrow(
      /model must be a non-empty/,
    )
    expect(() => assertServiceableAsrConfig({ ...FULL_CONFIG, model: undefined as unknown as string })).toThrow(
      /model must be a non-empty/,
    )
    expect(() => assertServiceableAsrConfig({ ...FULL_CONFIG, defaultLanguage: '' })).toThrow(
      /defaultLanguage must be a non-empty language code/,
    )
  })

  it('rejects non-positive budgets and an oversized grace period', () => {
    expect(() => assertServiceableAsrConfig({ ...FULL_CONFIG, timeoutMs: Number.NaN })).toThrow(
      /timeoutMs must be a positive finite number/,
    )
    expect(() => assertServiceableAsrConfig({ ...FULL_CONFIG, maxOutputBytes: 0 })).toThrow(
      /maxOutputBytes must be a positive finite number/,
    )
    expect(() => assertServiceableAsrConfig({ ...FULL_CONFIG, graceMs: 3_000_000_000 })).toThrow(
      /graceMs must be no greater than/,
    )
  })

  it('fails loud at load when the model is missing', async () => {
    const ctx = new Context()
    await ctx.plugin(FakeSubprocess)
    await expect(ctx.plugin(IndicConformerTranscriber, { defaultLanguage: 'hi' } as Config)).rejects.toThrow(
      /model must be a non-empty/,
    )
  })
})

describe('parseTranscript', () => {
  const spec = { audioPath: '/audio/note.wav', language: 'hi', timeoutMs: 1000 }

  it('returns the transcript with sidecar attribution', () => {
    expect(parseTranscript('{"text":"namaste","language":"hi"}', spec, '/models/x.nemo')).toEqual({
      text: 'namaste',
      language: 'hi',
      model: '/models/x.nemo',
    })
  })

  it('resolves detected silence to empty text', () => {
    expect(parseTranscript('{"text":"","language":"hi"}', spec, 'm').text).toBe('')
  })

  it('falls back to the spec language when the sidecar omits or empties it', () => {
    expect(parseTranscript('{"text":"x"}', spec, 'm').language).toBe('hi')
    expect(parseTranscript('{"text":"x","language":""}', spec, 'm').language).toBe('hi')
    expect(parseTranscript('{"text":"x","language":42}', spec, 'm').language).toBe('hi')
  })

  it('rejects invalid JSON, non-objects, and a missing text field', () => {
    expect(() => parseTranscript('not json', spec, 'm')).toThrow(/printed invalid JSON/)
    expect(() => parseTranscript('"str"', spec, 'm')).toThrow(/must be an object with a string "text" field/)
    expect(() => parseTranscript('null', spec, 'm')).toThrow(/must be an object with a string "text" field/)
    expect(() => parseTranscript('{"language":"hi"}', spec, 'm')).toThrow(/must be an object with a string "text" field/)
    expect(() => parseTranscript('{"text":7}', spec, 'm')).toThrow(/must be an object with a string "text" field/)
  })
})

describe('IndicConformerTranscriber transcribe', () => {
  it('spawns the sidecar with model, audio, and language flags', async () => {
    const { ctx, fake } = await harness()
    fake.stdout = '{"text":"namaste","language":"hi"}'
    const result = await ctx.asr.transcribe(ctx.asr.resolve({ audioPath: '/audio/note.wav' }))
    expect(result).toEqual({ text: 'namaste', language: 'hi', model: '/models/multi.nemo' })
    expect(fake.lastSpec?.argv).toEqual([
      '/bin/python3',
      bundledScriptPath(),
      '--model',
      '/models/multi.nemo',
      '--audio',
      '/audio/note.wav',
      '--language',
      'hi',
    ])
    expect(fake.lastSpec?.cwd).toBe('/audio')
  })

  it('prefers a configured script entry', async () => {
    const { ctx, fake } = await harness({ ...BASE_CONFIG, scriptPath: '/opt/wrapper.py', pythonBin: 'py3' })
    fake.stdout = '{"text":"x","language":"hi"}'
    await ctx.asr.transcribe(ctx.asr.resolve({ audioPath: '/a.wav' }))
    expect(fake.lastSpec?.argv.slice(0, 2)).toEqual(['/bin/py3', '/opt/wrapper.py'])
  })

  it('surfaces engine failures with the exit cause and stderr tail', async () => {
    const { ctx, fake } = await harness()
    fake.exitCode = 1
    fake.stderr = 'traceback...\nModuleNotFoundError: nemo'
    await expect(ctx.asr.transcribe(ctx.asr.resolve({ audioPath: '/a.wav' }))).rejects.toThrow(
      /transcriber failed \(exit 1\): .*ModuleNotFoundError: nemo/s,
    )
  })

  it('reports a signal death by signal name', async () => {
    const { ctx, fake } = await harness()
    fake.exitCode = null
    fake.deathSignal = 'SIGKILL'
    await expect(ctx.asr.transcribe(ctx.asr.resolve({ audioPath: '/a.wav' }))).rejects.toThrow(
      /transcriber failed \(signal SIGKILL\)/,
    )
  })

  it('rejects a provider timeout with the deadline budget', async () => {
    const { ctx, fake } = await harness()
    fake.hangUntilAbort = true
    await expect(
      ctx.asr.transcribe({ audioPath: '/a.wav', language: 'hi', timeoutMs: 20 }),
    ).rejects.toThrow(/transcription timed out after 20ms/)
  })

  it('rejects an aborted transcription as an AbortError', async () => {
    const { ctx, fake } = await harness()
    fake.hangUntilAbort = true
    const controller = new AbortController()
    controller.abort()
    const failure = await ctx.asr
      .transcribe({ audioPath: '/a.wav', language: 'hi', timeoutMs: 60_000, signal: controller.signal })
      .then(() => undefined, (error: unknown) => error as Error)
    expect(failure?.name).toBe('AbortError')
  })

  it('propagates interpreter lookup and provider failures', async () => {
    const { ctx, fake } = await harness()
    fake.resolveError = new Error('no python3 on PATH')
    await expect(ctx.asr.transcribe(ctx.asr.resolve({ audioPath: '/a.wav' }))).rejects.toThrow(
      /no python3 on PATH/,
    )
    fake.resolveError = undefined
    fake.doneError = new Error('spawn ENOENT')
    await expect(ctx.asr.transcribe(ctx.asr.resolve({ audioPath: '/a.wav' }))).rejects.toThrow(/spawn ENOENT/)
  })
})

describe('IndicConformerTranscriber settings section', () => {
  it('installs the asr section and follows source swaps', async () => {
    const ctx = new Context()
    await ctx.plugin(FakeSubprocess)
    await ctx.plugin(StubSettings)
    await ctx.plugin(IndicConformerTranscriber, BASE_CONFIG)
    const settings = ctx.get('settings') as StubSettings
    expect(settings.namespace).toBe('asr')
    const hooks = settings.hooks
    if (hooks === undefined) throw new Error('settings section was not installed')
    expect(() => hooks.validate({ ...BASE_CONFIG, model: '' })).toThrow(/model must be a non-empty/)
    hooks.setSource(() => ({ ...BASE_CONFIG, defaultLanguage: 'bn' }))
    expect(ctx.asr.resolve({ audioPath: '/a.wav' }).language).toBe('bn')
    hooks.onChange()
  })
})
