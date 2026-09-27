import React from 'react'
import { useWorkbenchStore } from '../workbenchStore'
import { toastStore } from '../toastStore'
import css from './AuditLogsWorkspace.module.css'

export const AuditLogsWorkspace: React.FC = () => {
  const { auditEvents } = useWorkbenchStore()

  return (
    <div className={css.container}>
      <div className={css.header}>
        <div>
          <div className={css.breadcrumb}>More / Audit Logs</div>
          <h1 className={css.title}>Cryptographic System Audit Log</h1>
          <p className={css.subtitle}>Immutable event stream of engineering decisions, P&ID inspections, and security policy edits</p>
        </div>

        <button type="button" className={css.exportBtn} onClick={() => toastStore.success('Exported audit log events (JSON/CSV)')}>
          Export Audit Trail
        </button>
      </div>

      <div className={css.card}>
        <table className={css.table}>
          <thead>
            <tr>
              <th>Event Timestamp</th>
              <th>Category</th>
              <th>User</th>
              <th>Action Executed</th>
              <th>Event Details</th>
            </tr>
          </thead>
          <tbody>
            {auditEvents.map(evt => (
              <tr key={evt.id}>
                <td className={css.timeCell}>{evt.timestamp}</td>
                <td><span className={css.catTag}>{evt.category}</span></td>
                <td className={css.userVal}>{evt.user}</td>
                <td className={css.actionVal}>{evt.action}</td>
                <td className={css.detailsVal}>{evt.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
