/**
 * MissionView: The central Mission View component presenting the pixel-art office simulation, status counts, roadmap, and deliverables.
 * @module @deepseek-ai/dsh-client-ui-mission/client/MissionView
 */

import { useCallback } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InjectFace, PropsLocale, PropsRenderSlots, SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { MissionSnapshot } from './mission-contract.ts'
import { EMPTY_MISSION_SNAPSHOT } from './mission-contract.ts'
import type { MissionPhase } from './mission-vocabulary.ts'
import type { MissionKey } from './locales.ts'
import { PixelOfficeCanvas } from './pixel-office/PixelOfficeCanvas.tsx'
import css from './MissionView.module.css'

/** Hook selector type for MissionSnapshot. */
export type UseMission = SnapshotSelectorHook<MissionSnapshot>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SessionStandardProps {
    /** Selector hook over the current Conversation binding's Mission target. */
    useMission?: UseMission | undefined
  }
}

/** Injected face for MissionView. */
export interface MissionViewInjected {
  readonly useMission?: UseMission | undefined
}

const ROADMAP_PHASES: readonly { key: MissionPhase; labelKey: MissionKey }[] = [
  { key: 'input', labelKey: 'phase.input' },
  { key: 'understand', labelKey: 'phase.understand' },
  { key: 'plan', labelKey: 'phase.plan' },
  { key: 'retrieve', labelKey: 'phase.retrieve' },
  { key: 'execute', labelKey: 'phase.execute' },
  { key: 'verify', labelKey: 'phase.verify' },
  { key: 'deliver', labelKey: 'phase.deliver' },
]

/**
 * Main Mission View component matching the reference design.
 *
 * @param props - Conversation view props, locale translator, renderSlot, and optional hooks.
 * @returns React element rendering the mission office view.
 */
const fallbackSelector: UseMission = function <S>(selector?: (s: MissionSnapshot) => S): S {
  return selector ? selector(EMPTY_MISSION_SNAPSHOT) : (EMPTY_MISSION_SNAPSHOT as unknown as S)
}

