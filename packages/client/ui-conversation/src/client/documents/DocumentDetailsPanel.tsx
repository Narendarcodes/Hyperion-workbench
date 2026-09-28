/**
 * DocumentDetailsPanel: Right-column document metadata, quick actions, and Hyperion AI assistant.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/documents/DocumentDetailsPanel
 */

import { useState } from 'react'
import type { DetailsTab, DocumentItem } from './types.ts'
import css from './DocumentDetailsPanel.module.css'

export interface DocumentDetailsPanelProps {
  readonly document: DocumentItem
  readonly onOpenFullscreen?: () => void
  readonly onDownload?: () => void
  readonly onAddToInvestigation?: (doc: DocumentItem) => void
  readonly onCompareVersion?: (doc: DocumentItem) => void
  readonly onAskCopilot?: (question: string) => void
}

export function DocumentDetailsPanel({
  document,
  onOpenFullscreen,
  onDownload,
  onAddToInvestigation,
  onCompareVersion,
  onAskCopilot,
}: DocumentDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailsTab>('details')
  const [question, setQuestion] = useState('')

  const handleChipClick = (prompt: string) => {
    setQuestion(prompt)
    onAskCopilot?.(prompt)
  }

  const handleSend = () => {
    if (question.trim() !== '') {
      onAskCopilot?.(question)
      setQuestion('')
    }
  }

  return (
    <section className={css.detailsRoot} aria-label="Document Details and AI Assistant">
      {/* 1. Header */}
      <div className={css.panelHeader}>
        <div className={css.titleRow}>
          <h2 className={css.panelTitle} title={document.name}>{document.name}</h2>
          <span className={css.typeBadge}>
            <span className={css.badgeDot} />
            {document.type}
          </span>
        </div>
        <p className={css.panelSubtitle}>{document.subtitle}</p>
      </div>

      {/* 2. Tabs */}
      <div className={css.tabsBar} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'details'}
          className={`${css.tabItem} ${activeTab === 'details' ? css.tabItemActive : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'related'}
          className={`${css.tabItem} ${activeTab === 'related' ? css.tabItemActive : ''}`}
          onClick={() => setActiveTab('related')}
        >
          Related
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'versions'}
          className={`${css.tabItem} ${activeTab === 'versions' ? css.tabItemActive : ''}`}
          onClick={() => setActiveTab('versions')}
        >
          Versions
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'activity'}
          className={`${css.tabItem} ${activeTab === 'activity' ? css.tabItemActive : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
      </div>

      {/* 3. Scrollable Content */}
      <div className={css.scrollContent}>
        {/* Metadata List */}
        <div className={css.metaList}>
          <div className={css.metaItem}>
            <span className={css.metaKey}>
              <span className={css.metaIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </span>
              File Name
            </span>
            <span className={css.metaVal}>{document.name}</span>
          </div>

          <div className={css.metaItem}>
            <span className={css.metaKey}>
              <span className={css.metaIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </span>
              Document Type
            </span>
            <span className={css.metaVal}>
              {document.type === 'P&ID' ? 'P&ID Drawing' : document.type}
            </span>
          </div>

          <div className={css.metaItem}>
            <span className={css.metaKey}>
              <span className={css.metaIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="9" y1="22" x2="9" y2="2" />
                </svg>
              </span>
              Unit
            </span>
            <span className={css.metaVal}>{document.unit}</span>
          </div>

          <div className={css.metaItem}>
            <span className={css.metaKey}>
              <span className={css.metaIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              Area
            </span>
            <span className={css.metaVal}>{document.area}</span>
          </div>

          <div className={css.metaItem}>
            <span className={css.metaKey}>
              <span className={css.metaIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </span>
              Revision
            </span>
            <span className={css.metaVal}>{document.revision}</span>
          </div>

          <div className={css.metaItem}>
            <span className={css.metaKey}>
              <span className={css.metaIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              Date
            </span>
            <span className={css.metaVal}>{document.date}</span>
          </div>

          <div className={css.metaItem}>
            <span className={css.metaKey}>
              <span className={css.metaIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </span>
              Size
            </span>
            <span className={css.metaVal}>{document.size}</span>
          </div>

          <div className={css.metaItem}>
            <span className={css.metaKey}>
              <span className={css.metaIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              Uploaded By
            </span>
            <span className={css.metaVal}>{document.uploadedBy}</span>
          </div>

          <div className={css.metaItem}>
            <span className={css.metaKey}>
              <span className={css.metaIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              </span>
              Tags
            </span>
            <div className={css.tagsRow}>
              {document.tags.map(tag => (
                <span key={tag} className={css.tagPill}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions (2x2 Grid) */}
        <div className={css.quickActionsSection}>
          <h3 className={css.sectionHeading}>Quick Actions</h3>
          <div className={css.actionGrid}>
            <button
              type="button"
              className={css.primaryActionBtn}
              onClick={onOpenFullscreen}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
              Open Full Screen
            </button>

            <button
              type="button"
              className={css.secondaryActionBtn}
              onClick={onDownload}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </button>

            <button
              type="button"
              className={css.secondaryActionBtn}
              onClick={() => onAddToInvestigation?.(document)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" />
              </svg>
              Add to Investigation
            </button>

            <button
              type="button"
              className={css.secondaryActionBtn}
              onClick={() => onCompareVersion?.(document)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Compare Version
            </button>
          </div>
        </div>

        {/* Ask Hyperion Copilot Card */}
        <div className={css.copilotCard}>
          <div className={css.copilotHeader}>
            <svg className={css.sparkleIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <div className={css.copilotTitleGroup}>
              <span className={css.copilotTitle}>Ask Hyperion about this document</span>
              <span className={css.copilotDesc}>Get insights, summarize, or find specific information.</span>
            </div>
          </div>

          <div className={css.promptChips}>
            <div className={css.chipRow}>
              <button
                type="button"
                className={css.chipBtn}
                onClick={() => handleChipClick('Summarize this P&ID')}
              >
                <svg className={css.chipIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Summarize this P&ID
              </button>

              <button
                type="button"
                className={css.chipBtn}
                onClick={() => handleChipClick('Find P-101 details')}
              >
                <svg className={css.chipIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Find P-101 details
              </button>
            </div>

            <div className={css.chipRow}>
              <button
                type="button"
                className={css.chipBtn}
                onClick={() => handleChipClick('List all equipment')}
              >
                <svg className={css.chipIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                List all equipment
              </button>

              <button
                type="button"
                className={css.chipBtn}
                onClick={() => handleChipClick('Show related documents')}
              >
                <svg className={css.chipIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Show related documents
              </button>
            </div>
          </div>

          {/* Copilot Input */}
          <div className={css.copilotInputBox}>
            <input
              type="text"
              className={css.copilotInput}
              placeholder="Ask a question about this document..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend()
              }}
            />
            <div className={css.copilotToolsRow}>
              <div className={css.copilotToolsLeft}>
                <button type="button" className={css.toolIconBtn} aria-label="Add attachment" title="Add attachment">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button type="button" className={css.toolIconBtn} aria-label="Attach file" title="Attach file">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <button type="button" className={css.toolTextPill}>
                  <span>@ Context</span>
                </button>
                <button type="button" className={css.toolTextPill}>
                  <span>✨ Skill</span>
                </button>
                <button type="button" className={css.toolTextPill}>
                  <span>⚙ Auto ▾</span>
                </button>
              </div>

              <button
                type="button"
                className={css.sendBtn}
                aria-label="Send question to Hyperion"
                onClick={handleSend}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
