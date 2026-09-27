import React from 'react'
import { usePIDStore, pidStore } from '../pidStore'
import { workbenchStore } from '../workbenchStore'
import { toastStore } from '../toastStore'
import css from './EquipmentContextPanel.module.css'

export const EquipmentContextPanel: React.FC = () => {
  const { selectedEquipment, activeEquipmentTab } = usePIDStore()

  if (!selectedEquipment) {
    return (
      <aside className={css.panel}>
        <div className={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          Select an equipment item on the P&ID or navigator to inspect context.
        </div>
      </aside>
    )
  }

  const eq = selectedEquipment

  return (
    <aside className={css.panel}>
      {/* Header */}
      <div className={css.panelHeader}>
        <div className={css.headerTop}>
          <div>
            <h2 className={css.tagTitle}>{eq.tag}</h2>
            <div className={css.subTitle}>{eq.name}</div>
          </div>
          <div className={css.statusPill}>
            <span className={css.statusDot} />
            <span>{eq.status}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav className={css.tabNav} role="tablist">
        <button
          type="button"
          className={`${css.tabBtn} ${activeEquipmentTab === 'overview' ? css.active : ''}`}
          onClick={() => pidStore.setActiveEquipmentTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className={`${css.tabBtn} ${activeEquipmentTab === 'documents' ? css.active : ''}`}
          onClick={() => pidStore.setActiveEquipmentTab('documents')}
        >
          Documents
        </button>
        <button
          type="button"
          className={`${css.tabBtn} ${activeEquipmentTab === 'related' ? css.active : ''}`}
          onClick={() => pidStore.setActiveEquipmentTab('related')}
        >
          Related
        </button>
        <button
          type="button"
          className={`${css.tabBtn} ${activeEquipmentTab === 'history' ? css.active : ''}`}
          onClick={() => pidStore.setActiveEquipmentTab('history')}
        >
          History
        </button>
      </nav>

      {/* Body Content */}
      <div className={css.panelBody}>
        {/* Vector Industrial Graphic Representation */}
        <div className={css.imageBox}>
          <svg width="180" height="90" viewBox="0 0 180 90" fill="none">
            <rect x="10" y="15" width="160" height="60" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
            {/* Centrifugal Pump Vector Drawing */}
            <circle cx="70" cy="45" r="22" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
            <path d="M 70 23 L 70 67 M 48 45 L 92 45" stroke="#0284c7" strokeWidth="1.5" />
            <polygon points="70,30 80,45 60,45" fill="#0284c7" />
            <rect x="25" y="32" width="22" height="26" fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
            <text x="36" y="49" fontSize="10" textAnchor="middle" fill="#0f172a" fontWeight="700">M</text>
            <path d="M 92 45 L 140 45" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 2" />
            <text x="116" y="38" fontSize="9" fill="#0284c7" fontWeight="600">SUCTION</text>
          </svg>
        </div>

        {/* Specifications Grid */}
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

        {/* Description */}
        <div>
          <div className={css.sectionTitle}>Description & Function</div>
          <div className={css.descriptionBox}>{eq.description}</div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className={css.sectionTitle}>Quick Actions</div>
          <div className={css.quickActionsGroup}>
            <button
              type="button"
              className={css.actionBtnPrimary}
              onClick={() => pidStore.openAIChat(`Analyze operating risk and failure telemetry for ${eq.tag}`)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
              </svg>
              <span>Ask AI About {eq.tag}</span>
            </button>

            <div className={css.actionGrid}>
              <button
                type="button"
                className={css.actionBtnSecondary}
                onClick={() => {
                  pidStore.resetZoom()
                  toastStore.info(`Focused P&ID diagram on ${eq.tag}`)
                }}
                title="Focus on P&ID diagram"
              >
                Show on P&ID
              </button>

              <button
                type="button"
                className={css.actionBtnSecondary}
                onClick={() => {
                  workbenchStore.setActiveRoute('/documents')
                  toastStore.info(`Showing documents for ${eq.tag}`)
                }}
                title="View equipment datasheets and procedures"
              >
                View Documents
              </button>
            </div>

            <button
              type="button"
              className={css.actionBtnSecondary}
              style={{ width: '100%', borderColor: '#cbd5e1' }}
              onClick={() => {
                const inv = workbenchStore.addInvestigation({
                  title: `${eq.tag} (${eq.name}) Thermal & Pressure Analysis`,
                  description: `Initiated investigation for asset ${eq.tag} on ${eq.unit} (${eq.area}).`,
                  plant: 'MRPL Refinery',
                  unit: eq.unit,
                  area: eq.area,
                  equipmentId: eq.tag,
                  priority: 'High',
                  status: 'Open',
                  assignedUser: 'N. Engineer',
                })
                toastStore.success(`Created Investigation ${inv.id} for ${eq.tag}`)
                workbenchStore.setActiveRoute('/investigations')
              }}
            >
              ⚡ Start Investigation Task
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
