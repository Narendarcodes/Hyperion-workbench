// The composer remains in ConversationRoot so switching out of the blank-draft
// phase does not remount its textarea.

import { useEffect, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import clsx from 'clsx'
import {
  IconBellOutline16, IconBranchOutline16, IconChecklistOutline14, IconChevronDownOutline14,
  IconCopyOutline16, IconEllipsisOutline16, IconFolderClose16, IconFolderOpen16, IconLightOutline16, IconQueueOutline14,
  IconSettingsOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { workspaceTitleOf } from '@deepseek-ai/dsh-util-workspace-path'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ConversationSlotProps } from '../contract/slots.ts'
import css from './HeroShell.module.css'

type HeroTranslate = ConversationSlotProps['t']

export function workspaceLabel(cwd: string): string {
  const base = workspaceTitleOf(cwd)
  return base !== '' ? base : cwd
}

export interface HomeSuggestion {
  readonly id: string
  readonly label: string
  readonly description: string
}

export interface HomeRecentWork {
  readonly sessionId: SessionId
  readonly title: string
  readonly updatedAt: number
}

const SUGGESTION_ICONS = {
  equipment: <IconSettingsOutline16 size={18} />,
  pid: <IconBranchOutline16 size={18} />,
  safety: <IconChecklistOutline14 size={18} />,
  documents: <IconCopyOutline16 size={18} />,
} as const

export function defaultHomeSuggestions(t: HeroTranslate): readonly HomeSuggestion[] {
  return [
    { id: 'equipment', label: t('home.suggestion.equipment'), description: t('home.suggestion.equipment.description') },
    { id: 'pid', label: t('home.suggestion.pid'), description: t('home.suggestion.pid.description') },
    { id: 'safety', label: t('home.suggestion.safety'), description: t('home.suggestion.safety.description') },
    { id: 'documents', label: t('home.suggestion.documents'), description: t('home.suggestion.documents.description') },
  ]
}

export function WorkspaceChip({ buttonRef, label, menuOpen = false, onClick, t }: {
  buttonRef?: RefObject<HTMLButtonElement>
  label?: string | undefined
  menuOpen?: boolean
  onClick?: () => void
  t: HeroTranslate
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={css.workspace}
      aria-label={t('hero.chooseWorkspace')}
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      onClick={onClick}
    >
      {label === undefined
        ? <IconFolderClose16 className={css.folder} size={16} />
        : <IconFolderOpen16 className={css.folder} size={16} />}
      <span className={css.workspaceLabel}>{label ?? t('hero.chooseWorkspace')}</span>
      <IconChevronDownOutline14 className={css.chevron} size={12} />
    </button>
  )
}

export type HomeLocalState = 'available' | 'unavailable' | undefined

function HomeHeaderAffordances({ t }: { t: HeroTranslate }) {
  return (
    <div className={css.headerAffordances} role="group" aria-label={t('home.controls.aria')}>
      <button type="button" className={css.headerAffordance} aria-label={t('home.controls.theme')}>
        <IconLightOutline16 size={18} />
      </button>
      <button type="button" className={css.headerAffordance} aria-label={t('home.controls.notifications')}>
        <IconBellOutline16 size={18} />
      </button>
      <button type="button" className={css.profileAffordance} aria-label={t('home.controls.profile')}>
        <span className={css.profileAvatar}>{t('home.profile.initial')}</span>
        <IconChevronDownOutline14 className={css.profileChevron} size={16} />
      </button>
    </div>
  )
}

export interface HeroShellProps {
  t: HeroTranslate
  localState?: HomeLocalState
  children?: ReactNode
}

export function HeroShell({ t, localState, children }: HeroShellProps) {
  const phrases = [
    t('home.phrase.analyzing'),
    t('home.phrase.investigating'),
    t('home.phrase.reviewing'),
    t('home.phrase.comparing'),
    t('home.phrase.diagnosing'),
  ]
  const [phraseIndex, setPhraseIndex] = useState(0)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      setPhraseIndex(current => (current + 1) % phrases.length)
    }, 3000)
    return () => { window.clearInterval(timer) }
  }, [phrases.length])

  return (
    <div className={css.root}>
      <div className={css.stack}>
        <div className={css.utilityRow}>
          {localState !== undefined && (
            <span className={css.statusPill}>
              <span
                aria-hidden="true"
                className={clsx(css.statusDot, localState === 'unavailable' && css.statusDotUnavailable)}
              />
              {t(localState === 'available' ? 'home.state.available' : 'home.state.unavailable')}
            </span>
          )}
          <HomeHeaderAffordances t={t} />
        </div>
        <div className={css.heroCopy}>
          <p className={css.eyebrow}>{t('home.product')}</p>
          <h1 aria-label={t('home.heading')}>
            <span className={css.visuallyHidden} aria-hidden="true">{t('home.heading')}</span>
            {t('home.headingPrefix')}{' '}
            <span key={phraseIndex} className={css.heroPhrase} aria-hidden="true">
              {phrases[phraseIndex]}
            </span>
          </h1>
          <p className={css.tagline}>{t('home.tagline')}</p>
        </div>
        <div className={css.body} />
      </div>
      {children}
    </div>
  )
}

