import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import SubprocessLocal from '@deepseek-ai/dsh-subprocess-local'
import AsrNemo from '@deepseek-ai/dsh-asr-nemo'
import * as ToolTranscribe from '@deepseek-ai/dsh-tool-transcribe'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

async function loadYaml(lines: readonly string[]): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'dsh-tool-transcribe-loader-'))
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [...lines, ''].join('\n'))

  context = new Context()
  context.baseUrl = pathToFileURL(root).href + '/'
  await context.plugin(Loader)
  context.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-system-prompt', SystemPrompt],
    ['@deepseek-ai/dsh-tools', ToolRuntime],
    ['@deepseek-ai/dsh-subprocess-local', SubprocessLocal],
    ['@deepseek-ai/dsh-asr-nemo', AsrNemo],
    ['@deepseek-ai/dsh-tool-transcribe', ToolTranscribe],
  ])
  context.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof context.loader.internal>
  await context.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await context.loader.await()
  return context
}

describe('real Loader composition', () => {
  it('serves transcribe_audio end to end over the real provider stack', async () => {
    const staging = await mkdtemp(join(tmpdir(), 'dsh-tool-transcribe-engine-'))
    try {
      const script = join(staging, 'fake-engine.mjs')
      const document = JSON.stringify({ text: 'loader hears you', language: 'hi' })
      await writeFile(script, `console.log(${JSON.stringify(document)})\n`)
      const loaded = await loadYaml([
        "- name: '@deepseek-ai/dsh-system-prompt'",
        "- name: '@deepseek-ai/dsh-tools'",
        "- name: '@deepseek-ai/dsh-subprocess-local'",
        "- name: '@deepseek-ai/dsh-asr-nemo'",
        '  config:',
        '    model: /models/indicconformer_stt_multi_hybrid_rnnt_600m.nemo',
        '    defaultLanguage: hi',
        `    pythonBin: '${process.execPath}'`,
        `    scriptPath: '${script}'`,
        "- name: '@deepseek-ai/dsh-tool-transcribe'",
      ])

      const unloaded = [...loaded.loader.entries()]
        .filter(entry => entry.fiber === undefined && !entry.disabled)
        .map(entry => entry.options.name)
      expect(unloaded).toEqual([])
      expect(loaded.tools.schemas().some(s => s.name === 'transcribe_audio')).toBe(true)

      const audioPath = join(root as string, 'note.wav')
      await writeFile(audioPath, 'RIFF-stub')
      const result = await loaded.tools.execute({
        signal: new AbortController().signal,
        callId: ToolCallId('loader-1'),
        name: 'transcribe_audio',
        arguments: { audio_path: audioPath },
      })
      expect(result.isError).toBe(false)
      if (result.isError) throw new Error('expected transcribe_audio success')
      expect(result.value).toEqual({
        text: 'loader hears you',
        truncated: false,
        language: 'hi',
        model: '/models/indicconformer_stt_multi_hybrid_rnnt_600m.nemo',
      })
    } finally {
      await rm(staging, { recursive: true, force: true })
    }
  })
})
