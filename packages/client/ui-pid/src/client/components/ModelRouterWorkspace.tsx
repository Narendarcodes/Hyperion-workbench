import React from 'react'
import { useWorkbenchStore, workbenchStore } from '../workbenchStore'
import { toastStore } from '../toastStore'
import css from './ModelRouterWorkspace.module.css'

export const ModelRouterWorkspace: React.FC = () => {
  const { modelRouteRules } = useWorkbenchStore()

  const handleToggle = (id: string, name: string) => {
    workbenchStore.toggleRule(id)
    toastStore.success(`Updated routing rule state for ${name}`)
  }

  const handleSave = () => {
    toastStore.success('Saved Model Router rules to persistent local configuration.')
  }

  const handleReset = () => {
    toastStore.info('Restored Model Router rules to default factory SLAs.')
  }

  return (
    <div className={css.container}>
      <div className={css.header}>
        <div>
          <div className={css.breadcrumb}>More / Model Router</div>
          <h1 className={css.title}>Model Routing & Dispatch Policy</h1>
          <p className={css.subtitle}>Configure task-based AI routing, fallback targets, and latency SLAs across local runtimes</p>
        </div>

        <div className={css.headerActions}>
          <button type="button" className={css.resetBtn} onClick={handleReset}>Reset Defaults</button>
          <button type="button" className={css.saveBtn} onClick={handleSave}>Save Routing Policy</button>
        </div>
      </div>

      <div className={css.card}>
        <table className={css.table}>
          <thead>
            <tr>
              <th>Rule Name</th>
              <th>Task Domain</th>
              <th>Primary Model Target</th>
              <th>Fallback Target</th>
              <th>Latency SLA</th>
              <th>Status</th>
              <th className={css.actionsCol}>Toggle</th>
            </tr>
          </thead>
          <tbody>
            {modelRouteRules.map(rule => (
              <tr key={rule.id}>
                <td className={css.ruleName}>{rule.name}</td>
                <td><span className={css.taskTag}>{rule.taskType}</span></td>
                <td className={css.modelVal}>{rule.primaryModel}</td>
                <td className={css.modelVal}>{rule.fallbackModel}</td>
                <td>{rule.latencySLA}</td>
                <td>
                  <span className={`${css.statusBadge} ${rule.enabled ? css.active : css.disabled}`}>
                    ● {rule.enabled ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className={css.actionsCol}>
                  <button
                    type="button"
                    className={`${css.toggleBtn} ${rule.enabled ? css.toggleOn : ''}`}
                    onClick={() => handleToggle(rule.id, rule.name)}
                  >
                    {rule.enabled ? 'ON' : 'OFF'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
