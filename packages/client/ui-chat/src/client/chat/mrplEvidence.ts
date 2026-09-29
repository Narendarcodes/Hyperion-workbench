/**
 * Demo-scoped MRPL Evidence detection for the chat view.
 *
 * The panel is a PRESENTATION MOCK for the MRPL prototype: it triggers only
 * on the mrpl-spec-check result/delivery prose and renders fixed demo copy
 * plus the tool's own output path extracted from that prose. No backend
 * evidence service exists behind it.
 * @module @deepseek-ai/dsh-client-ui-chat/client/chat/mrplEvidence
 */

import type { AssistantBlock } from '@deepseek-ai/dsh-client-ui-conversation/client'

/** Assistant prose blocks that carry MRPL result or delivery text. */
export function evidenceTextsOf(blocks: readonly AssistantBlock[]): readonly string[] {
  const texts: string[] = []
  for (const block of blocks) {
    if (block.kind === 'text' || block.kind === 'reasoning') texts.push(block.text)
  }
  return texts
}

/** MRPL compliance result heading plus the locked GFM table header. */
const RESULT_SIGNATURE = 'MRPL MG 91 Compliance Check'
const RESULT_TABLE_HEADER = '| Parameter | Specification |'
/** Skill delivery line posted after `mrpl_generate_report` succeeds. */
const REPORT_SIGNATURE = 'Compliance report ready'
/** Absolute tool `out_path` as the model quotes it (e.g. `Generated file: C:\…\.xlsx`). */
const WINDOWS_XLSX = /[a-z]:\\\S+?\.xlsx/i
/** dsh-web served artifact link posted with the delivery line. */
const SERVED_XLSX = /\/hyperion\/files\/\S+?\.xlsx/
/** Displayed when the prose carries no path (the served demo artifact). */
const DEMO_SAFE_PATH = '/hyperion/files/S-001_MG91_Compliance.xlsx'

/** Evidence attachment for one assistant message; undefined keeps the message bare. */
export interface MrplEvidence {
  readonly generatedPath: string
}

/**
 * Detect MRPL result/delivery prose and resolve the generated-file display path.
 * @param texts - assistant text/reasoning block contents, in order.
 * @returns the evidence attachment, or undefined for unrelated messages.
 */
export function extractMrplEvidence(texts: readonly string[]): MrplEvidence | undefined {
  const joined = texts.join('\n')
  const isResult = joined.includes(RESULT_SIGNATURE) && joined.includes(RESULT_TABLE_HEADER)
  const isReport = joined.includes(REPORT_SIGNATURE) && joined.includes('.xlsx')
  if (!isResult && !isReport) return undefined
  const generatedPath = WINDOWS_XLSX.exec(joined)?.[0]
    ?? SERVED_XLSX.exec(joined)?.[0]
    ?? DEMO_SAFE_PATH
  return { generatedPath }
}
