/**
 * AskHyperionPanel: Bottom-right card providing contextual engineering AI assistance
 * for the selected equipment asset.
 * Includes prompt suggestions, contextual equipment input, and Hyperion composer controls.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/equipment/AskHyperionPanel
 */

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  IconContextInjectionOutline16,


  IconSkillOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { EquipmentSuggestionPrompt } from './types.ts'
import css from './AskHyperionPanel.module.css'

export interface AskHyperionPanelProps {
  /** What the question is about: the equipment tag, or its name when the source prints no tag. */
  readonly subject: string
  readonly suggestions: readonly EquipmentSuggestionPrompt[]
  readonly onAskEquipment?: ((query: string) => void) | undefined
}

function SuggestionIcon({ type }: { type: EquipmentSuggestionPrompt['iconType'] }) {
  if (type === 'sparkle') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={css.sparkleSvg}>
        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
      </svg>
    )
  }
  if (type === 'document') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    )
  }
  // Compare icon
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

export function AskHyperionPanel({
  subject,
  suggestions,
  onAskEquipment,
}: AskHyperionPanelProps) {
  const [inputText, setInputText] = useState('')

  const handleSelectSuggestion = (promptText: string) => {
    setInputText(promptText)
    onAskEquipment?.(promptText)
  }

  const handleSend = () => {
    const trimmed = inputText.trim()
    if (!trimmed) return
    onAskEquipment?.(trimmed)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={css.panelCard} aria-labelledby="ask-hyperion-heading">
      {/* Header */}
      <div className={css.panelHeader}>
        <div className={css.headerTitleRow}>
          <span className={css.sparkleBadge} aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
            </svg>
          </span>
          <h3 id="ask-hyperion-heading" className={css.panelTitle}>Ask Hyperion</h3>
        </div>
        <p className={css.panelSubtitle}>
          Ask questions about this equipment, analyze issues, or get recommendations.
        </p>
      </div>

      {/* Suggested Prompt Pills (2x2 Grid) */}
      <div className={css.suggestionsGrid} role="group" aria-label="Suggested questions">
        {suggestions.map(sugg => (
          <button
            key={sugg.id}
            type="button"
            className={css.suggestionPill}
            onClick={() => handleSelectSuggestion(sugg.text)}
            title={sugg.text}
          >
            <span className={css.suggIconSlot}>
              <SuggestionIcon type={sugg.iconType} />
            </span>
            <span className={css.suggText}>{sugg.text}</span>
          </button>
        ))}
      </div>

      {/* Embedded Contextual Composer */}
      <div className={css.composerBox}>
        <input
          type="text"
          className={css.composerInput}
          placeholder={`Ask about ${subject}...`}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label={`Ask about ${subject}`}
        />

        {/* Bottom Control Bar */}
        <div className={css.composerControls}>
          <div className={css.leftTools}>
            <button
              type="button"
              className={css.chipBtn}
              onClick={() => setInputText(prev => `${prev} @${subject} `)}
              aria-label="Add equipment context"
            >
              <IconContextInjectionOutline16 size={12} />
              <span>Context</span>
            </button>
            <button
              type="button"
              className={css.chipBtn}
              onClick={() => setInputText(prev => `${prev} /equipment `)}
              aria-label="Select skill"
            >
              <IconSkillOutline16 size={12} />
              <span>Skill</span>
            </button>
          </div>

          <div className={css.rightTools}>

            <button
              type="button"
              className={css.sendBtn}
              onClick={handleSend}
              disabled={!inputText.trim()}
              aria-label="Send inquiry"
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
  )
}
