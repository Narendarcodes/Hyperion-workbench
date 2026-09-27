import React from 'react'
import { useWorkbenchStore, workbenchStore } from '../workbenchStore'
import { toastStore } from '../toastStore'
import css from './SovereigntyWorkspace.module.css'

export const SovereigntyWorkspace: React.FC = () => {
  const { sovereigntyPolicies } = useWorkbenchStore()

  const handleToggle = (id: string, label: string) => {
    workbenchStore.togglePolicy(id)
    toastStore.success(`Updated sovereignty policy state for ${label}`)
  }

  const handleSave = () => {
    toastStore.success('Saved Sovereignty & Air-Gapped compliance configuration.')
  }

  return (
    <div className={css.container}>
      <div className={css.header}>
        <div>
          <div className={css.breadcrumb}>More / Sovereignty</div>
          <h1 className={css.title}>Sovereignty & Air-Gapped Security Center</h1>
          <p className={css.subtitle}>Enforce on-premises data residency, local inference isolation, and provider access rules</p>
        </div>

        <button type="button" className={css.saveBtn} onClick={handleSave}>Save Security Policy</button>
      </div>

      <div className={css.card}>
        <div className={css.policyList}>
          {sovereigntyPolicies.map(p => (
            <div key={p.id} className={css.policyItem}>
              <div className={css.policyInfo}>
                <h3 className={css.policyTitle}>{p.label}</h3>
                <p className={css.policyDesc}>{p.description}</p>
              </div>

              <button
                type="button"
                className={`${css.switch} ${p.enabled ? css.switchOn : ''}`}
                onClick={() => handleToggle(p.id, p.label)}
              >
                <div className={css.switchThumb} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
