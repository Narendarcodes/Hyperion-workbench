/**
 * Self-hosted GPU droplet model registrations (AMD MI300X).
 *
 * The droplet serves gpt-oss-120b through vLLM's OpenAI-compatible API on
 * 127.0.0.1:8001 INSIDE the droplet, under the served-model-name `llm`. Hosts
 * reach it through an SSH local forward (default local port 8001), so the
 * base URL is always loopback and no droplet address leaks into requests.
 *
 * Only `llm` is verified live. `llm-fast`, `llm-vision` and `llm-code` are
 * PLACEHOLDERS: registered disabled so role policies can name them today and
 * flip them on when a matching vLLM server is started. Until then a role that
 * maps to a placeholder falls through to its fallback chain.
 *
 * @module @deepseek-ai/dsh-llm-router/droplet
 */

import type { ModelProfile } from './registry.ts'

/** Provider id every droplet model registers under. */
export const DROPLET_PROVIDER = 'droplet'

/** Connection facts for the droplet vLLM endpoint. */
export interface DropletEndpoint {
  /** Public droplet address (documentation only; traffic goes through the tunnel). */
  readonly host: string
  /** Port vLLM listens on inside the droplet. */
  readonly remotePort: number
  /** Local port of the SSH forward on the host. */
  readonly localPort: number
  /** OpenAI-compatible base URL the host calls. */
  readonly baseUrl: string
}

/** Default endpoint: `ssh -L 8001:127.0.0.1:8001 root@165.245.133.12`. */
export const DEFAULT_DROPLET_ENDPOINT: DropletEndpoint = Object.freeze({
  host: '165.245.133.12',
  remotePort: 8001,
  localPort: 8001,
  baseUrl: 'http://127.0.0.1:8001/v1',
})

/**
 * Build a droplet endpoint for a different local forward port.
 * @param localPort - local port the SSH forward listens on.
 * @returns a frozen endpoint description.
 */
export function dropletEndpoint(localPort = 8001): DropletEndpoint {
  return Object.freeze({ ...DEFAULT_DROPLET_ENDPOINT, localPort, baseUrl: `http://127.0.0.1:${localPort}/v1` })
}

/** Per-1M-token price used for cost scoring (USD). Self-hosted: amortised GPU time, not list price. */
export interface ModelPricing {
  readonly inputPerMTok: number
  readonly outputPerMTok: number
}

/**
 * Amortised cost assumptions for the droplet (proposed, not measured):
 * the MI300X is billed hourly whether busy or idle, so the marginal token
 * cost is set to a nominal figure that keeps droplet routes cheaper than
 * cloud tiers in cost comparisons.
 */
export const DROPLET_PRICING: Record<string, ModelPricing> = {
  'llm': { inputPerMTok: 0.05, outputPerMTok: 0.2 },
  'llm-fast': { inputPerMTok: 0.02, outputPerMTok: 0.08 },
  'llm-vision': { inputPerMTok: 0.05, outputPerMTok: 0.2 },
  'llm-code': { inputPerMTok: 0.04, outputPerMTok: 0.15 },
}

/** Droplet model profiles. `llm` is live; the rest are disabled placeholders. */
export const DROPLET_MODELS: readonly ModelProfile[] = Object.freeze([
  {
    id: 'llm',
    provider: DROPLET_PROVIDER,
    name: 'gpt-oss-120b (droplet vLLM, served as `llm`)',
    contextWindow: 16384,
    costTier: 'low',
    capabilities: {
      ocr_document: 0.1,
      code_automation: 0.9,
      engineering_reasoning: 0.93,
      deliverable_report: 0.9,
      conversational: 0.88,
    },
    enabled: true,
  },
  {
    id: 'llm-fast',
    provider: DROPLET_PROVIDER,
    name: 'Fast small model (droplet placeholder)',
    contextWindow: 32768,
    costTier: 'low',
    capabilities: {
      ocr_document: 0.1,
      code_automation: 0.6,
      engineering_reasoning: 0.55,
      deliverable_report: 0.6,
      conversational: 0.92,
    },
    enabled: false,
  },
  {
    id: 'llm-vision',
    provider: DROPLET_PROVIDER,
    name: 'Vision / OCR model (droplet placeholder)',
    contextWindow: 32768,
    costTier: 'low',
    capabilities: {
      ocr_document: 0.95,
      code_automation: 0.3,
      engineering_reasoning: 0.4,
      deliverable_report: 0.4,
      conversational: 0.5,
    },
    enabled: false,
  },
  {
    id: 'llm-code',
    provider: DROPLET_PROVIDER,
    name: 'Code model (droplet placeholder)',
    contextWindow: 32768,
    costTier: 'low',
    capabilities: {
      ocr_document: 0.1,
      code_automation: 0.95,
      engineering_reasoning: 0.8,
      deliverable_report: 0.6,
      conversational: 0.6,
    },
    enabled: false,
  },
])

/**
 * Copy the droplet profiles, optionally enabling placeholders that are now
 * actually served.
 * @param enabled - ids to force-enable (e.g. `['llm-fast']` once it is running).
 * @returns fresh mutable profiles.
 */
export function dropletModels(enabled: readonly string[] = []): ModelProfile[] {
  const on = new Set(enabled)
  return DROPLET_MODELS.map(m => ({
    ...m,
    capabilities: { ...m.capabilities },
    enabled: m.enabled || on.has(m.id),
  }))
}
