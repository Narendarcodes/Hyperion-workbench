/**
 * PersistentComposer: Persistent AI follow-up input bar anchored at the bottom
 * of the Investigation Analysis workspace.
 * Includes tools (+, attach, @ Context, ✦ Skill, Workspace Write, Auto model routing, Send).
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/PersistentComposer
 */

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  IconChevronDownOutline14,
  IconContextInjectionOutline16,
  IconPaperclipOutline16,
  IconPlusOutline16,
  IconSkillOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import css from './PersistentComposer.module.css'

export interface PersistentComposerProps {
  readonly onSend?: (query: string) => void
  readonly onToggleWorkspaceWrite?: (active: boolean) => void
}

export function PersistentComposer({
  onSend,
  onToggleWorkspaceWrite,
}: PersistentComposerProps) {
  const [inputText, setInputText] = useState('')
  const [workspaceWriteActive, setWorkspaceWriteActive] = useState(true)

  const handleSend = () => {
    const trimmed = inputText.trim()
    if (!trimmed) return
    onSend?.(trimmed)
    setInputText('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleWrite = () => {
    const next = !workspaceWriteActive
    setWorkspaceWriteActive(next)
    onToggleWorkspaceWrite?.(next)
  }

  return (
    <div className={css.composerWrapper} role="region" aria-label="Ask Hyperion follow-up question">
      <div className={css.composerCard}>
        <input
          type="text"
          className={css.composerInput}
          placeholder="Ask Hyperion a follow-up question..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Ask Hyperion a follow-up question"
        />

        <div className={css.controlsRow}>
          <div className={css.leftToolsGroup}>
            <button
              type="button"
              className={css.iconBtn}
              aria-label="Add action or file"
              title="Add"
            >
              <IconPlusOutline16 size={13} />
            </button>

            <button
              type="button"
              className={css.iconBtn}
              aria-label="Attach file"
              title="Attach"
            >
              <IconPaperclipOutline16 size={13} />
            </button>

            <button
              type="button"
              className={css.chipBtn}
              onClick={() => setInputText(prev => `${prev} @P-204 `)}
              aria-label="Insert equipment context"
            >
              <IconContextInjectionOutline16 size={12} />
              <span>Context</span>
            </button>

            <button
              type="button"
              className={css.chipBtn}
              onClick={() => setInputText(prev => `${prev} /vibration-analysis `)}
              aria-label="Insert skill trigger"
            >
              <IconSkillOutline16 size={12} />
              <span>Skill</span>
            </button>

            <button
              type="button"
              className={`${css.chipBtn} ${workspaceWriteActive ? css.chipActive : ''}`}
              onClick={toggleWrite}
              aria-label="Toggle Workspace Write capability"
              title="Workspace Write capability"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
              <span>Workspace Write</span>
            </button>
          </div>

          <div className={css.rightToolsGroup}>
            <button
              type="button"
              className={css.autoRoutePill}
              title="Automatic model routing enabled"
              aria-label="Automatic model selection"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2a4 4 0 0 0-4 4c0 1.5.8 2.8 2 3.4V14a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V9.4c1.2-.6 2-1.9 2-3.4a4 4 0 0 0-4-4z" />
                <path d="M9 18a3 3 0 0 0 6 0" />
              </svg>
              <span>Auto</span>
              <IconChevronDownOutline14 size={10} className={css.autoChevron} aria-hidden="true" />
            </button>

            <button
              type="button"
              className={css.sendBtn}
              onClick={handleSend}
              disabled={!inputText.trim()}
              aria-label="Send follow-up question"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
