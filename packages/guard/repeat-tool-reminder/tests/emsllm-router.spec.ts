import { describe, expect, it } from 'vitest'
import {
  DEFAULT_INDUSTRIAL_CANDIDATES,
  routeIndustrialTask,
  runLocalEmsllmBenchmark,
} from '../../../../packages/llm/llm/src/index.ts'
import {
  buildIndustrialSystemPrompt,
  DEFAULT_INDUSTRIAL_SYSTEM_PROMPT,
} from '../../../../packages/context/agent-instructions/src/index.ts'

describe('emsLLM-4B Industrial Maintenance Specialist Integration', () => {
  it('TEST 1: Model Discovery & Capability Registration', () => {
    const ems4b = DEFAULT_INDUSTRIAL_CANDIDATES.find(c => c.id === 'emsllm-4b')

    expect(ems4b).toBeDefined()
    expect(ems4b?.domain).toBe('industrial-maintenance')
    expect(ems4b?.localOnly).toBe(true)
    expect(ems4b?.capabilities).toContain('fault-diagnosis-reasoning')
    expect(ems4b?.capabilities).toContain('sop-generation')
  })

  it('TEST 2: Router selects emsLLM-4B for Industrial Maintenance Queries', () => {
    const query = 'What should I inspect if the dispensing machine is showing inconsistent output and pressure loss?'
    const decision = routeIndustrialTask(query)

    expect(decision.isIndustrialTask).toBe(true)
    expect(decision.domain).toBe('industrial-maintenance')
    expect(decision.selectedModelId).toBe('emsllm-4b')
    expect(decision.matchedKeywords).toContain('dispensing machine')
    expect(decision.taskType).toBe('fault-diagnosis')
  })

  it('TEST 3: Router selects emsLLM-4B for SOP Generation Queries', () => {
    const query = 'Generate a standard operating procedure (SOP) for pump cavitation maintenance.'
    const decision = routeIndustrialTask(query)

    expect(decision.isIndustrialTask).toBe(true)
    expect(decision.selectedModelId).toBe('emsllm-4b')
    expect(decision.taskType).toBe('sop-generation')
    expect(decision.capabilitiesRequired).toContain('sop-generation')
  })

  it('TEST 4: Router passes non-industrial queries to generalist model', () => {
    const query = 'Write a Python function to sort a list of numbers.'
    const decision = routeIndustrialTask(query)

    expect(decision.isIndustrialTask).toBe(false)
    expect(decision.domain).toBe('general')
    expect(decision.selectedModelId).not.toBe('emsllm-4b')
  })

  it('TEST 5: Industrial System Prompt formatting with safety and grounding', () => {
    const prompt = buildIndustrialSystemPrompt({
      organizationName: 'Refinery Alpha',
      requireCitations: true,
    })

    expect(prompt).toContain('You are an industrial maintenance reasoning specialist')
    expect(prompt).toContain('Ground your analysis strictly in the provided retrieved evidence')
    expect(prompt).toContain('PPE (Personal Protective Equipment), LOTO (Lockout/Tagout)')
    expect(prompt).toContain('Refinery Alpha')
    expect(prompt).toContain('[SOURCE X]')
  })

  it('TEST 6: Local Benchmark Metric Calculation', async () => {
    const res = await runLocalEmsllmBenchmark({
      modelId: 'PEGAAICC/emsLLM-4B',
      maxTokens: 32,
    })

    expect(res.modelId).toBe('PEGAAICC/emsLLM-4B')
    expect(res.officialReference).toBeDefined()
    expect(res.officialReference.reportedTtftMs).toBe(30.46)
    expect(res.officialReference.reportedTpotMs).toBe(3.20)
  })
})
