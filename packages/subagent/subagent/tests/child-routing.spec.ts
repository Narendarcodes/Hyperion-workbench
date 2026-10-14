import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { resolveRoutedChildAgentOptions } from '../src/child-agent.ts'
import type { ChildModelResolver, ChildRouteRequest } from '../src/child-agent.ts'

function parentAgent(withRoute = true): Agent {
  const id = SessionId('parent')
  return {
    id,
    options: withRoute
      ? { provider: 'droplet', model: 'llm', reasoningEffort: ReasoningEffortId('high'), maxTokens: 512 }
      : { maxTokens: 512 },
    session: Session.create(id),
  } as Agent
}

/** Role table resolver shaped like llm-router's AgentModelPolicy. */
function roleResolver(seen: ChildRouteRequest[] = []): ChildModelResolver {
  const roles: Record<string, string> = { fast: 'llm-fast', code: 'llm-code' }
  return {
    resolveChildRoute(req) {
      seen.push(req)
      if (req.explicit?.provider !== undefined && req.explicit.model !== undefined) {
        return { provider: req.explicit.provider, model: req.explicit.model, source: 'explicit' }
      }
      const model = req.role === undefined ? undefined : roles[req.role]
      if (model === undefined) return undefined
      return { provider: 'droplet', model, source: 'role', role: req.role, reason: `role ${req.role}` }
    },
  }
}

describe('routed child Agent options', () => {
  it('is the plain inherited merge when no resolver is composed', async () => {
    const r = await resolveRoutedChildAgentOptions(parentAgent(), undefined, 1, undefined, { role: 'fast' })
    expect(r.decision).toBeUndefined()
    expect(r.options).toEqual({ provider: 'droplet', model: 'llm', reasoningEffort: 'high', maxTokens: 512, subagentDepth: 1 })
  })

  it('routes a role to its model, passing depth, parent route, label and prompt', async () => {
    const seen: ChildRouteRequest[] = []
    const r = await resolveRoutedChildAgentOptions(parentAgent(), undefined, 2, roleResolver(seen), {
      role: 'fast', label: 'Extract readings', prompt: 'list the numbers', agentId: 'c1',
    })
    expect(r.options).toEqual({ provider: 'droplet', model: 'llm-fast', maxTokens: 512, subagentDepth: 2 })
    expect(r.decision?.source).toBe('role')
    expect(seen[0]).toEqual({
      agentId: 'c1', label: 'Extract readings', role: 'fast', prompt: 'list the numbers', depth: 2,
      parent: { provider: 'droplet', model: 'llm' },
    })
  })

  it('keeps the parent effort when the resolver returns the parent route', async () => {
    const same: ChildModelResolver = { resolveChildRoute: () => ({ provider: 'droplet', model: 'llm', source: 'parent' }) }
    const r = await resolveRoutedChildAgentOptions(parentAgent(), undefined, 1, same)
    expect(r.options.reasoningEffort).toBe('high')
  })

  it('applies a resolver-chosen effort, and an explicit requested effort over it', async () => {
    const withEffort: ChildModelResolver = {
      resolveChildRoute: () => ({ provider: 'droplet', model: 'llm-code', reasoningEffort: 'low', source: 'role' }),
    }
    expect((await resolveRoutedChildAgentOptions(parentAgent(), undefined, 1, withEffort)).options.reasoningEffort).toBe('low')
    expect((await resolveRoutedChildAgentOptions(parentAgent(), { reasoningEffort: ReasoningEffortId('max') }, 1, withEffort))
      .options.reasoningEffort).toBe('max')
  })

  it('forwards an explicit requested route as `explicit` and the resolver honours it', async () => {
    const seen: ChildRouteRequest[] = []
    const r = await resolveRoutedChildAgentOptions(parentAgent(), { provider: 'ollama', model: 'qwen3.5:4b' }, 1, roleResolver(seen), { role: 'fast' })
    expect(seen[0]?.explicit).toEqual({ provider: 'ollama', model: 'qwen3.5:4b' })
    expect(r.options).toMatchObject({ provider: 'ollama', model: 'qwen3.5:4b' })
    const partial: ChildRouteRequest[] = []
    await resolveRoutedChildAgentOptions(parentAgent(), { model: 'm' }, 1, roleResolver(partial))
    expect(partial[0]?.explicit).toEqual({ model: 'm' })
    const providerOnly: ChildRouteRequest[] = []
    await resolveRoutedChildAgentOptions(parentAgent(), { provider: 'p' }, 1, roleResolver(providerOnly))
    expect(providerOnly[0]?.explicit).toEqual({ provider: 'p' })
  })

  it('falls back to the inherited merge when the resolver declines or throws', async () => {
    const declined = await resolveRoutedChildAgentOptions(parentAgent(), undefined, 1, roleResolver(), { role: 'unknown' })
    expect(declined.decision).toBeUndefined()
    expect(declined.options.model).toBe('llm')
    const thrower: ChildModelResolver = { resolveChildRoute: () => Promise.reject(new Error('router down')) }
    const thrown = await resolveRoutedChildAgentOptions(parentAgent(), undefined, 1, thrower, { role: 'fast' })
    expect(thrown.options.model).toBe('llm')
  })

  it('omits the parent route when the parent has none', async () => {
    const seen: ChildRouteRequest[] = []
    const r = await resolveRoutedChildAgentOptions(parentAgent(false), undefined, 1, roleResolver(seen), { role: 'code' })
    expect(seen[0]?.parent).toBeUndefined()
    expect(r.options).toEqual({ provider: 'droplet', model: 'llm-code', maxTokens: 512, subagentDepth: 1 })
  })
})
