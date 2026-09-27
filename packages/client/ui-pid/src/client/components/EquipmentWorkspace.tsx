import React, { useState } from 'react'
import { useWorkbenchStore, workbenchStore } from '../workbenchStore'
import { pidStore } from '../pidStore'
import { toastStore } from '../toastStore'
import css from './EquipmentWorkspace.module.css'

export const EquipmentWorkspace: React.FC = () => {
  const { equipments, activeFilters } = useWorkbenchStore()
  const [selectedEqId, setSelectedEqId] = useState(equipments[0]?.id || '')

  const filteredEquipments = equipments.filter((eq) => {
    if (activeFilters.unit && activeFilters.unit !== 'All Units' && eq.unit !== activeFilters.unit) return false
    if (activeFilters.status && activeFilters.status !== 'All Statuses' && eq.status !== activeFilters.status) return false
    if (activeFilters.area && activeFilters.area !== 'All Areas' && eq.area !== activeFilters.area) return false
    return true
  })

  const selectedEq = equipments.find(e => e.id === selectedEqId) || equipments[0]

  const handleShowOnPID = (tag: string) => {
    pidStore.setSelectedEquipmentById(tag)
    pidStore.setActiveNav('pid')
    toastStore.info(`Focusing P&ID diagram on ${tag}`)
  }

  const handleStartInvestigation = (eq: typeof selectedEq) => {
    workbenchStore.addInvestigation({
      title: `${eq.tag} Performance Audit`,
      description: `Investigating operating anomalies for ${eq.name} (${eq.tag}).`,
      plant: 'MRPL Refinery',
      unit: eq.unit,
      area: eq.area,
      equipmentId: eq.tag,
      priority: 'High',
      status: 'Open',
      assignedUser: 'N. Engineer',
    })
    toastStore.success(`Started investigation for ${eq.tag}`)
    workbenchStore.setActiveRoute('/investigations')
  }

  return (
    <div className={css.container}>
      {/* Header */}
      <div className={css.header}>
        <div>
          <div className={css.breadcrumb}>Plant / Equipment</div>
          <h1 className={css.title}>Plant Equipment Roster</h1>
          <p className={css.subtitle}>Explore mechanical specs, telemetry, maintenance logs and connected P&IDs</p>
        </div>

        <div className={css.headerActions}>
          <button type="button" className={css.filterBtn} onClick={() => workbenchStore.openFilter('equipment')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filter ({Object.keys(activeFilters).length})</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className={css.grid}>
        {/* Left Equipment Table / Roster */}
        <div className={css.tableCard}>
          <div className={css.tableHeader}>
            <h3 className={css.tableTitle}>Equipment Items ({filteredEquipments.length})</h3>
          </div>
          <div className={css.tableScroll}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Tag / ID</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipments.map(eq => (
                  <tr
                    key={eq.id}
                    className={selectedEq?.id === eq.id ? css.activeRow : ''}
                    onClick={() => setSelectedEqId(eq.id)}
                  >
                    <td className={css.tagCell}>{eq.tag}</td>
                    <td>{eq.name}</td>
                    <td>{eq.category}</td>
                    <td>{eq.unit}</td>
                    <td>
                      <span className={`${css.statusBadge} ${css[eq.status.replace(/\s+/g, '')]}`}>
                        ● {eq.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Detail Inspector Card */}
        {selectedEq && (
          <div className={css.detailCard}>
            <div className={css.detailHeader}>
              <div>
                <span className={css.detailTag}>{selectedEq.tag}</span>
                <h3 className={css.detailTitle}>{selectedEq.name}</h3>
                <p className={css.detailSub}>{selectedEq.unit} • {selectedEq.area}</p>
              </div>
              <span className={`${css.statusBadge} ${css[selectedEq.status.replace(/\s+/g, '')]}`}>
                ● {selectedEq.status}
              </span>
            </div>

            <div className={css.specGrid}>
              <div className={css.specItem}>
                <span className={css.specLabel}>Category</span>
                <span className={css.specVal}>{selectedEq.category}</span>
              </div>
              <div className={css.specItem}>
                <span className={css.specLabel}>Design Pressure</span>
                <span className={css.specVal}>{selectedEq.designPress}</span>
              </div>
              <div className={css.specItem}>
                <span className={css.specLabel}>Operating Pressure</span>
                <span className={css.specVal}>{selectedEq.operatingPress}</span>
              </div>
              <div className={css.specItem}>
                <span className={css.specLabel}>Design Temperature</span>
                <span className={css.specVal}>{selectedEq.temp}</span>
              </div>
            </div>

            <div className={css.actionStack}>
              <button
                type="button"
                className={css.actionBtnPrimary}
                onClick={() => handleShowOnPID(selectedEq.tag)}
              >
                <span>Show on P&ID Diagram</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>

              <button
                type="button"
                className={css.actionBtnSecondary}
                onClick={() => handleStartInvestigation(selectedEq)}
              >
                <span>Start Investigation for {selectedEq.tag}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