export function MissionView({
  useMission = fallbackSelector,
  openView,
  renderSlot,
  t,
}: ConvViewProps
  & PropsRenderSlots<'mission.orb'>
  & InjectFace<MissionViewInjected>
  & PropsLocale<'mission'>) {
  const currentSnapshot = useMission(s => s)

  // Calculate status counts
  const counts = {
    working: 0,
    searching: 0,
    waiting: 0,
    blocked: 0,
    completed: 0,
  }

  for (const worker of currentSnapshot.office.workers) {
    if (worker.status === 'working' || worker.status === 'executing') counts.working++
    else if (worker.status === 'searching') counts.searching++
    else if (worker.status === 'waiting') counts.waiting++
    else if (worker.status === 'blocked' || worker.status === 'failed') counts.blocked++
    else if (worker.status === 'completed') counts.completed++
  }

  // Pending verification check
  const pendingVerif = currentSnapshot.verification.find(v => v.status === 'pending')
  const hasPendingVerification = pendingVerif !== undefined

  const handleOpenVerification = useCallback(() => {
    openView('chat', 'approval')
  }, [openView])

  // Extract task title from first prompt in activity or default
  const firstPrompt = currentSnapshot.activity.find(a => a.agentId === 'user')?.detail
  const taskTitle = firstPrompt && firstPrompt.length > 0
    ? firstPrompt
    : t('header.task')

  // Find active mission phase index
  let activePhaseIndex = 0
  for (let i = 0; i < ROADMAP_PHASES.length; i++) {
    const phase = ROADMAP_PHASES[i]
    if (phase && currentSnapshot.phases[phase.key].status === 'real') {
      activePhaseIndex = i
    }
  }

  const isCompleted = currentSnapshot.office.orchestrator.status === 'completed'

  return (
    <div className={css.missionViewRoot} data-mission-view data-conversation-composer-overlay="">
      {/* 1. TOP POLISHED HEADER CARD */}
      <div className={css.headerCard}>
        <div className={css.headerMain}>
          <div className={css.titleRow}>
            <span className={css.taskTitle}>{taskTitle}</span>
            <span className={css.statusPill}>
              <span className={css.statusPillDot} />
              <span>{isCompleted ? t('status.finished') : t('status.inProgress')}</span>
            </span>
          </div>
          <span className={css.taskDescription}>
            {currentSnapshot.office.orchestrator.bubble || t('status.ready')}
          </span>

          {/* Deliverables file chips */}
          {currentSnapshot.deliverables.length > 0 && (
            <div className={css.deliverablesChips}>
              {currentSnapshot.deliverables.map((deliv, idx) => (
                <span key={`deliv-${idx}-${deliv.seq}`} className={css.fileChip}>
                  <span>📄</span>
                  <span>{deliv.path}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sovereignty Info Box */}
        <div className={css.sovereigntyBox}>
          <span className={css.sovereigntyLabel}>Sandbox</span>
          <span className={css.sovereigntyVal}>{currentSnapshot.sovereignty.sandboxMode}</span>
          <span className={css.sovereigntyLabel}>Approval</span>
          <span className={css.sovereigntyVal}>{currentSnapshot.sovereignty.approvalPolicy}</span>
          <span className={css.sovereigntyLabel}>Network</span>
          <span className={css.sovereigntyVal}>{t('sovereignty.egress')}</span>
        </div>
      </div>

      {/* 2. OPTIONAL PENDING VERIFICATION BANNER */}
      {hasPendingVerification && (
        <div
          className={css.verificationBanner}
          role="button"
          tabIndex={0}
          onClick={handleOpenVerification}
          onKeyDown={(e) => { if (e.key === 'Enter') handleOpenVerification() }}
        >
          <span>{t('verification.banner', { tool: pendingVerif.title ?? 'Operation' })}</span>
          <button type="button" className={css.verificationButton}>
            {t('verification.action')}
          </button>
        </div>
      )}

      {/* 3. NATIVE 2D GATHER-STYLE PIXEL OFFICE */}
      <div className={css.simulationArea}>
        <PixelOfficeCanvas snapshot={currentSnapshot} />
        {renderSlot('mission.orb', {})}
      </div>
      {/* 4. BOTTOM 3-CARD EXECUTION STRIP */}
      <div className={css.bottomGrid}>
        {/* Card 1: Agent Status */}
        <div className={css.bottomCard}>
          <div className={css.cardHeader}>
            <span>{t('card.agentStatus')}</span>
          </div>
          <div className={css.statusCountsGrid}>
            <div className={css.countRow}>
              <span className={css.countCircle} style={{ backgroundColor: '#10b981' }} />
              <span>{t('status.working', { count: counts.working })}</span>
            </div>
            <div className={css.countRow}>
              <span className={css.countCircle} style={{ backgroundColor: '#06b6d4' }} />
              <span>{t('status.searching', { count: counts.searching })}</span>
            </div>
            <div className={css.countRow}>
              <span className={css.countCircle} style={{ backgroundColor: '#f59e0b' }} />
              <span>{t('status.waiting', { count: counts.waiting })}</span>
            </div>
            <div className={css.countRow}>
              <span className={css.countCircle} style={{ backgroundColor: '#ef4444' }} />
              <span>{t('status.blocked', { count: counts.blocked })}</span>
            </div>
            <div className={css.countRow}>
              <span className={css.countCircle} style={{ backgroundColor: '#22c55e' }} />
              <span>{t('status.completed', { count: counts.completed })}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Mission Phase Progression */}
        <div className={css.bottomCard}>
          <div className={css.cardHeader}>
            <span>{t('card.missionPhase')}</span>
          </div>
          <div className={css.phaseProgressContainer} aria-label={t('roadmap.aria')}>
            {ROADMAP_PHASES.map((p, idx) => {
              const state = currentSnapshot.phases[p.key]
              const isReal = state.status === 'real'
              const isActive = idx === activePhaseIndex && !isCompleted
              const isDerived = state.status === 'derived'

              const iconClass = isReal
                ? `${css.phaseIcon} ${css.phaseIconReal}`
                : isActive
                  ? `${css.phaseIcon} ${css.phaseIconActive}`
                  : isDerived
                    ? `${css.phaseIcon} ${css.phaseIconDerived}`
                    : css.phaseIcon

              return (
                <div key={p.key} className={css.phaseNode}>
                  <div className={iconClass}>
                    {isReal ? '✓' : isActive ? '●' : '○'}
                  </div>
                  <span>{t(p.labelKey)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Card 3: Recent Activity */}
        <div className={css.bottomCard}>
          <div className={css.cardHeader}>
            <span>{t('card.recentActivity')}</span>
            <span style={{ fontSize: 11, color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}>
              {t('activity.viewAll')}
            </span>
          </div>
          <div className={css.activityList}>
            {currentSnapshot.activity.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 11.5, fontStyle: 'italic' }}>
                {t('activity.empty')}
              </div>
            ) : (
              currentSnapshot.activity.slice().reverse().slice(0, 5).map(entry => (
                <div key={entry.id} className={css.activityItem}>
                  <div className={css.activityItemLeft}>
                    <span
                      className={css.countCircle}
                      style={{
                        backgroundColor: entry.status === 'working' ? '#10b981' : entry.status === 'searching' ? '#06b6d4' : '#64748b',
                        flexShrink: 0,
                      }}
                    />
                    <span className={css.activityAgent}>{entry.label}</span>
                    <span className={css.activityDesc}>{entry.detail ? `— ${entry.detail}` : ''}</span>
                  </div>
                  <span className={css.activityTime}>{t('activity.seq', { seq: entry.seq })}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
