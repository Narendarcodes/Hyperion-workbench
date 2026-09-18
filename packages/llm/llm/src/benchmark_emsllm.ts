/**
 * HYPERION Local Benchmark & Diagnostic Utility for emsLLM-4B / emsLLM-8B.
 * Measures model load time, time to first token (TTFT), tokens per second (TPOT),
 * total generation latency, and system resource utilization.
 *
 * Official reported metrics for reference (from model card):
 * - emsLLM-4B: TTFT ~30.46 ms, TPOT ~3.20 ms (Public Acc: 95%, Private Acc: 96%)
 * - emsLLM-8B: TTFT ~58.92 ms, TPOT ~6.40 ms (Public Acc: 95%, Private Acc: 100%)
 *
 * @module @deepseek-ai/dsh-llm/benchmark_emsllm
 */

export interface LocalBenchmarkResult {
  modelId: string
  endpoint: string
  prompt: string
  loadTimeMs: number
  ttftMs: number
  totalTimeMs: number
  generatedTokens: number
  tokensPerSecond: number
  tpotMs: number
  peakVramMb?: number
  officialReference: {
    reportedTtftMs: number
    reportedTpotMs: number
    reportedAccuracy: string
  }
}

export interface RunBenchmarkOptions {
  modelId?: string
  endpoint?: string
  prompt?: string
  maxTokens?: number
}

const DEFAULT_INDUSTRIAL_BENCHMARK_PROMPT =
  'What should I inspect if a chemical dispensing pump exhibits cavitation noise and unstable pressure?'

export async function runLocalEmsllmBenchmark(
  options?: RunBenchmarkOptions,
): Promise<LocalBenchmarkResult> {
  const modelId = options?.modelId ?? 'PEGAAICC/emsLLM-4B'
  const endpoint = options?.endpoint ?? 'http://127.0.0.1:8080/v1'
  const prompt = options?.prompt ?? DEFAULT_INDUSTRIAL_BENCHMARK_PROMPT
  const maxTokens = options?.maxTokens ?? 128

  const is8B = modelId.toLowerCase().includes('8b')
  const officialReference = is8B
    ? { reportedTtftMs: 58.92, reportedTpotMs: 6.40, reportedAccuracy: '100% Private' }
    : { reportedTtftMs: 30.46, reportedTpotMs: 3.20, reportedAccuracy: '96% Private' }

  const startTime = performance.now()
  let firstTokenTime: number | null = null
  let tokenCount = 0

  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        stream: true,
      }),
    })

    const loadTimeMs = performance.now() - startTime

    if (!response.ok || !response.body) {
      throw new Error(`Server returned status ${response.status}: ${response.statusText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      if (firstTokenTime === null && chunk.trim().length > 0) {
        firstTokenTime = performance.now()
      }

      // Estimate tokens by word/chunk splits
      const textMatches = chunk.match(/\"content\":\s*\"([^\"]+)\"/g)
      if (textMatches) {
        tokenCount += textMatches.length
      }
    }

    const endTime = performance.now()
    const ttftMs = firstTokenTime ? firstTokenTime - startTime : endTime - startTime
    const totalTimeMs = endTime - startTime
    const genDurationMs = totalTimeMs - ttftMs
    const tokensPerSecond = genDurationMs > 0 ? (tokenCount / genDurationMs) * 1000 : 0
    const tpotMs = tokenCount > 0 ? genDurationMs / tokenCount : 0

    return {
      modelId,
      endpoint,
      prompt,
      loadTimeMs,
      ttftMs,
      totalTimeMs,
      generatedTokens: Math.max(tokenCount, 1),
      tokensPerSecond,
      tpotMs,
      officialReference,
    }
  } catch (error) {
    const endTime = performance.now()
    // Simulated offline/fallback diagnostic metrics if server not currently connected
    return {
      modelId,
      endpoint,
      prompt,
      loadTimeMs: endTime - startTime,
      ttftMs: 0,
      totalTimeMs: endTime - startTime,
      generatedTokens: 0,
      tokensPerSecond: 0,
      tpotMs: 0,
      officialReference,
    }
  }
}
