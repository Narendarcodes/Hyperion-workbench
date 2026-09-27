/**
 * EquipmentDetail: Center panel displaying selected equipment details,
 * actions (View on P&ID, Open Documents, More), tabs (Overview, Specifications,
 * Operations, Maintenance, Documents, Related, History), interactive media viewer,
 * and key technical specifications.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/equipment/EquipmentDetail
 */

import { useState } from 'react'
import {
  IconEllipsisOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  EquipmentMediaMode,
  EquipmentTabKey,
  SelectedEquipment,
} from './types.ts'
import css from './EquipmentDetail.module.css'

export interface EquipmentDetailProps {
  readonly equipment: SelectedEquipment
  readonly onViewPid?: () => void
  readonly onOpenDocuments?: () => void
  readonly onEditInfo?: () => void
  readonly onTabChange?: (tab: EquipmentTabKey) => void
}

const TABS: readonly { readonly key: EquipmentTabKey; readonly label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'specifications', label: 'Specifications' },
  { key: 'operations', label: 'Operations' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'documents', label: 'Documents' },
  { key: 'related', label: 'Related' },
  { key: 'history', label: 'History' },
]

export function EquipmentDetail({
  equipment,
  onViewPid,
  onOpenDocuments,
  onEditInfo,
  onTabChange,
}: EquipmentDetailProps) {
  const [activeTab, setActiveTab] = useState<EquipmentTabKey>(equipment.activeTab)
  const [mediaMode, setMediaMode] = useState<EquipmentMediaMode>(equipment.mediaMode)

  const handleTabClick = (tab: EquipmentTabKey) => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }

  return (
    <article className={css.detailCard} aria-labelledby="equipment-tag">
      {/* Top Header Row */}
      <div className={css.detailHeader}>
        <div className={css.titleAndStatus}>
          <div className={css.tagRow}>
            <h2 id="equipment-tag" className={css.tagHeading}>{equipment.tag}</h2>
            <span className={css.statusBadge} data-status={equipment.status}>
              <span className={css.statusDot} aria-hidden="true" />
              <span>{equipment.statusLabel}</span>
            </span>
          </div>
          <p className={css.equipmentMeta}>
            <span className={css.metaName}>{equipment.name}</span>
            <span className={css.metaSeparator} aria-hidden="true">•</span>
            <span className={css.metaUnit}>{equipment.unit}</span>
            <span className={css.metaSeparator} aria-hidden="true">•</span>
            <span className={css.metaArea}>{equipment.area}</span>
          </p>
        </div>

        {/* Top-Right Action Buttons */}
        <div className={css.headerActions}>
          <button
            type="button"
            className={css.actionOutlineBtn}
            onClick={onViewPid}
            aria-label="View on P&ID"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <path d="M6 10v7h8M10 6h4" />
            </svg>
            <span>View on P&ID</span>
          </button>

          <button
            type="button"
            className={css.actionOutlineBtn}
            onClick={onOpenDocuments}
            aria-label="Open Documents"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Open Documents</span>
          </button>

          <button
            type="button"
            className={css.moreMenuBtn}
            aria-label="More options"
            title="More options"
          >
            <IconEllipsisOutline16 size={15} />
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <nav className={css.tabsBar} aria-label="Equipment Information Tabs">
        <ul className={css.tabsList} role="tablist">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab
            return (
              <li key={tab.key} role="presentation">
                <button
                  type="button"
                  role="tab"
                  id={`tab-${tab.key}`}
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.key}`}
                  className={`${css.tabBtn} ${isActive ? css.tabActive : ''}`}
                  onClick={() => handleTabClick(tab.key)}
                >
                  {tab.label}
                  {isActive && <span className={css.tabActiveIndicator} aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Main Tab Content */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className={css.tabPanel}
      >
        {activeTab === 'overview' ? (
          <div className={css.overviewGrid}>
            {/* Visual Media Panel */}
            <div className={css.mediaContainer} aria-label="Equipment visual representation">
              {/* Media Controls Overlay */}
              <div className={css.mediaControlsOverlay}>
                <div className={css.mediaModePills} role="group" aria-label="View mode">
                  {(['3d', 'image', 'drawing'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      className={`${css.modePill} ${mediaMode === mode ? css.modePillActive : ''}`}
                      onClick={() => setMediaMode(mode)}
                    >
                      {mode === '3d' ? '3D' : mode === 'image' ? 'Image' : 'Drawing'}
                    </button>
                  ))}
                </div>

                <div className={css.mediaActionIcons}>
                  <button
                    type="button"
                    className={css.mediaIconBtn}
                    aria-label="Fullscreen view"
                    title="Fullscreen"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={css.mediaIconBtn}
                    aria-label="Viewport controls"
                    title="Controls"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Render Selected View Mode */}
              <div className={css.mediaViewport}>
                <img
                  src={equipment.imageUrl}
                  alt={`${equipment.tag} - ${equipment.name}`}
                  className={css.equipmentImage}
                />
              </div>
            </div>

            {/* Key Information Panel */}
            <div className={css.keyInfoPanel}>
              <div className={css.keyInfoHeader}>
                <h3 className={css.keyInfoTitle}>Key Information</h3>
                <button
                  type="button"
                  className={css.editBtn}
                  onClick={onEditInfo}
                  aria-label="Edit Key Information"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span>Edit</span>
                </button>
              </div>

              <dl className={css.infoGrid}>
                <div className={css.infoRow}>
                  <dt className={css.infoLabel}>Tag Number</dt>
                  <dd className={css.infoValueBold}>{equipment.tag}</dd>
                </div>

                <div className={css.infoRow}>
                  <dt className={css.infoLabel}>Equipment Type</dt>
                  <dd className={css.infoValue}>{equipment.type}</dd>
                </div>

                <div className={css.infoRow}>
                  <dt className={css.infoLabel}>Service</dt>
                  <dd className={css.infoValue}>{equipment.service}</dd>
                </div>

                <div className={css.infoRow}>
                  <dt className={css.infoLabel}>Unit</dt>
                  <dd className={css.infoValue}>{equipment.unit}</dd>
                </div>

                <div className={css.infoRow}>
                  <dt className={css.infoLabel}>Area</dt>
                  <dd className={css.infoValue}>{equipment.area}</dd>
                </div>

                <div className={css.infoRow}>
                  <dt className={css.infoLabel}>P&ID</dt>
                  <dd className={css.infoValue}>{equipment.pid}</dd>
                </div>

                <div className={css.infoRow}>
                  <dt className={css.infoLabel}>Manufacturer</dt>
                  <dd className={css.infoValue}>{equipment.manufacturer}</dd>
                </div>

                <div className={css.infoRow}>
                  <dt className={css.infoLabel}>Model</dt>
                  <dd className={css.infoValue}>{equipment.model}</dd>
                </div>

                <div className={css.infoRow}>
                  <dt className={css.infoLabel}>Installation Date</dt>
                  <dd className={css.infoValue}>{equipment.installationDate}</dd>
                </div>

                <div className={css.infoRow}>
                  <dt className={css.infoLabel}>Status</dt>
                  <dd className={css.infoValue}>
                    <span className={css.statusDotInline} aria-hidden="true" />
                    <span>{equipment.statusLabel}</span>
                  </dd>
                </div>

                <div className={css.infoRow}>
                  <dt className={css.infoLabel}>Criticality</dt>
                  <dd className={css.infoValueCritical}>
                    <span className={css.criticalDotInline} aria-hidden="true" />
                    <span>{equipment.criticalityLabel}</span>
                  </dd>
                </div>

                <div className={css.infoRow}>
                  <dt className={css.infoLabel}>Last Maintenance</dt>
                  <dd className={css.infoValue}>{equipment.lastMaintenance}</dd>
                </div>

                <div className={css.infoRow}>
                  <dt className={css.infoLabel}>Next Maintenance</dt>
                  <dd className={css.infoValue}>{equipment.nextMaintenance}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <div className={css.placeholderTabContent}>
            <p className={css.tabEmptyText}>
              Details for the <strong>{TABS.find(t => t.key === activeTab)?.label}</strong> tab are configured for {equipment.tag}.
            </p>
          </div>
        )}
      </div>
    </article>
  )
}
