import { PromptClassifier } from './classifier'
import type { PromptFeatures, ModelParams, ModelRouter } from './types'

export interface AdapterInvoker {
  invoke(modelId: string, params: ModelParams, prompt: string): Promise<any>
}

export class AutoRouter implements ModelRouter {
  private adapter: AdapterInvoker | undefined

  constructor(adapter?: AdapterInvoker) {
    this.adapter = adapter
  }

  classifyPrompt(prompt: string, context?: any): PromptFeatures {
    return PromptClassifier.classify(prompt, context)
  }

  selectModel(features: PromptFeatures) {
    // The policy logic
    let modelId = 'gpt-4o-mini' // default to cheap, fast model
    let route = 'short-chat'
    let fallbacks = ['gpt-4o', 'claude-3.5-sonnet']

    if (features.isMultimodal) {
      modelId = 'gpt-4o'
      route = 'multimodal'
      fallbacks = ['gemini-1.5-pro']
    } else if (features.hasCode || features.requiresTools) {
      modelId = 'gpt-4.1'
      route = 'code-generation'
      fallbacks = ['gpt-4o-mini', 'claude-3.5-sonnet']
    } else if (features.explicitTags.includes('rag') || features.hasMath) {
      modelId = 'gpt-4.1'
      route = 'high-accuracy'
      fallbacks = ['gpt-4o']
    } else if (features.isLongContext) {
      modelId = 'gpt-4.1'
      route = 'long-context'
      fallbacks = ['gpt-4o']
    }

    const params: ModelParams = {
      temperature: 0.7,
      maxTokens: 4096
    }

    return { modelId, params, route, fallbacks }
  }

  async invokeModel(modelId: string, params: ModelParams, prompt: string): Promise<any> {
    if (!this.adapter) {
      throw new Error('No adapter provided to router')
    }
    try {
      return await this.adapter.invoke(modelId, params, prompt)
    } catch (e) {
      console.warn(`Primary model ${modelId} failed, fallbacks not yet automatically handled in base wrapper`, e)
      throw e
    }
  }
}
