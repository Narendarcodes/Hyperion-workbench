/**
 * Reports page. Every control is live: the header search filters the real
 * deliverables list, "+ Generate Report" asks the LLM + RAG answerer for a
 * cited report on a topic and saves it as a downloadable Markdown deliverable
 * on this host, and the library below (DeliverablesStrip) lists, filters,
 * opens, downloads, shares and deletes real files. The former mock library,
 * preview pane, summary cards and related-items panel were fixture-only and
 * are removed (see docs in out/mrpl-wire/reports.md).
 * @module @deepseek-ai/dsh-client-ui-conversation/client/reports/ReportsOverview
 */

import { useState, type FormEvent } from 'react'
import { useMrplSource } from '../mrpl/api.ts'
import { workbenchTokensClass } from '../mrpl/Workbench.tsx'
import { DeliverablesStrip } from './DeliverablesStrip.tsx'
import { REPORTS_CONFIG } from './report-library.ts'
import css from './ReportsOverview.module.css'

export interface ReportsOverviewProps {
  readonly localState?: 'available' | 'unavailable' | undefined
}

type GenerateState =
  | { readonly status: 'idle' }
  | { readonly status: 'running'; readonly topic: string }
  | { readonly status: 'done'; readonly fileName: string; readonly href: string; readonly citations: number; readonly abstain: boolean }
  | { readonly status: 'error'; readonly message: string }

export function ReportsOverview(_props: ReportsOverviewProps) {
  const source = useMrplSource()
  const [query, setQuery] = useState('')
  const [composing, setComposing] = useState(false)
  const [topic, setTopic] = useState('')
  const [generate, setGenerate] = useState<GenerateState>({ status: 'idle' })
  const [reloadKey, setReloadKey] = useState(0)
  const canGenerate = source.generateReport !== undefined

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    const wanted = topic.trim()
    if (wanted.length === 0 || source.generateReport === undefined) return
    setGenerate({ status: 'running', topic: wanted })
    try {
      const result = await source.generateReport({ topic: wanted })
      setGenerate({ status: 'done', fileName: result.deliverable.fileName, href: result.deliverable.href, citations: result.citations, abstain: result.abstain })
      setReloadKey(key => key + 1)
    } catch (error) {
      setGenerate({ status: 'error', message: String(error instanceof Error ? error.message : error) })
    }
  }

  return (
    <div className={`${css.root} ${workbenchTokensClass}`} data-hide-composer="" role="region" aria-label="Reports">
      <div className={css.watermarkBg} />
      <header className={css.header}>
        <div className={css.headerLeft}>
          <div className={css.breadcrumb}>Reports / All Reports</div>
          <h1 className={css.title}>Reports</h1>
          <div className={css.subtitle}>
            Cited engineering reports generated from the indexed corpus, plus sample deliverables • MRPL Refinery
          </div>
        </div>
        <div className={css.headerRight}>
          <div className={css.searchBox}>
            <input
              type="search"
              placeholder="Search reports by name, title or corpus document..."
              aria-label="Search reports"
              className={css.searchInput}
              value={query}
              onChange={(event) =>{  setQuery(event.target.value) }}
            />
          </div>
          <button
            type="button"
            className={css.generateBtn}
            disabled={!canGenerate}
            title={canGenerate ? 'Generate a cited report with Hyperion (LLM + RAG)' : 'Report generation needs the live Hyperion host'}
            aria-expanded={composing}
            onClick={() =>{  setComposing(open => !open) }}
          >
            + Generate Report
          </button>
        </div>
      </header>

      {composing && canGenerate && (
        <form className={css.librarySearchRow} aria-label="Generate report" onSubmit={(event) => { void submit(event) }}>
          <input
            className={css.libSearchInput}
            aria-label="Report topic"
            placeholder="Topic, e.g. MG 91 sulphur and RVP compliance"
            maxLength={REPORTS_CONFIG.maxTopicLength}
            value={topic}
            onChange={(event) =>{  setTopic(event.target.value) }}
          />
          <button type="submit" className={css.btnBlue} disabled={generate.status === 'running' || topic.trim().length === 0}>
            {generate.status === 'running' ? 'Generating…' : 'Generate'}
          </button>
          {generate.status === 'done' && (
            <span role="status" aria-label="Report generated">
              {generate.abstain ? 'Hyperion abstained — saved ' : `Saved with ${String(generate.citations)} citation${generate.citations === 1 ? '' : 's'}: `}
              <a href={generate.href} download={generate.fileName}>{generate.fileName}</a>
            </span>
          )}
          {generate.status === 'error' && <span role="alert" aria-label="Report generation failed">{generate.message}</span>}
        </form>
      )}

      <DeliverablesStrip query={query} reloadKey={reloadKey} />
    </div>
  )
}
