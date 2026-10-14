/**
 * Live delegation suite against the droplet's gpt-oss-120b (vLLM, served as `llm`).
 *
 *   # forward the droplet first:  ssh -N -L 8001:127.0.0.1:8001 root@165.245.133.12
 *   DROPLET_BASE_URL=http://127.0.0.1:8001/v1 N=20 CONCURRENCY=24 \
 *     npx tsx packages/llm/llm-router/scripts/delegation-live.ts out/
 *
 * Writes <out>/delegation-live.json (per-node scores + summary) and
 * <out>/delegation-live.events.jsonl (Mission View recording, one event per
 * line with its scenario id). Synthetic data only.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { AgentModelPolicy, DROPLET_LLM, DROPLET_ROLE_POLICY } from '../src/agent-policy.ts'
import { DROPLET_PROVIDER } from '../src/droplet.ts'
import {
  parallelScenario,
  runScenarios,
  sequentialScenario,
  summarize,
  treeScenario,
} from '../src/delegation-harness.ts'
import type { ExpectedRoutes, HarnessLlm, HarnessRequest, HarnessResponse } from '../src/delegation-harness.ts'

const baseUrl = process.env.DROPLET_BASE_URL ?? 'http://127.0.0.1:8001/v1'
const n = Number(process.env.N ?? 20)
const concurrency = Number(process.env.CONCURRENCY ?? 24)
const effort = process.env.REASONING_EFFORT ?? 'low'
const outDir = process.argv[2] ?? '.'

/** Transport/availability failure: excluded from eval results, never scored as a model miss. */
class InfraError extends Error {
  readonly infra = true
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const RETRY_BUDGET_MS = Number(process.env.RETRY_BUDGET_MS ?? 15 * 60_000)

/** Block until the endpoint lists models (server restarts take minutes). */
async function waitReady(): Promise<void> {
  const deadline = Date.now() + RETRY_BUDGET_MS
  for (let delay = 2000; ; delay = Math.min(delay * 2, 30_000)) {
    try {
      const res = await fetch(`${baseUrl}/models`, { signal: AbortSignal.timeout(10_000) })
      if (res.ok) return
    } catch {}
    if (Date.now() > deadline) throw new InfraError(`endpoint ${baseUrl} not ready after ${RETRY_BUDGET_MS} ms`)
    console.error(`[live] endpoint not ready; retrying in ${delay} ms`)
    await sleep(delay)
  }
}

/** OpenAI-compatible client that only serves droplet routes. */
class DropletLlm implements HarnessLlm {
  inFlight = 0
  peak = 0
  calls = 0
  retries = 0

  async complete(req: HarnessRequest): Promise<HarnessResponse> {
    if (req.route.provider !== DROPLET_PROVIDER) throw new Error(`route ${req.route.provider}/${req.route.model} is not served by the droplet`)
    this.inFlight++
    this.peak = Math.max(this.peak, this.inFlight)
    this.calls++
    const deadline = Date.now() + RETRY_BUDGET_MS
    try {
      for (let delay = 1000; ; delay = Math.min(delay * 2, 30_000)) {
        let res: Response
        try {
          res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              model: req.route.model,
              messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.prompt }],
              max_tokens: req.maxTokens,
              temperature: 0,
              reasoning_effort: effort,
            }),
            signal: AbortSignal.timeout(180_000),
          })
        } catch (e) {
          // Connection refused / reset / timeout: the server is restarting. Back off.
          if (Date.now() > deadline) throw new InfraError(`connection failed: ${e instanceof Error ? e.message : String(e)}`)
          this.retries++
          await sleep(delay)
          continue
        }
        if (res.status >= 500 || res.status === 429) {
          if (Date.now() > deadline) throw new InfraError(`HTTP ${res.status} after retry budget`)
          this.retries++
          await sleep(delay)
          continue
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
        const body = await res.json() as {
          choices: Array<{ message: { content: string | null } }>
          usage: { prompt_tokens: number; completion_tokens: number }
        }
        return {
          text: body.choices[0]?.message.content ?? '',
          promptTokens: body.usage.prompt_tokens,
          completionTokens: body.usage.completion_tokens,
        }
      }
    } finally {
      this.inFlight--
    }
  }
}

// Only `llm` is served, so every specialist role is expected to FALL BACK to it.
// The explicit-override leaf pins the same served model with an explicit route.
const expected: ExpectedRoutes = { planner: DROPLET_LLM, worker: DROPLET_LLM, fast: DROPLET_LLM, code: DROPLET_LLM, vision: DROPLET_LLM }
const scenarios = Array.from({ length: n }, (_, i) => [
  sequentialScenario(i, expected),
  parallelScenario(i, expected, 4),
  treeScenario(i, expected, DROPLET_LLM),
]).flat()

await waitReady()
const llm = new DropletLlm()
const policy = new AgentModelPolicy(DROPLET_ROLE_POLICY)
const t0 = performance.now()
const allResults = await runScenarios(scenarios, { policy, llm, maxTokens: 768 }, concurrency)
const wallMs = performance.now() - t0
// Scenarios touched by an infrastructure failure are not eval results.
const isInfra = (msg: string | undefined) => msg !== undefined && /^(connection failed|HTTP (5\d\d|429) after retry budget|endpoint )/.test(msg)
const results = allResults.filter(r => !r.nodes.some(n => isInfra(n.error)))
const excludedInfra = allResults.length - results.length
const summary = summarize(results)
const sourceCounts: Record<string, number> = {}
for (const node of results.flatMap(r => r.nodes)) sourceCounts[node.source] = (sourceCounts[node.source] ?? 0) + 1

mkdirSync(outDir, { recursive: true })
const report = {
  endpoint: baseUrl,
  model: 'gpt-oss-120b (served as llm)',
  reasoningEffort: effort,
  scenariosPerKind: n,
  scenarioConcurrency: concurrency,
  peakInFlightRequests: llm.peak,
  transportRetries: llm.retries,
  excludedInfraScenarios: excludedInfra,
  llmCalls: llm.calls,
  wallMs,
  throughputCallsPerSec: llm.calls / (wallMs / 1000),
  routeSources: sourceCounts,
  summary,
  failures: results.flatMap(r => r.nodes.filter(x => !x.completed || !x.modelCorrect || x.error !== undefined)),
  nodes: results.flatMap(r => r.nodes),
}
writeFileSync(join(outDir, 'delegation-live.json'), JSON.stringify(report, null, 2))
writeFileSync(join(outDir, 'delegation-live.events.jsonl'),
  results.flatMap(r => r.events.map(e => JSON.stringify({ scenario: r.scenario.id, ...e }))).join('\n') + '\n')
console.log(JSON.stringify({ ...report, nodes: undefined, failures: report.failures.length }, null, 2))
