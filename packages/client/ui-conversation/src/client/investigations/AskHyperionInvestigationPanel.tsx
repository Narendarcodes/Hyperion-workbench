/**
 * AskHyperionInvestigationPanel: Right-side panel providing contextual AI assistance,
 * suggested investigation prompts, active context card, and quick engineering actions.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/AskHyperionInvestigationPanel
 */

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  IconContextInjectionOutline16,
  IconPaperclipOutline16,
  IconPlusOutline16,
  IconSkillOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { AISuggestedAction, SelectedInvestigation } from './types.ts'
import css from './AskHyperionInvestigationPanel.module.css'

export interface AskHyperionInvestigationPanelProps {
  readonly investigation: SelectedInvestigation
  readonly suggestedActions: readonly AISuggestedAction[]
  readonly onSendQuery?: (query: string) => void
  readonly onEditContext?: () => void
  readonly onQuickAction?: (actionId: string) => void
}

export function AskHyperionInvestigationPanel({
  investigation,
  suggestedActions,
  onSendQuery,
  onEditContext,
  onQuickAction,
}: AskHyperionInvestigationPanelProps) {
  const [inputText, setInputText] = useState('')

  const handleSelectSuggested = (action: AISuggestedAction) => {
    setInputText(action.promptQuery)
    onSendQuery?.(action.promptQuery)
  }

  const handleSend = () => {
    const trimmed = inputText.trim()
    if (!trimmed) return
    onSendQuery?.(trimmed)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const { context } = investigation

  return (
    <aside className={css.panelRoot} aria-labelledby="ask-heading">
      {/* 1. Ask Hyperion AI Assistance Section */}
      <div className={css.askSection}>
        <div className={css.askHeader}>
          <div className={css.titleRow}>
            <span className={css.sparkleBadge} aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
              </svg>
            </span>
            <h3 id="ask-heading" className={css.askTitle}>Ask Hyperion</h3>
          </div>
          <p className={css.askSubtitle}>Get AI assistance for this investigation</p>
        </div>

        {/* Suggested Actions List */}
        <div className={css.suggestedActionsList} role="group" aria-label="Suggested AI actions">
          {suggestedActions.map(action => (
            <button
              key={action.id}
              type="button"
              className={css.suggestedActionBtn}
              onClick={() => handleSelectSuggested(action)}
              title={action.promptQuery}
            >
              <span className={css.suggestedActionText}>{action.text}</span>
            </button>
          ))}
        </div>

        {/* Embedded AI Composer */}
        <div className={css.composerCard}>
          <input
            type="text"
            className={css.composerInput}
            placeholder="Ask about this investigation..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Ask about this investigation"
          />

          <div className={css.composerControls}>
            <div className={css.leftTools}>
              <button
                type="button"
                className={css.toolBtn}
                aria-label="Add"
                title="Add action"
              >
                <IconPlusOutline16 size={13} />
              </button>
              <button
                type="button"
                className={css.toolBtn}
                aria-label="Attach file"
                title="Attach"
              >
                <IconPaperclipOutline16 size={13} />
              </button>
              <button
                type="button"
                className={css.chipBtn}
                onClick={() => setInputText(prev => `${prev} @${investigation.tag} `)}
                aria-label="Add context tag"
              >
                <IconContextInjectionOutline16 size={11} />
                <span>Context</span>
              </button>
              <button
                type="button"
                className={css.chipBtn}
                onClick={() => setInputText(prev => `${prev} /investigate `)}
                aria-label="Add skill command"
              >
                <IconSkillOutline16 size={11} />
                <span>Skill</span>
              </button>
            </div>

            <div className={css.rightTools}>
              <button
                type="button"
                className={css.autoRouteBtn}
                title="Auto model routing"
                aria-label="Automatic model selection"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2a4 4 0 0 0-4 4c0 1.5.8 2.8 2 3.4V14a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V9.4c1.2-.6 2-1.9 2-3.4a4 4 0 0 0-4-4z" />
                  <path d="M9 18a3 3 0 0 0 6 0" />
                </svg>
                <span>Auto</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <button
                type="button"
                className={css.sendBtn}
                onClick={handleSend}
                disabled={!inputText.trim()}
                aria-label="Send investigation query"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Context Section */}
      <div className={css.contextSection}>
        <div className={css.sectionHeader}>
          <h4 className={css.subTitle}>Context</h4>
          <button
            type="button"
            className={css.editBtn}
            onClick={onEditContext}
            aria-label="Edit context"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>Edit</span>
          </button>
        </div>

        <dl className={css.contextGrid}>
          <div className={css.contextRow}>
            <dt className={css.ctxLabel}>Plant</dt>
            <dd className={css.ctxValue}>{context.plant}</dd>
          </div>
          <div className={css.contextRow}>
            <dt className={css.ctxLabel}>Unit</dt>
            <dd className={css.ctxValue}>{context.unit}</dd>
          </div>
          <div className={css.contextRow}>
            <dt className={css.ctxLabel}>Equipment</dt>
            <dd className={css.ctxValue}>{context.equipment}</dd>
          </div>
          <div className={css.contextRow}>
            <dt className={css.ctxLabel}>Investigation</dt>
            <dd className={css.ctxValue}>{context.investigationId}</dd>
          </div>
        </dl>
      </div>

      {/* 3. Quick Actions Section */}
      <div className={css.quickActionsSection}>
        <h4 className={css.subTitle}>Quick Actions</h4>
        <div className={css.quickActionsGrid}>
          <button
            type="button"
            className={css.quickBtn}
            onClick={() => onQuickAction?.('add-evidence')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={css.quickTone_blue} aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <span>Add Evidence</span>
          </button>

          <button
            type="button"
            className={css.quickBtn}
            onClick={() => onQuickAction?.('assign-to-me')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={css.quickTone_green} aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Assign to Me</span>
          </button>

          <button
            type="button"
            className={css.quickBtn}
            onClick={() => onQuickAction?.('create-report')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={css.quickTone_purple} aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>Create Report</span>
          </button>

          <button
            type="button"
            className={css.quickBtn}
            onClick={() => onQuickAction?.('change-status')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={css.quickTone_amber} aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
            <span>Change Status</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
