/**
 * UnitDetailsPanel: Right-hand information card detailing the currently selected process unit.
 * Reuses local refinery imagery and provides pathways into equipment, documents, P&IDs and investigations.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/UnitDetailsPanel
 */

import { useState } from 'react'
import { IconChevronRightOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { UnitDetail, UnitTab } from './types.ts'
import css from './UnitDetailsPanel.module.css'

export interface UnitDetailsPanelProps {
  readonly unit: UnitDetail
  readonly onOpenUnit?: (() => void) | undefined
  readonly onStartInvestigation?: (() => void) | undefined
  readonly onSelectTab?: ((tab: UnitTab) => void) | undefined
  readonly onRowClick?: ((category: string) => void) | undefined
}

export function UnitDetailsPanel({
  unit,
  onOpenUnit,
  onStartInvestigation,
  onSelectTab,
  onRowClick,
}: UnitDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<UnitTab>(unit.activeTab || 'overview')

  const handleTabClick = (tab: UnitTab) => {
    setActiveTab(tab)
    onSelectTab?.(tab)
  }

  return (
    <article className={css.unitCard} aria-labelledby="unit-detail-name">
      {/* Top refinery photo area */}
      <div className={css.imageArea}>
        <img
          src={unit.imageUrl || '/refinery.png'}
          alt={unit.name}
          className={css.unitImage}
          loading="eager"
        />
      </div>

      <div className={css.contentArea}>
        {/* Unit Header */}
        <div className={css.headerRow}>
          <h3 id="unit-detail-name" className={css.unitName}>{unit.name}</h3>
          <span className={css.statusBadge} role="status">
            <span className={css.statusDot} aria-hidden="true" />
            Active
          </span>
        </div>
        <p className={css.unitSubtitle}>{unit.subtitle}</p>

        {/* Tabs: Overview, Equipment, Documents, P&IDs */}
        <div className={css.tabsList} role="tablist" aria-label="Unit detail tabs">
          {(['overview', 'equipment', 'documents', 'pids'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`${css.tabBtn} ${activeTab === tab ? css.tabActive : ''}`}
              onClick={() => { handleTabClick(tab) }}
            >
              {tab === 'pids' ? 'P&IDs' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Stats List */}
        <div className={css.statsList}>
          {/* Equipment */}
          <button
            type="button"
            className={css.statRow}
            onClick={() => { onRowClick?.('equipment') }}
            aria-label={`Equipment: ${unit.equipmentCount}`}
          >
            <div className={css.statLeft}>
              <div className={css.statIconBox} aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="6" width="20" height="12" rx="3" />
                  <line x1="6" y1="6" x2="6" y2="18" />
                  <line x1="10" y1="6" x2="10" y2="18" />
                  <line x1="14" y1="6" x2="14" y2="18" />
                  <line x1="18" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <span className={css.statLabel}>Equipment</span>
            </div>
            <div className={css.statRight}>
              <span className={css.statCount}>{unit.equipmentCount}</span>
              <IconChevronRightOutline14 size={13} className={css.statChevron} />
            </div>
          </button>

          {/* Documents */}
          <button
            type="button"
            className={css.statRow}
            onClick={() => { onRowClick?.('documents') }}
            aria-label={`Documents: ${unit.documentCount}`}
          >
            <div className={css.statLeft}>
              <div className={css.statIconBox} aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <span className={css.statLabel}>Documents</span>
            </div>
            <div className={css.statRight}>
              <span className={css.statCount}>{unit.documentCount}</span>
              <IconChevronRightOutline14 size={13} className={css.statChevron} />
            </div>
          </button>

          {/* P&IDs */}
          <button
            type="button"
            className={css.statRow}
            onClick={() => { onRowClick?.('pids') }}
            aria-label={`P&IDs: ${unit.pidCount}`}
          >
            <div className={css.statLeft}>
              <div className={css.statIconBox} aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <span className={css.statLabel}>P&IDs</span>
            </div>
            <div className={css.statRight}>
              <span className={css.statCount}>{unit.pidCount}</span>
              <IconChevronRightOutline14 size={13} className={css.statChevron} />
            </div>
          </button>

          {/* Investigations */}
          <button
            type="button"
            className={css.statRow}
            onClick={() => { onRowClick?.('investigations') }}
            aria-label={`Investigations: ${unit.investigationCount}`}
          >
            <div className={css.statLeft}>
              <div className={css.statIconBox} aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <span className={css.statLabel}>Investigations</span>
            </div>
            <div className={css.statRight}>
              <span className={css.statCount}>{unit.investigationCount}</span>
              <IconChevronRightOutline14 size={13} className={css.statChevron} />
            </div>
          </button>
        </div>

        {/* Bottom Actions */}
        <div className={css.actionsRow}>
          <button
            type="button"
            className={css.openUnitBtn}
            onClick={onOpenUnit}
          >
            <span>Open Unit</span>
            <span aria-hidden="true">→</span>
          </button>

          <button
            type="button"
            className={css.investigateBtn}
            onClick={onStartInvestigation}
          >
            <span className={css.investigateBtnIcon} aria-hidden="true">⊕</span>
            <span>Start Investigation</span>
          </button>
        </div>
      </div>
    </article>
  )
}
