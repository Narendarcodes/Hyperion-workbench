import type { ModelParams } from './types'
import type { AdapterInvoker } from './router'

/**
 * Universal adapter for invoking models across different providers.
 */
export class UniversalModelAdapter implements AdapterInvoker {
  async invoke(modelId: string, params: ModelParams, prompt: string): Promise<any> {
    // In a real system, this would look up the correct provider (OpenAI, Anthropic, local)
    // based on modelId and format the request appropriately.
    // Here we provide a mock implementation to satisfy the router interface.
    
    console.log(`[Adapter] Invoking model: ${modelId} with params:`, params)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300))

    return {
      modelId,
      text: `Mocked response from ${modelId} for prompt: "${prompt.substring(0, 30)}..."`,
      usage: {
        promptTokens: Math.ceil(prompt.length / 4),
        completionTokens: 25,
        totalTokens: Math.ceil(prompt.length / 4) + 25
      }
    }
  }
}
