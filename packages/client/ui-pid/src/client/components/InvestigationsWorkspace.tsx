import React, { useState } from 'react'
import { useWorkbenchStore, workbenchStore } from '../workbenchStore'
import { toastStore } from '../toastStore'
import css from './InvestigationsWorkspace.module.css'

export const InvestigationsWorkspace: React.FC = () => {
  const { investigations, activeFilters } = useWorkbenchStore()
  const [selectedInvId, setSelectedInvId] = useState(investigations[0]?.id || '')

  const filtered = investigations.filter((inv) => {
    if (activeFilters.status && activeFilters.status !== 'All Statuses' && inv.status !== activeFilters.status) return false
    if (activeFilters.priority && activeFilters.priority !== 'All Priorities' && inv.priority !== activeFilters.priority) return false
    return true
  })

  const selectedInv = investigations.find(i => i.id === selectedInvId) || investigations[0]

  return (
    <div className={css.container}>
      <div className={css.header}>
        <div>
          <div className={css.breadcrumb}>Work / Investigations</div>
          <h1 className={css.title}>Engineering Investigations</h1>
          <p className={css.subtitle}>Track active failure mode analyses, root cause investigations, and process anomaly reports</p>
        </div>

        <div className={css.headerActions}>
          <button type="button" className={css.filterBtn} onClick={() => workbenchStore.openFilter('investigations')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filter ({Object.keys(activeFilters).length})</span>
          </button>

          <button type="button" className={css.newBtn} onClick={() => workbenchStore.openNewWork()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Start Investigation</span>
          </button>
        </div>
      </div>

      <div className={css.grid}>
        <div className={css.listCard}>
          <div className={css.listHeader}>
            <h3 className={css.listTitle}>Active Investigations ({filtered.length})</h3>
          </div>
          <div className={css.listScroll}>
            {filtered.map(inv => (
              <div
                key={inv.id}
                className={`${css.invItem} ${selectedInv?.id === inv.id ? css.activeInv : ''}`}
                onClick={() => setSelectedInvId(inv.id)}
              >
                <div className={css.invItemHeader}>
                  <span className={css.invId}>{inv.id}</span>
                  <span className={`${css.prioBadge} ${css[inv.priority]}`}>{inv.priority}</span>
                </div>
                <h4 className={css.invTitle}>{inv.title}</h4>
                <div className={css.invMeta}>
                  <span>{inv.unit} • {inv.area}</span>
                  <span className={css.statusPill}>● {inv.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedInv && (
          <div className={css.detailCard}>
            <div className={css.detailHeader}>
              <div>
                <span className={css.invIdLarge}>{selectedInv.id}</span>
                <h2 className={css.detailTitle}>{selectedInv.title}</h2>
                <p className={css.detailSub}>Created {selectedInv.createdAt} by {selectedInv.assignedUser}</p>
              </div>
              <span className={`${css.statusLarge} ${css[selectedInv.status.replace(/\s+/g, '')]}`}>
                ● {selectedInv.status}
              </span>
            </div>

            <div className={css.metaGrid}>
              <div className={css.metaItem}>
                <span className={css.metaLabel}>Plant & Unit</span>
                <span className={css.metaVal}>{selectedInv.plant} • {selectedInv.unit}</span>
              </div>
              <div className={css.metaItem}>
                <span className={css.metaLabel}>Associated Asset</span>
                <span className={css.metaVal}>{selectedInv.equipmentId || 'N/A'}</span>
              </div>
              <div className={css.metaItem}>
                <span className={css.metaLabel}>Priority</span>
                <span className={css.metaVal}>{selectedInv.priority}</span>
              </div>
              <div className={css.metaItem}>
                <span className={css.metaLabel}>Evidence Attachments</span>
                <span className={css.metaVal}>{selectedInv.evidenceCount} Files</span>
              </div>
            </div>

            <div className={css.section}>
              <h4 className={css.sectionTitle}>Problem Statement & Findings</h4>
              <p className={css.sectionBody}>{selectedInv.description}</p>
            </div>

            <div className={css.detailActions}>
              <button
                type="button"
                className={css.actionPrimary}
                onClick={() => toastStore.success(`Marked ${selectedInv.id} as Resolved`)}
              >
                Mark as Resolved
              </button>
              <button
                type="button"
                className={css.actionSecondary}
                onClick={() => toastStore.info(`Exported investigation log for ${selectedInv.id}`)}
              >
                Export PDF Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
