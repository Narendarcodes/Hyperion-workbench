import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-asr'
import {
  assertServiceableAsrHttpConfig,
  bundledServerPath,
  engineFor,
  envConfigDefaults,
  HttpTranscriber,
  parseSidecarResponse,
} from '@deepseek-ai/dsh-asr-http'
import type { Config } from '@deepseek-ai/dsh-asr-http'

/** Scripted sidecar: records each request body and answers with the configured reply. */
interface Reply { status: number; body: string; hang?: boolean }
const requests: Record<string, unknown>[] = []
let reply: Reply = { status: 200, body: '{}' }
let server: Server
let endpoint: string
let dir: string
let audio: string
const pending = new Set<ServerResponse>()

beforeAll(async () => {
  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let raw = ''
    req.on('data', (chunk: Buffer) => { raw += chunk.toString() })
    req.on('end', () => {
      requests.push({ url: req.url, ...JSON.parse(raw) as Record<string, unknown> })
      if (reply.hang === true) {
        pending.add(res)
        return
      }
      res.writeHead(reply.status, { 'content-type': 'application/json' })
      res.end(reply.body)
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  endpoint = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}/`
  dir = await mkdtemp(join(tmpdir(), 'dsh-asr-http-'))
  audio = join(dir, 'note.wav')
  await writeFile(audio, 'RIFF-stub-audio')
})

afterEach(() => {
  requests.length = 0
  for (const res of pending) res.destroy()
  pending.clear()
  reply = { status: 200, body: '{}' }
})

afterAll(async () => {
  server.closeAllConnections()
  await new Promise<void>(resolve => server.close(() => resolve()))
  await rm(dir, { recursive: true, force: true })
})

/** Minimal `settings` service: captures the installed section for inspection. */
class StubSettings extends Service {
  namespace: string | undefined
  hooks: { validate: (config: Config) => void; setSource: (current: () => Config) => void; onChange: () => void } | undefined

  constructor(ctx: Context) {
    super(ctx, 'settings')
  }

  installSection(...args: unknown[]): void {
    this.namespace = args[1] as string
    this.hooks = args[4] as NonNullable<StubSettings['hooks']>
  }
}

function full(overrides: Partial<Config> = {}): Config {
  return {
    endpoint,
    defaultLanguage: 'te',
    normalize: 'plant',
    transport: 'upload',
    timeoutMs: 60_000,
    maxTimeoutMs: 600_000,
    maxAudioBytes: 1_000_000,
    ...overrides,
  }
}

async function harness(config: Partial<Config> = {}): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(HttpTranscriber, { endpoint, defaultLanguage: 'te', ...config })
  return ctx
}

describe('HttpTranscriber resolve', () => {
  it('fills language and deadline from configuration', async () => {
    const ctx = await harness()
    expect(ctx.asr.resolve({ audioPath: '/audio/a.wav' })).toEqual({ audioPath: '/audio/a.wav', language: 'te', timeoutMs: 60_000 })
  })

  it('honors per-request language, deadline, and signal, capping the deadline', async () => {
    const ctx = await harness()
    const controller = new AbortController()
    const spec = ctx.asr.resolve({ audioPath: '/a.wav', language: 'hi', timeoutMs: 9_999_999, signal: controller.signal })
    expect(spec).toEqual({ audioPath: '/a.wav', language: 'hi', timeoutMs: 600_000, signal: controller.signal })
  })

  it('rejects empty or relative paths and an empty language', async () => {
    const ctx = await harness()
    expect(() => ctx.asr.resolve({ audioPath: ' ' })).toThrow(/audioPath must be a non-empty string/)
    expect(() => ctx.asr.resolve({ audioPath: 'rel.wav' })).toThrow(/audioPath must be absolute/)
    expect(() => ctx.asr.resolve({ audioPath: '/a.wav', language: ' ' })).toThrow(/language must be a non-empty string/)
  })
})

describe('assertServiceableAsrHttpConfig', () => {
  it('accepts a complete section', () => {
    expect(() => assertServiceableAsrHttpConfig(full({ engines: { en: 'whisper-turbo', '*': 'sravaani' } }))).not.toThrow()
  })

  it('rejects a bad endpoint, language, engine map, or budget', () => {
    expect(() => assertServiceableAsrHttpConfig(full({ endpoint: 'ftp://x' }))).toThrow(/endpoint must be an http\(s\) URL/)
    expect(() => assertServiceableAsrHttpConfig(full({ endpoint: undefined as unknown as string }))).toThrow(/endpoint/)
    expect(() => assertServiceableAsrHttpConfig(full({ defaultLanguage: '' }))).toThrow(/defaultLanguage/)
    expect(() => assertServiceableAsrHttpConfig(full({ defaultLanguage: 3 as unknown as string }))).toThrow(/defaultLanguage/)
    expect(() => assertServiceableAsrHttpConfig(full({ engines: { en: ' ' } }))).toThrow(/engines must map/)
    expect(() => assertServiceableAsrHttpConfig(full({ engines: { ' ': 'x' } }))).toThrow(/engines must map/)
    expect(() => assertServiceableAsrHttpConfig(full({ engines: { en: 1 as unknown as string } }))).toThrow(/engines must map/)
    expect(() => assertServiceableAsrHttpConfig(full({ timeoutMs: 0 }))).toThrow(/timeoutMs must be a positive/)
    expect(() => assertServiceableAsrHttpConfig(full({ maxTimeoutMs: Number.NaN }))).toThrow(/maxTimeoutMs/)
    expect(() => assertServiceableAsrHttpConfig(full({ maxAudioBytes: -1 }))).toThrow(/maxAudioBytes/)
  })

  it('fails loud at load when the endpoint is missing', async () => {
    const ctx = new Context()
    await expect(ctx.plugin(HttpTranscriber, { defaultLanguage: 'te' } as Config)).rejects.toThrow(/endpoint/)
  })
})

describe('engineFor', () => {
  it('prefers the exact language, then the wildcard, else defers to the sidecar', () => {
    expect(engineFor({ en: 'whisper', '*': 'sravaani' }, 'en')).toBe('whisper')
    expect(engineFor({ en: 'whisper', '*': 'sravaani' }, 'te')).toBe('sravaani')
    expect(engineFor({ en: 'whisper' }, 'te')).toBeUndefined()
    expect(engineFor(undefined, 'te')).toBeUndefined()
  })

  it('never lets the wildcard bypass sidecar language detection for "auto"', () => {
    expect(engineFor({ '*': 'sravaani' }, 'auto')).toBeUndefined()
    expect(engineFor({ auto: 'whisper', '*': 'sravaani' }, 'auto')).toBe('whisper')
  })
})

describe('envConfigDefaults', () => {
  it('reads the sidecar endpoint and default language from the environment', () => {
    expect(envConfigDefaults({ HYPERION_STT_URL: 'http://stt:8790', HYPERION_ASR_LANGUAGE: 'te' })).toEqual({ endpoint: 'http://stt:8790', defaultLanguage: 'te' })
    expect(envConfigDefaults({})).toEqual({ endpoint: '', defaultLanguage: 'auto' })
  })
})

describe('parseSidecarResponse', () => {
  const spec = { audioPath: '/a.wav', language: 'te', timeoutMs: 1 }

  it('attributes engine and model', () => {
    expect(parseSidecarResponse('{"text":"P-101A","language":"te","engine":"sravaani","model":"/m"}', spec))
      .toEqual({ text: 'P-101A', language: 'te', model: 'sravaani:/m' })
  })

  it('falls back to the spec language and a provider identity', () => {
    expect(parseSidecarResponse('{"text":""}', spec)).toEqual({ text: '', language: 'te', model: 'asr-http' })
    expect(parseSidecarResponse('{"text":"x","language":"","engine":"","model":"m"}', spec))
      .toEqual({ text: 'x', language: 'te', model: 'm' })
  })

  it('rejects invalid JSON and documents without text', () => {
    expect(() => parseSidecarResponse('nope', spec)).toThrow(/invalid JSON/)
    expect(() => parseSidecarResponse('null', spec)).toThrow(/string "text" field/)
    expect(() => parseSidecarResponse('{"text":1}', spec)).toThrow(/string "text" field/)
  })
})

describe('HttpTranscriber transcribe', () => {
  it('uploads the audio with language, routed engine, and normalisation', async () => {
    const ctx = await harness({ engines: { '*': 'sravaani', en: 'whisper-turbo' } })
    const document = { text: 'P-101A ప్రెషర్ 15.2 bar', raw: 'పీ వన్…', language: 'te', engine: 'sravaani', model: '/models/sravaani' }
    reply = { status: 200, body: JSON.stringify(document) }
    const result = await ctx.asr.transcribe(ctx.asr.resolve({ audioPath: audio }))
    expect(result).toEqual({ text: 'P-101A ప్రెషర్ 15.2 bar', language: 'te', model: 'sravaani:/models/sravaani' })
    expect(requests).toEqual([{
      url: '/v1/transcribe',
      language: 'te',
      normalize: 'plant',
      engine: 'sravaani',
      audio_b64: Buffer.from('RIFF-stub-audio').toString('base64'),
    }])
    await ctx.asr.transcribe(ctx.asr.resolve({ audioPath: audio, language: 'en' }))
    expect(requests[1]?.engine).toBe('whisper-turbo')
  })

  it('passes the path on a shared filesystem and lets the sidecar route', async () => {
    const ctx = await harness({ transport: 'path', normalize: 'none' })
    reply = { status: 200, body: '{"text":"hello"}' }
    await ctx.asr.transcribe(ctx.asr.resolve({ audioPath: '/shared/clip.wav', language: 'en' }))
    expect(requests).toEqual([{ url: '/v1/transcribe', language: 'en', normalize: 'none', audio_path: '/shared/clip.wav' }])
  })

  it('refuses unreadable and oversized audio before calling the sidecar', async () => {
    const ctx = await harness({ maxAudioBytes: 4 })
    await expect(ctx.asr.transcribe(ctx.asr.resolve({ audioPath: join(dir, 'missing.wav') }))).rejects.toThrow(/cannot read audio/)
    await expect(ctx.asr.transcribe(ctx.asr.resolve({ audioPath: audio }))).rejects.toThrow(/above maxAudioBytes 4/)
    expect(requests).toEqual([])
  })

  it('surfaces sidecar error documents and raw error bodies with the status', async () => {
    const ctx = await harness()
    reply = { status: 422, body: '{"error":"unreadable audio: bad header"}' }
    await expect(ctx.asr.transcribe(ctx.asr.resolve({ audioPath: audio }))).rejects.toThrow(/answered 422: unreadable audio: bad header/)
    reply = { status: 500, body: 'Internal <b>boom</b>' }
    await expect(ctx.asr.transcribe(ctx.asr.resolve({ audioPath: audio }))).rejects.toThrow(/answered 500: Internal <b>boom<\/b>/)
    reply = { status: 503, body: '{"detail":"x"}' }
    await expect(ctx.asr.transcribe(ctx.asr.resolve({ audioPath: audio }))).rejects.toThrow(/answered 503: \{"detail":"x"\}/)
  })

  it('reports an unreachable sidecar', async () => {
    const ctx = await harness({ endpoint: 'http://127.0.0.1:1' })
    await expect(ctx.asr.transcribe(ctx.asr.resolve({ audioPath: audio })))
      .rejects.toThrow(/sidecar unreachable at http:\/\/127\.0\.0\.1:1\/v1\/transcribe/)
  })

  it('rejects a provider timeout with the deadline budget', async () => {
    const ctx = await harness()
    reply = { status: 200, body: '', hang: true }
    await expect(ctx.asr.transcribe({ audioPath: audio, language: 'te', timeoutMs: 50 })).rejects.toThrow(/timed out after 50ms/)
  })

  it('rejects an upstream abort as an AbortError', async () => {
    const ctx = await harness()
    reply = { status: 200, body: '', hang: true }
    const controller = new AbortController()
    const pendingCall = ctx.asr.transcribe({ audioPath: audio, language: 'te', timeoutMs: 60_000, signal: controller.signal })
    setTimeout(() => controller.abort(), 30)
    const failure = await pendingCall.then(() => undefined, (error: unknown) => error as Error)
    expect(failure?.name).toBe('AbortError')
  })
})

describe('HttpTranscriber settings section', () => {
  it('installs the asr section and follows source swaps', async () => {
    const ctx = new Context()
    await ctx.plugin(StubSettings)
    await ctx.plugin(HttpTranscriber, { endpoint, defaultLanguage: 'te' })
    const settings = ctx.get('settings') as unknown as StubSettings
    expect(settings.namespace).toBe('asr')
    const hooks = settings.hooks
    if (hooks === undefined) throw new Error('settings section was not installed')
    expect(() => hooks.validate(full({ endpoint: 'nope' }))).toThrow(/endpoint/)
    hooks.setSource(() => full({ defaultLanguage: 'hi' }))
    expect(ctx.asr.resolve({ audioPath: '/a.wav' }).language).toBe('hi')
    hooks.onChange()
  })
})

describe('bundledServerPath', () => {
  it('points at the shipped sidecar', () => {
    expect(bundledServerPath().endsWith('/py/stt_server.py')).toBe(true)
    expect(existsSync(bundledServerPath())).toBe(true)
  })
})

describe('auto-detect language correction by script', () => {
  it('relabels Telugu-script text reported as hi to te on auto', async () => {
    const { parseSidecarResponse, scriptLanguage } = await import('../src/index.ts')
    const spec = { language: 'auto' } as Parameters<typeof parseSidecarResponse>[1]
    const out = parseSidecarResponse(JSON.stringify({ text: 'పంప్ పి-204 లో కంపనం ఎక్కువగా ఉంది', language: 'hi' }), spec)
    expect(out.language).toBe('te')
    expect(scriptLanguage('पंप में कंपन बढ़ गया है')).toBe('hi')
    expect(scriptLanguage('pump vibration is high')).toBeUndefined()
    expect(parseSidecarResponse(JSON.stringify({ text: 'pump vibration high', language: 'en' }), spec).language).toBe('en')
  })
  it('does not override an explicitly requested language', async () => {
    const { parseSidecarResponse } = await import('../src/index.ts')
    const spec = { language: 'hi' } as Parameters<typeof parseSidecarResponse>[1]
    expect(parseSidecarResponse(JSON.stringify({ text: 'పంప్', language: 'hi' }), spec).language).toBe('hi')
  })
})