export interface HomeSectionsProps {
  t: HeroTranslate
  suggestions?: readonly HomeSuggestion[]
  recentWork?: readonly HomeRecentWork[]
  onSuggestion?: (suggestion: HomeSuggestion) => void
  onOpenRecent?: (sessionId: SessionId) => void
}

function relativeTime(updatedAt: number, t: HeroTranslate): string {
  const elapsed = Math.max(0, Date.now() - updatedAt)
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 1) return t('home.recent.now')
  if (minutes < 60) return t('home.recent.minutes', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('home.recent.hours', { count: hours })
  const days = Math.floor(hours / 24)
  return t('home.recent.days', { count: days })
}

export function HomeSections({
  t,
  suggestions = [],
  recentWork = [],
  onSuggestion,
  onOpenRecent,
}: HomeSectionsProps) {
  return (
    <div className={css.homeSections}>
      <section className={css.suggestionSection} aria-labelledby="home-suggestions">
        <h2 id="home-suggestions" className={css.sectionHeading}>{t('home.suggested')}</h2>
        <div className={css.suggestions}>
          {suggestions.map(suggestion => (
            <button
              key={suggestion.id}
              type="button"
              className={css.suggestion}
              disabled={onSuggestion === undefined}
              onClick={() => { onSuggestion?.(suggestion) }}
            >
              <span aria-hidden="true" className={css.suggestionIcon} data-tone={suggestion.id}>
                {SUGGESTION_ICONS[suggestion.id as keyof typeof SUGGESTION_ICONS]}
              </span>
              <span className={css.suggestionText}>
                <span className={css.suggestionTitle}>{suggestion.label}</span>
                <span className={css.suggestionDescription}>{suggestion.description}</span>
              </span>
              <span aria-hidden="true" className={css.suggestionArrow}>↗</span>
            </button>
          ))}
        </div>
      </section>
      <section className={css.recentSection} aria-labelledby="home-recent">
        <div className={css.sectionHeadingRow}>
          <h2 id="home-recent" className={css.sectionHeading}>{t('home.recent')}</h2>
          {recentWork.length > 0 && <span className={css.sectionHint}>{t('home.recent.hint')}</span>}
        </div>
        {recentWork.length === 0
          ? <p className={css.emptyRecent}>{t('home.recent.empty')}</p>
          : (
            <div className={css.recentList}>
              {recentWork.map(work => (
                <button
                  key={work.sessionId}
                  type="button"
                  className={css.recentItem}
                  onClick={() => { onOpenRecent?.(work.sessionId) }}
                >
                  <span aria-hidden="true" className={css.recentIcon}>
                    <IconQueueOutline14 size={16} />
                  </span>
                  <span className={css.recentText}>
                    <span className={css.recentTitle}>{work.title}</span>
                    <span className={css.recentMeta}>
                      {t('home.recent.session')} · {relativeTime(work.updatedAt, t)}
                    </span>
                  </span>
                  <span aria-hidden="true" className={css.recentOverflow}>
                    <IconEllipsisOutline16 size={16} />
                  </span>
                </button>
              ))}
            </div>
          )}
      </section>
    </div>
  )
}
