import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import type { ToolResult } from '@deepseek-ai/dsh-tools'
import { AsrTranscriber } from '@deepseek-ai/dsh-asr'
import type { AsrRequest, AsrResult, AsrSpec } from '@deepseek-ai/dsh-asr'

import * as tool from '../src/index.ts'

const testToolSignal = new AbortController().signal

/** Scripted transcriber: every request resolves with the staged text. */
class StubTranscriber extends AsrTranscriber {
  text = 'namaste duniya'

  resolve(request: AsrRequest): AsrSpec {
    return {
      audioPath: request.audioPath,
      language: request.language ?? 'hi',
      timeoutMs: 1000,
      ...request.signal !== undefined ? { signal: request.signal } : {},
    }
  }

  async transcribe(spec: AsrSpec): Promise<AsrResult> {
    return { text: this.text, language: spec.language, model: 'stub-asr' }
  }
}

async function setup(maxTextChars?: number): Promise<{ ctx: Context; stub: StubTranscriber }> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(StubTranscriber)
  await ctx.plugin(tool, maxTextChars === undefined ? {} : { maxTextChars })
  const stub = ctx.get('asr') as StubTranscriber
  return { ctx, stub }
}

let callCounter = 0
function callTranscribe(ctx: Context, args: unknown) {
  return ctx.tools.execute({
    signal: testToolSignal,
    callId: ToolCallId(`call-${++callCounter}`),
    name: 'transcribe_audio',
    arguments: args,
  })
}

function text(result: { content: { type: string; text?: string }[] }): string {
  return result.content.filter(b => b.type === 'text').map(b => b.text).join('')
}

describe('dsh-tool-transcribe', () => {
  it('registers a `transcribe_audio` tool with an audio path and an optional language', async () => {
    const { ctx } = await setup()
    const schema = ctx.tools.schemas().find(s => s.name === 'transcribe_audio')
    expect(schema).toBeDefined()
    const props = (schema!.parameters as { properties?: Record<string, unknown> }).properties ?? {}
    expect(Object.keys(props)).toEqual(['audio_path', 'language'])
  })

  it('returns the transcript with attribution and renders its text', async () => {
    const { ctx } = await setup()
    const result = await callTranscribe(ctx, { audio_path: '/audio/note.wav' })
    expect(result.isError).toBe(false)
    if (result.isError) throw new Error('expected transcribe_audio success')
    expect(result.value).toEqual({ text: 'namaste duniya', truncated: false, language: 'hi', model: 'stub-asr' })
    expect(text(result)).toBe('namaste duniya')
  })

  it('passes a per-call language to the transcriber', async () => {
    const { ctx } = await setup()
    const result = await callTranscribe(ctx, { audio_path: '/audio/note.wav', language: 'ta' })
    expect(result.isError).toBe(false)
    if (result.isError) throw new Error('expected transcribe_audio success')
    expect(result.value).toMatchObject({ language: 'ta' })
  })

  it('renders detected silence as a no-speech note', async () => {
    const { ctx, stub } = await setup()
    stub.text = ''
    const result = await callTranscribe(ctx, { audio_path: '/audio/quiet.wav' })
    expect(result.isError).toBe(false)
    if (result.isError) throw new Error('expected transcribe_audio success')
    expect(result.value).toMatchObject({ text: '', truncated: false })
    expect(text(result)).toBe('No speech was detected in the audio.')
  })

  it('truncates long transcripts to the configured budget and marks them', async () => {
    const { ctx, stub } = await setup(5)
    stub.text = 'namaste duniya'
    const result = await callTranscribe(ctx, { audio_path: '/audio/note.wav' })
    expect(result.isError).toBe(false)
    if (result.isError) throw new Error('expected transcribe_audio success')
    expect(result.value).toEqual({ text: 'namas', truncated: true, language: 'hi', model: 'stub-asr' })
  })

  it('never splits a multi-byte character at the budget edge', async () => {
    const { ctx, stub } = await setup(4)
    stub.text = '🙏🙏🙏'
    const result = await callTranscribe(ctx, { audio_path: '/audio/note.wav' })
    expect(result.isError).toBe(false)
    if (result.isError) throw new Error('expected transcribe_audio success')
    expect(result.value).toEqual({ text: '🙏🙏🙏', truncated: false, language: 'hi', model: 'stub-asr' })
  })

  it('keeps a transcript exactly at the budget unmarked', async () => {
    const { ctx, stub } = await setup(3)
    stub.text = 'abc'
    const result = await callTranscribe(ctx, { audio_path: '/audio/note.wav' })
    expect(result.isError).toBe(false)
    if (result.isError) throw new Error('expected transcribe_audio success')
    expect(result.value).toMatchObject({ text: 'abc', truncated: false })
  })
  it('fails loud at load with a non-positive transcript budget', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(StubTranscriber)
    await expect(ctx.plugin(tool, { maxTextChars: 0 })).rejects.toThrow(
      /tool-transcribe: maxTextChars must be a positive finite number/,
    )
    await expect(ctx.plugin(tool, { maxTextChars: Number.NaN })).rejects.toThrow(
      /tool-transcribe: maxTextChars must be a positive finite number/,
    )
  })
})

describe('transcribe_audio UI presentation', () => {
  it('presents the call as a read card over the audio file', async () => {
    const { ctx } = await setup()
    expect(ctx.tools.get('transcribe_audio')?.presentCall?.({ audio_path: '/audio/note.wav' })).toEqual({
      card: 'generic',
      title: 'Transcribe note.wav',
      kind: 'read',
      rawInput: '/audio/note.wav',
      locations: [{ path: '/audio/note.wav' }],
    })
  })

  it('presents the completed transcript on a Transcription card', async () => {
    const { ctx } = await setup()
    const present = ctx.tools.get('transcribe_audio')!.presentResult!
    const args = { audio_path: '/audio/note.wav' }
    expect(present(args, { content: [{ type: 'text', text: 'namaste' }], isError: false })).toEqual({
      card: 'generic',
      title: 'Transcription',
      content: [{ type: 'text', text: 'namaste' }],
    })
  })

  it('falls back to the generic card without transcript content', async () => {
    const { ctx } = await setup()
    const present = ctx.tools.get('transcribe_audio')!.presentResult!
    const args = { audio_path: '/audio/note.wav' }
    expect(present(args, { content: [], isError: false })).toBeUndefined()
    const foreign = { content: [{ type: 'artifact' }], isError: false } as unknown as ToolResult
    expect(present(args, foreign)).toBeUndefined()
  })
})
