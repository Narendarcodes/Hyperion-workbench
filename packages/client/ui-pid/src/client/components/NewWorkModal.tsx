import React, { useState } from 'react'
import { workbenchStore } from '../workbenchStore'
import { pidStore } from '../pidStore'
import { toastStore } from '../toastStore'
import css from './NewWorkModal.module.css'

export const NewWorkModal: React.FC = () => {
  const [workType, setWorkType] = useState<
    'investigation' | 'doc_analysis' | 'eng_question' | 'pid_analysis' | 'equipment_investigation'
  >('investigation')
  const [title, setTitle] = useState('')
  const [unit, setUnit] = useState('CDU-03')
  const [equipmentTag, setEquipmentTag] = useState('P-101 A/B')
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low' | 'Critical'>('High')
  const [description, setDescription] = useState('')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const finalTitle = title || `${workType.replace('_', ' ').toUpperCase()} - ${unit}`

    if (workType === 'investigation' || workType === 'equipment_investigation') {
      const inv = workbenchStore.addInvestigation({
        title: finalTitle,
        description: description || 'New investigation initiated via New Work workflow.',
        plant: 'MRPL Refinery',
        unit,
        area: '100 - Crude Preheat',
        equipmentId: equipmentTag,
        priority,
        status: 'Open',
        assignedUser: 'N. Engineer',
      })
      toastStore.success(`Created Investigation ${inv.id}`)
      workbenchStore.setActiveRoute('/investigations')
    } else if (workType === 'pid_analysis') {
      pidStore.setActiveNav('pid')
      toastStore.success(`Opened P&ID Analysis Workspace for ${unit}`)
    } else {
      workbenchStore.setActiveRoute('/conversations')
      toastStore.success(`Started new ${workType.replace('_', ' ')} session`)
    }

    workbenchStore.closeNewWork()
  }

  return (
    <div className={css.backdrop} onClick={() => workbenchStore.closeNewWork()}>
      <div className={css.modal} onClick={e => e.stopPropagation()}>
        <div className={css.header}>
          <div className={css.headerTitleGroup}>
            <div className={css.iconBox}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div>
              <h2 className={css.title}>Create New Work</h2>
              <p className={css.subtitle}>Initiate engineering analysis, investigation, or session</p>
            </div>
          </div>
          <button type="button" className={css.closeBtn} onClick={() => workbenchStore.closeNewWork()}>×</button>
        </div>

        <form onSubmit={handleCreate} className={css.form}>
          {/* Work Type Selection */}
          <div className={css.fieldGroup}>
            <label className={css.label}>Work Type</label>
            <div className={css.typeGrid}>
              <button
                type="button"
                className={`${css.typeOption} ${workType === 'investigation' ? css.selectedType : ''}`}
                onClick={() => setWorkType('investigation')}
              >
                <span className={css.typeIcon}>🔍</span>
                <span className={css.typeLabel}>Investigation</span>
              </button>

              <button
                type="button"
                className={`${css.typeOption} ${workType === 'pid_analysis' ? css.selectedType : ''}`}
                onClick={() => setWorkType('pid_analysis')}
              >
                <span className={css.typeIcon}>📐</span>
                <span className={css.typeLabel}>P&ID Analysis</span>
              </button>

              <button
                type="button"
                className={`${css.typeOption} ${workType === 'equipment_investigation' ? css.selectedType : ''}`}
                onClick={() => setWorkType('equipment_investigation')}
              >
                <span className={css.typeIcon}>⚙️</span>
                <span className={css.typeLabel}>Equipment Check</span>
              </button>

              <button
                type="button"
                className={`${css.typeOption} ${workType === 'doc_analysis' ? css.selectedType : ''}`}
                onClick={() => setWorkType('doc_analysis')}
              >
                <span className={css.typeIcon}>📄</span>
                <span className={css.typeLabel}>Document Review</span>
              </button>

              <button
                type="button"
                className={`${css.typeOption} ${workType === 'eng_question' ? css.selectedType : ''}`}
                onClick={() => setWorkType('eng_question')}
              >
                <span className={css.typeIcon}>💡</span>
                <span className={css.typeLabel}>AI Question</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div className={css.fieldGroup}>
            <label className={css.label}>Title / Objective</label>
            <input
              type="text"
              className={css.input}
              placeholder="e.g. Pump P-101 Thermal Overload Analysis"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Unit & Equipment row */}
          <div className={css.row}>
            <div className={css.fieldGroup}>
              <label className={css.label}>Plant Unit</label>
              <select className={css.select} value={unit} onChange={e => setUnit(e.target.value)}>
                <option value="CDU-03">CDU-03 (Crude Distillation)</option>
                <option value="VDU-01">VDU-01 (Vacuum Distillation)</option>
                <option value="HCU-02">HCU-02 (Hydrocracker)</option>
              </select>
            </div>

            <div className={css.fieldGroup}>
              <label className={css.label}>Associated Equipment</label>
              <select className={css.select} value={equipmentTag} onChange={e => setEquipmentTag(e.target.value)}>
                <option value="P-101 A/B">P-101 A/B (Feed Pumps)</option>
                <option value="E-101">E-101 (Preheat Exchanger)</option>
                <option value="T-101">T-101 (Atmospheric Column)</option>
                <option value="V-201">V-201 (Reflux Drum)</option>
              </select>
            </div>
          </div>

          {/* Priority */}
          <div className={css.fieldGroup}>
            <label className={css.label}>Priority</label>
            <div className={css.priorityGroup}>
              {(['Low', 'Medium', 'High', 'Critical'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  className={`${css.prioBtn} ${priority === p ? css.activePrio : ''}`}
                  onClick={() => setPriority(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className={css.fieldGroup}>
            <label className={css.label}>Description & Notes</label>
            <textarea
              className={css.textarea}
              placeholder="Provide background context, symptoms, or engineering instructions..."
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className={css.actions}>
            <button type="button" className={css.cancelBtn} onClick={() => workbenchStore.closeNewWork()}>Cancel</button>
            <button type="submit" className={css.submitBtn}>Create & Launch Workspace</button>
          </div>
        </form>
      </div>
    </div>
  )
}
