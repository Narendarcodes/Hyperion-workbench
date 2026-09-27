import React, { useState } from 'react'
import { useWorkbenchStore, workbenchStore } from '../workbenchStore'
import { toastStore } from '../toastStore'
import css from './FilterModal.module.css'

export const FilterModal: React.FC = () => {
  const { isFilterOpen, filterDomain, activeFilters } = useWorkbenchStore()

  const [unit, setUnit] = useState(activeFilters.unit || 'All Units')
  const [status, setStatus] = useState(activeFilters.status || 'All Statuses')
  const [area, setArea] = useState(activeFilters.area || 'All Areas')
  const [type, setType] = useState(activeFilters.type || 'All Types')
  const [priority, setPriority] = useState(activeFilters.priority || 'All Priorities')

  if (!isFilterOpen) return null

  const handleApply = () => {
    const filters: Record<string, string> = {}
    if (unit !== 'All Units') filters.unit = unit
    if (status !== 'All Statuses') filters.status = status
    if (area !== 'All Areas') filters.area = area
    if (type !== 'All Types') filters.type = type
    if (priority !== 'All Priorities') filters.priority = priority

    workbenchStore.applyFilters(filters)
    toastStore.success(`Filters applied for ${filterDomain.toUpperCase()}`)
  }

  const handleReset = () => {
    setUnit('All Units')
    setStatus('All Statuses')
    setArea('All Areas')
    setType('All Types')
    setPriority('All Priorities')
    workbenchStore.resetFilters()
    toastStore.info(`Cleared all filters for ${filterDomain.toUpperCase()}`)
  }

  return (
    <div className={css.backdrop} onClick={() => workbenchStore.closeFilter()}>
      <div className={css.modal} onClick={e => e.stopPropagation()}>
        <div className={css.header}>
          <div className={css.titleGroup}>
            <h3 className={css.title}>Filter {filterDomain.toUpperCase()}</h3>
            <p className={css.subtitle}>Specify parameters to refine active workspace records</p>
          </div>
          <button type="button" className={css.closeBtn} onClick={() => workbenchStore.closeFilter()}>×</button>
        </div>

        <div className={css.body}>
          {/* Unit Filter */}
          <div className={css.fieldGroup}>
            <label className={css.label}>Unit</label>
            <select className={css.select} value={unit} onChange={e => setUnit(e.target.value)}>
              <option value="All Units">All Units</option>
              <option value="CDU-03">CDU-03 (Crude Distillation Unit)</option>
              <option value="VDU-01">VDU-01 (Vacuum Distillation Unit)</option>
              <option value="HCU-02">HCU-02 (Hydrocracker Unit)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className={css.fieldGroup}>
            <label className={css.label}>Status</label>
            <select className={css.select} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="All Statuses">All Statuses</option>
              <option value="In Service">In Service / Active</option>
              <option value="Standby">Standby</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Open">Open (Investigations)</option>
            </select>
          </div>

          {/* Area Filter */}
          <div className={css.fieldGroup}>
            <label className={css.label}>Area / Section</label>
            <select className={css.select} value={area} onChange={e => setArea(e.target.value)}>
              <option value="All Areas">All Areas</option>
              <option value="Area 100 - Crude Preheat">Area 100 - Crude Preheat</option>
              <option value="Area 200 - Fractionation">Area 200 - Fractionation</option>
              <option value="Area 300 - Heat Recovery">Area 300 - Heat Recovery</option>
            </select>
          </div>

          {/* Type Filter */}
          {(filterDomain === 'equipment' || filterDomain === 'documents' || filterDomain === 'pid') && (
            <div className={css.fieldGroup}>
              <label className={css.label}>Type / Category</label>
              <select className={css.select} value={type} onChange={e => setType(e.target.value)}>
                <option value="All Types">All Types</option>
                <option value="Pump">Pumps</option>
                <option value="Exchanger">Heat Exchangers</option>
                <option value="Tower">Towers & Columns</option>
                <option value="Datasheet">Datasheets</option>
                <option value="P&ID">P&IDs</option>
              </select>
            </div>
          )}

          {/* Priority Filter for Investigations */}
          {filterDomain === 'investigations' && (
            <div className={css.fieldGroup}>
              <label className={css.label}>Priority Level</label>
              <select className={css.select} value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="All Priorities">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          )}
        </div>

        <div className={css.footer}>
          <button type="button" className={css.resetBtn} onClick={handleReset}>Reset All</button>
          <button type="button" className={css.applyBtn} onClick={handleApply}>Apply Filters</button>
        </div>
      </div>
    </div>
  )
}
