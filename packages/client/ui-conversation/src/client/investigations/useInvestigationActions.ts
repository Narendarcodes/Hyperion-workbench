/**
 * useInvestigationActions: the real actions of one investigation, shared by
 * the list page and the detail view. Share copies a deep link; status and
 * assignment persist in the store; Rerun / Compare run the grounded RAG/LLM
 * analysis; Generate report downloads a cited Markdown deliverable.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/useInvestigationActions
 */

import { useCallback, useState } from 'react'
import type { MrplEvidenceAnswerResponse } from '../mrpl/contract.ts'
import { useMrplSource } from '../mrpl/api.ts'
import { INVESTIGATION_STATUSES, investigationsConfig } from './config.ts'
import {
  buildInvestigationReport,
  downloadTextFile,
  reportFileName,
  runInvestigationAnalysis,
  shareInvestigation,
  type InvestigationRef,
} from './investigation-actions.ts'
import { investigationStore } from './investigation-store.ts'
import type { ActionMenuItem } from './ActionMenu.tsx'
import type { InvestigationStatus } from './types.ts'

export interface InvestigationActions {
  readonly busy: string | null
  readonly notice: string | null
  readonly result: { readonly title: string; readonly answer: MrplEvidenceAnswerResponse } | null
  readonly canAnalyse: boolean
  share: () => void
  setStatus: (status: InvestigationStatus) => void
  assignToMe: () => void
  rerun: (kind?: 'root-cause' | 'compare') => void
  generateReport: () => void
  statusItems: (current: InvestigationStatus) => ActionMenuItem[]
}

const message = (e: unknown): string => (e instanceof Error ? e.message : String(e))

export function useInvestigationActions(inv: InvestigationRef): InvestigationActions {
  const source = useMrplSource()
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [result, setResult] = useState<InvestigationActions['result']>(null)
  const { code, tag, title, statusLabel } = inv

  const share = useCallback(() => {
    const clip = typeof navigator === 'undefined' ? undefined : navigator.clipboard
    shareInvestigation(code, window.location.href, clip)
      .then((link) => { setNotice(`Link copied: ${link}`) })
      .catch((e: unknown) => { setNotice(`Could not copy link: ${message(e)}`) })
  }, [code])

  const setStatus = useCallback((status: InvestigationStatus) => {
    const store = investigationStore()
    if (store.find(code) === undefined) {
      setNotice(`${code} is not in the investigation store`)
      return
    }
    store.setStatus(code, status)
    setNotice(`${code} status set to ${investigationsConfig().statusLabels[status]}`)
  }, [code])

  const assignToMe = useCallback(() => {
    const name = investigationsConfig().currentUserName
    investigationStore().assign(code, name)
    setNotice(`${code} assigned to ${name}`)
  }, [code])

  const rerun = useCallback((kind: 'root-cause' | 'compare' = 'root-cause') => {
    setBusy(kind === 'compare' ? 'Comparing with similar equipment…' : `Running analysis for ${tag}…`)
    setNotice(null)
    runInvestigationAnalysis(source, { code, tag, title }, kind)
      .then((answer) => {
        setResult({ title: kind === 'compare' ? `Comparison — ${tag}` : `Analysis — ${tag}`, answer })
        setNotice(`Analysis complete · ${String(answer.citations.length)} citation(s)`)
      })
      .catch((e: unknown) => { setNotice(`Analysis failed: ${message(e)}`) })
      .finally(() => { setBusy(null) })
  }, [source, code, tag, title])

  const generateReport = useCallback(() => {
    setBusy(`Generating report for ${code}…`)
    setNotice(null)
    runInvestigationAnalysis(source, { code, tag, title })
      .then((answer) => {
        const ref = statusLabel === undefined ? { code, tag, title } : { code, tag, title, statusLabel }
        const md = buildInvestigationReport(ref, answer, new Date())
        downloadTextFile(reportFileName(code), md)
        setResult({ title: `Report — ${code}`, answer })
        setNotice(`Report downloaded: ${reportFileName(code)} · ${String(answer.citations.length)} citation(s)`)
      })
      .catch((e: unknown) => { setNotice(`Report failed: ${message(e)}`) })
      .finally(() => { setBusy(null) })
  }, [source, code, tag, title, statusLabel])

  const statusItems = useCallback((current: InvestigationStatus): ActionMenuItem[] =>
    INVESTIGATION_STATUSES.map(s => ({
      id: `status-${s}`,
      label: investigationsConfig().statusLabels[s],
      checked: s === current,
      onSelect: () => { setStatus(s) },
    })), [setStatus])

  return {
    busy,
    notice: busy ?? notice,
    result,
    canAnalyse: source.answerEvidence !== undefined,
    share,
    setStatus,
    assignToMe,
    rerun,
    generateReport,
    statusItems,
  }
}
