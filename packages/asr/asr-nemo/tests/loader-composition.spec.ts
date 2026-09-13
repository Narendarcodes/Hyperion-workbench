import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import SubprocessLocal from '@deepseek-ai/dsh-subprocess-local'
import AsrNemo from '@deepseek-ai/dsh-asr-nemo'
import type {} from '@deepseek-ai/dsh-asr'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

async function loadYaml(lines: readonly string[]): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'dsh-asr-nemo-loader-'))
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [...lines, ''].join('\n'))

  context = new Context()
  context.baseUrl = pathToFileURL(root).href + '/'
  await context.plugin(Loader)
  context.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-subprocess-local', SubprocessLocal],
    ['@deepseek-ai/dsh-asr-nemo', AsrNemo],
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

/**
 * The NeMo engine is the composition's external service, so the test stands
 * in a stand-in executable for it: the host Node binary running a script that
 * ignores its flags and prints one sidecar document. Everything else — the
 * Loader, the real local subprocess provider, the real transcriber — is the
 * shipped code.
 */
async function engineStub(dir: string, text: string): Promise<string> {
  const script = join(dir, 'fake-engine.mjs')
  const document = JSON.stringify({ text, language: 'hi' })
  await writeFile(script, `console.log(${JSON.stringify(document)})\n`)
  return script
}

describe('real Loader composition', () => {
  it('transcribes through the real provider and subprocess layers', async () => {
    const staging = await mkdtemp(join(tmpdir(), 'dsh-asr-nemo-engine-'))
    try {
      const script = await engineStub(staging, 'namaste duniya')
      const loaded = await loadYaml([
        "- name: '@deepseek-ai/dsh-subprocess-local'",
        "- name: '@deepseek-ai/dsh-asr-nemo'",
        '  config:',
        '    model: /models/indicconformer_stt_multi_hybrid_rnnt_600m.nemo',
        '    defaultLanguage: hi',
        `    pythonBin: '${process.execPath}'`,
        `    scriptPath: '${script}'`,
      ])

      const unloaded = [...loaded.loader.entries()]
        .filter(entry => entry.fiber === undefined && !entry.disabled)
        .map(entry => entry.options.name)
      expect(unloaded).toEqual([])
      expect(loaded.get('asr')).toBeInstanceOf(AsrNemo)

      const audioPath = join(root as string, 'note.wav')
      await writeFile(audioPath, 'RIFF-stub')
      const result = await loaded.asr.transcribe(loaded.asr.resolve({ audioPath }))
      expect(result).toEqual({
        text: 'namaste duniya',
        language: 'hi',
        model: '/models/indicconformer_stt_multi_hybrid_rnnt_600m.nemo',
      })
    } finally {
      await rm(staging, { recursive: true, force: true })
    }
  })
})
