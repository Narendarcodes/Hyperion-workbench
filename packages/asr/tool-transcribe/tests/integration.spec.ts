import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { AsrTranscriber } from '@deepseek-ai/dsh-asr'
import type { AsrRequest, AsrResult, AsrSpec } from '@deepseek-ai/dsh-asr'
import * as ToolTranscribe from '@deepseek-ai/dsh-tool-transcribe'
import { MockAdapter, textResponse, toolCallResponse } from '../../../core/agent-loop/tests/mock-adapter.ts'

/** Scripted transcriber: the loop exercises the real tool against canned speech. */
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
    return { text: `heard ${spec.audioPath} in ${spec.language}`, language: spec.language, model: 'stub-asr' }
  }
}

/**
 * Full-loop integration: a scripted mock model drives the REAL
 * transcribe_audio tool through the agent loop — the tool/call +
 * tool/result session events a live model would produce. Only the model and
 * the engine are stand-ins; the tool and the session log are real.
 */
async function harness(adapter: MockAdapter): Promise<Context> {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(StubTranscriber)
  await ctx.plugin(ToolTranscribe, {})
  ctx.llm.registerAdapter(['mock'], adapter)
  return ctx
}

function waitForIdle(ctx: Context, agent: Agent): Promise<void> {
  return new Promise((resolve) => {
    const dispose = ctx.on('agent/status', ({ agent: subject, status }) => {
      if (subject === agent && status === 'idle') {
        dispose()
        resolve()
      }
    })
  })
}

function findEvent<T extends SessionEvent['type']>(
  log: readonly SessionEvent[],
  type: T,
  position: 'first' | 'last' = 'first',
): Extract<SessionEvent, { type: T }> {
  const found = position === 'first'
    ? log.find(event => event.type === type)
    : log.findLast(event => event.type === type)
  if (!found) throw new Error(`no ${type} event in the session log`)
  return found as Extract<SessionEvent, { type: T }>
}

describe('transcribe_audio tool through the agent loop', () => {
  it('model calls transcribe_audio: a tool/call, a non-error tool/result, and the transcript land', async () => {
    const adapter = new MockAdapter([
      toolCallResponse('call-1', 'transcribe_audio', { audio_path: '/audio/note.wav' }, 'Transcribing the note.'),
      textResponse('Heard it.'),
    ])
    const ctx = await harness(adapter)
    const agent = await ctx.agentLoop.create(SessionId('it-transcribe'), { provider: 'mock', model: 'mock' })

    agent.followup(createUserMessage({ content: [{ type: 'text', text: 'what is in my voice note' }], source: { kind: 'user' } }))
    await waitForIdle(ctx, agent)

    const log = agent.session.snapshotEvents()
    expect(findEvent(log, 'tool/call').data.name).toBe('transcribe_audio')
    const result = findEvent(log, 'tool/result')
    expect(result.data.message.content[0].isError).toBe(false)
    expect(JSON.stringify(result.data.message.content)).toContain('heard /audio/note.wav in hi')
  })

  it('a per-call language reaches the engine through the loop', async () => {
    const adapter = new MockAdapter([
      toolCallResponse('call-1', 'transcribe_audio', { audio_path: '/audio/note.wav', language: 'bn' }),
      textResponse('Done.'),
    ])
    const ctx = await harness(adapter)
    const agent = await ctx.agentLoop.create(SessionId('it-transcribe-lang'), { provider: 'mock', model: 'mock' })

    agent.followup(createUserMessage({ content: [{ type: 'text', text: 'transcribe in Bengali' }], source: { kind: 'user' } }))
    await waitForIdle(ctx, agent)

    const log = agent.session.snapshotEvents()
    expect(JSON.stringify(findEvent(log, 'tool/result').data.message.content)).toContain('in bn')
  })
})
