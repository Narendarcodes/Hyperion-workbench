import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { AsrTranscriber } from '@deepseek-ai/dsh-asr'
import type { AsrRequest, AsrResult, AsrSpec } from '@deepseek-ai/dsh-asr'

/**
 * Minimal concrete transcriber: a fixed default language and canned results.
 * This stub is all an implementation owes the abstract class.
 */
class StubTranscriber extends AsrTranscriber {
  resolve(request: AsrRequest): AsrSpec {
    return {
      audioPath: request.audioPath,
      language: request.language ?? 'hi',
      timeoutMs: 1000,
      ...request.signal !== undefined ? { signal: request.signal } : {},
    }
  }

  async transcribe(spec: AsrSpec): Promise<AsrResult> {
    return { text: `transcript of ${spec.audioPath}`, language: spec.language, model: 'stub' }
  }
}

describe('AsrTranscriber service seam', () => {
  it('a concrete subclass registers as ctx.asr and serves the abstract API', async () => {
    const ctx = new Context()
    await ctx.plugin(StubTranscriber)
    const spec = ctx.asr.resolve({ audioPath: '/audio/note.wav' })
    expect(spec).toEqual({ audioPath: '/audio/note.wav', language: 'hi', timeoutMs: 1000 })

    const result = await ctx.asr.transcribe(spec)
    expect(result).toEqual({ text: 'transcript of /audio/note.wav', language: 'hi', model: 'stub' })
  })

  it('carries a per-request language and signal through resolve', async () => {
    const ctx = new Context()
    await ctx.plugin(StubTranscriber)
    const controller = new AbortController()
    const spec = ctx.asr.resolve({ audioPath: '/audio/note.wav', language: 'ta', signal: controller.signal })
    expect(spec.language).toBe('ta')
    expect(spec.signal).toBe(controller.signal)
  })

  it('loading a second implementation throws (one transcriber per context — cordis standard)', async () => {
    const ctx = new Context()
    await ctx.plugin(StubTranscriber)
    class SecondTranscriber extends StubTranscriber {}
    await expect(ctx.plugin(SecondTranscriber)).rejects.toThrow(/service "asr" has been registered/)
  })
})
