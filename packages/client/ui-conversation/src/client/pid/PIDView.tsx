/**
 * CDU-03 P&ID Engineering Workspace: Hyperion-native composition of the
 * extracted P&ID surface (navigator, vector viewer, equipment context,
 * related tables). Page chrome (breadcrumb, search, filter, Ask Hyperion)
 * follows the reference hierarchy; actions route through Hyperion callbacks
 * (real agent drafts, real views) — no parallel shell, no mock AI.
 */
import React from 'react'
import { usePIDStore, pidStore } from './pidStore'
import type { PIDDocument } from './types'
import { PIDNavigator } from './PIDNavigator'
import { PIDViewer } from './PIDViewer'
import { EquipmentContextPanel } from './EquipmentContextPanel'
import { BottomCards } from './BottomCards'
import css from './PIDView.module.css'

export interface PIDViewProps {
  /** Route a P&ID question to the real Hyperion agent (composer draft). */
  onAskPid: (query: string) => void
  /** Open an asset in the Hyperion Equipment view. */
  onViewEquipment: (tag: string) => void
  /** Navigate to the Hyperion Equipment view. */
  onViewAllEquipment: () => void
  /** Open an asset's documents in the Hyperion Documents view. */
  onViewDocuments: (tag: string) => void
  /** Navigate to the Hyperion Documents view. */
  onViewAllDocuments: () => void
  /** Open a connected document in the Hyperion Documents view. */
  onOpenDocument: (doc: PIDDocument) => void
  /** Start a Hyperion investigation for an asset. */
  onStartInvestigation: (tag: string) => void
}

const STATUS_FILTERS = ['all', 'In Service', 'Standby', 'Maintenance', 'Offline'] as const

export const PIDView: React.FC<PIDViewProps> = ({
  onAskPid,
  onViewEquipment,
  onViewAllEquipment,
  onViewDocuments,
  onViewAllDocuments,
  onOpenDocument,
  onStartInvestigation,
}) => {
  const { selectedEquipment, selectedPID, searchQuery, filterState } = usePIDStore()

  const askAboutPid = (): void => {
    const tag = selectedEquipment ? ` for ${selectedEquipment.tag} (${selectedEquipment.name})` : ''
    onAskPid(`Analyze P&ID ${selectedPID}${tag}: process flow, control loops, and equipment context. `)
  }

  return (
    <div className={css.root} data-hide-composer="" role="region" aria-label="CDU-03 P&ID">
      <header className={css.header}>
        <div className={css.headerLeft}>
          <div className={css.breadcrumb}>Plant / P&ID / CDU-03</div>
          <h1 className={css.title}>CDU-03 P&ID</h1>
          <div className={css.subtitle}>
            Crude Distillation Unit · Engineering diagram and equipment context
          </div>
        </div>
        <div className={css.headerRight}>
          <div className={css.searchBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className={css.searchInput}
              placeholder="Search equipment, line, tag, or description..."
              aria-label="Search equipment, line, tag, or description"
              value={searchQuery}
              onChange={(e) => { pidStore.setSearchQuery(e.target.value) }}
            />
          </div>
          <label className={css.filterBox}>
            <span className={css.filterLabel}>Filter</span>
            <select
              className={css.filterSelect}
              aria-label="Filter equipment by status"
              value={filterState}
              onChange={(e) => { pidStore.setFilterState(e.target.value) }}
            >
              {STATUS_FILTERS.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All statuses' : status}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={css.askBtn} onClick={askAboutPid}>
            Ask Hyperion about this P&ID
          </button>
        </div>
      </header>

      <div className={css.main}>
        <PIDNavigator />
        <PIDViewer />
        <EquipmentContextPanel
          onViewEquipment={onViewEquipment}
          onViewDocuments={onViewDocuments}
          onStartInvestigation={onStartInvestigation}
        />
      </div>

      <BottomCards
        onViewAllEquipment={onViewAllEquipment}
        onViewAllDocuments={onViewAllDocuments}
        onOpenDocument={onOpenDocument}
      />
      {selectedEquipment !== null && (
        <span className={css.srOnly} role="status">
          {selectedEquipment.tag} selected.
        </span>
      )}
    </div>
  )
}
