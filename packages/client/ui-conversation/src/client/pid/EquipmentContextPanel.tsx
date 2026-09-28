/**
 * P&ID equipment context panel: selected-asset specs, description, actions.
 * Extracted from origin/Harshith ui-pid; navigation/investigation actions are
 * Hyperion callback props (no parallel workbench router, no toast store).
 */
import React from 'react'
import { usePIDStore, pidStore } from './pidStore'
import css from './EquipmentContextPanel.module.css'

export interface EquipmentContextPanelProps {
  /** Open the asset in the Hyperion Equipment view. */
  onViewEquipment: (tag: string) => void
  /** Open the asset's datasheets in the Hyperion Documents view. */
  onViewDocuments: (tag: string) => void
  /** Start a Hyperion investigation for the asset. */
  onStartInvestigation: (tag: string) => void
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'related', label: 'Related' },
  { id: 'history', label: 'History' },
] as const

export const EquipmentContextPanel: React.FC<EquipmentContextPanelProps> = ({
  onViewEquipment,
  onViewDocuments,
  onStartInvestigation,
}) => {
  const { selectedEquipment, activeEquipmentTab } = usePIDStore()

  if (!selectedEquipment) {
    return (
      <aside className={css.panel} aria-label="Equipment context">
        <div className={css.empty}>
          Select an equipment item on the P&ID or navigator to inspect context.
        </div>
      </aside>
    )
  }

  const eq = selectedEquipment
  const isPump = eq.type.toLowerCase().includes('pump')
  const statusTone = eq.status === 'In Service'
    ? css.statusInService
    : eq.status === 'Standby'
      ? css.statusStandby
      : eq.status === 'Maintenance'
        ? css.statusMaintenance
        : css.statusOffline

  return (
    <aside className={css.panel} aria-label={`Equipment context: ${eq.tag}`}>
      <div className={css.panelHeader}>
        <div className={css.headerTop}>
          <div>
            <h2 className={css.tagTitle}>{eq.tag}</h2>
            <div className={css.subTitle}>{eq.name}</div>
          </div>
          <div className={`${css.statusPill} ${statusTone}`}>
            <span className={css.statusDot} aria-hidden="true" />
            <span>{eq.status}</span>
          </div>
        </div>
      </div>

      <nav className={css.tabNav} role="tablist" aria-label="Equipment detail tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeEquipmentTab === tab.id}
            className={`${css.tabBtn} ${activeEquipmentTab === tab.id ? css.active : ''}`}
            onClick={() => { pidStore.setActiveEquipmentTab(tab.id) }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={css.panelBody}>
        <div className={css.imageBox}>
          {isPump ? (
            <img
              src="/equipment-pump.png"
              alt={`${eq.tag} reference photo`}
              className={css.photo}
            />
          ) : (
            <svg width="180" height="90" viewBox="0 0 180 90" fill="none" aria-hidden="true">
              <rect x="10" y="15" width="160" height="60" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
              <circle cx="70" cy="45" r="22" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
              <path d="M 70 23 L 70 67 M 48 45 L 92 45" stroke="#0284c7" strokeWidth="1.5" />
              <polygon points="70,30 80,45 60,45" fill="#0284c7" />
              <rect x="25" y="32" width="22" height="26" fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
              <text x="36" y="49" fontSize="10" textAnchor="middle" fill="#0f172a" fontWeight="700">M</text>
              <path d="M 92 45 L 140 45" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 2" />
              <text x="116" y="38" fontSize="9" fill="#0284c7" fontWeight="600">SUCTION</text>
            </svg>
          )}
        </div>

        <div>
          <div className={css.sectionTitle}>Equipment Specifications</div>
          <div className={css.specGrid}>
            <div className={css.specItem}>
              <span className={css.specLabel}>Tag Number</span>
              <span className={css.specValue}>{eq.tag}</span>
            </div>
            <div className={css.specItem}>
              <span className={css.specLabel}>Equipment Type</span>
              <span className={css.specValue}>{eq.type}</span>
            </div>
            <div className={css.specItem}>
              <span className={css.specLabel}>Service</span>
              <span className={css.specValue}>{eq.service}</span>
            </div>
            <div className={css.specItem}>
              <span className={css.specLabel}>Unit</span>
              <span className={css.specValue}>{eq.unit}</span>
            </div>
            <div className={css.specItem}>
              <span className={css.specLabel}>Area</span>
              <span className={css.specValue}>{eq.area}</span>
            </div>
            <div className={css.specItem}>
              <span className={css.specLabel}>P&ID</span>
              <span className={css.specValue}>{eq.pid}</span>
            </div>
          </div>
        </div>

        <div>
          <div className={css.sectionTitle}>Description & Function</div>
          <div className={css.descriptionBox}>{eq.description}</div>
        </div>

        <div>
          <div className={css.sectionTitle}>Quick Actions</div>
          <div className={css.quickActionsGroup}>
            <button
              type="button"
              className={css.actionBtnPrimary}
              onClick={() => { onViewEquipment(eq.tag) }}
            >
              <span>View Equipment</span>
              <span aria-hidden="true"> →</span>
            </button>

            <div className={css.actionGrid}>
              <button
                type="button"
                className={css.actionBtnSecondary}
                onClick={() => { pidStore.resetZoom() }}
                title="Focus on P&ID diagram"
              >
                Show on P&ID
              </button>

              <button
                type="button"
                className={css.actionBtnSecondary}
                onClick={() => { onViewDocuments(eq.tag) }}
                title="View equipment datasheets and procedures"
              >
                View Documents
              </button>
            </div>

            <button
              type="button"
              className={`${css.actionBtnSecondary} ${css.actionFullWidth}`}
              onClick={() => { onStartInvestigation(eq.tag) }}
            >
              Start Investigation
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
