import type { PromptFeatures } from './types'

export class PromptClassifier {
  /**
   * Analyzes the prompt and context to extract routing features.
   */
  static classify(prompt: string, context?: any): PromptFeatures {
    const isMultimodal = this.checkMultimodal(context)
    // Simple heuristic regexes
    const hasCode = /```|function |const |let |class |def |public |import /i.test(prompt)
    const hasMath = /\$|\\\[|\\\(|\\sum|\\int|\\frac/i.test(prompt)
    const requiresTools = /(search|compute|calculate|plot|find|fetch|lookup)/i.test(prompt)
    const isLongContext = prompt.length > 5000 // Basic heuristic for tokens > ~1k
    const tokenCountEstimate = Math.ceil(prompt.length / 4)
    
    const explicitTags: string[] = []
    if (/(summarize|tldr|tl;dr)/i.test(prompt)) explicitTags.push('summarize')
    if (/(translate|translating)/i.test(prompt)) explicitTags.push('translation')
    if (/(rag|document|database)/i.test(prompt)) explicitTags.push('rag')

    return {
      isMultimodal,
      hasCode,
      hasMath,
      requiresTools,
      isLongContext,
      explicitTags,
      tokenCountEstimate,
    }
  }

  private static checkMultimodal(context?: any): boolean {
    if (!context) return false
    if (context.attachments && Array.isArray(context.attachments)) {
      return context.attachments.some((a: any) => a.type && String(a.type).startsWith('image/'))
    }
    return false
  }
}
