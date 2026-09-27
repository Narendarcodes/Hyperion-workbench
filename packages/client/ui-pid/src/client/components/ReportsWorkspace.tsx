import React from 'react'
import { toastStore } from '../toastStore'
import css from './ReportsWorkspace.module.css'

export const ReportsWorkspace: React.FC = () => {
  const reports = [
    { id: 'rep-1', title: 'CDU-03 Monthly Energy Efficiency & Throughput Audit', date: '2026-09-24', author: 'Process Optimization Team', status: 'Completed' },
    { id: 'rep-2', title: 'P-101 A/B Pump Reliability & Cavitation Diagnostics Report', date: '2026-09-20', author: 'Mechanical Integrity Team', status: 'Approved' },
    { id: 'rep-3', title: 'Crude Preheat Train E-101/102 Fouling Rate Analysis', date: '2026-09-15', author: 'Thermal Engineering', status: 'Under Review' },
  ]

  return (
    <div className={css.container}>
      <div className={css.header}>
        <div>
          <div className={css.breadcrumb}>Work / Reports</div>
          <h1 className={css.title}>Engineering Reports</h1>
          <p className={css.subtitle}>Generated technical audits, reliability reports, and plant performance metrics</p>
        </div>

        <button type="button" className={css.newBtn} onClick={() => toastStore.info('Generating new plant performance report...')}>
          <span>+ Generate Report</span>
        </button>
      </div>

      <div className={css.card}>
        <table className={css.table}>
          <thead>
            <tr>
              <th>Report Title</th>
              <th>Date Published</th>
              <th>Author / Team</th>
              <th>Status</th>
              <th className={css.actionsCol}>Export</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id}>
                <td className={css.repTitle} onClick={() => toastStore.success(`Opening report ${r.id}`)}>
                  {r.title}
                </td>
                <td>{r.date}</td>
                <td>{r.author}</td>
                <td>
                  <span className={css.statusBadge}>● {r.status}</span>
                </td>
                <td className={css.actionsCol}>
                  <button type="button" className={css.exportBtn} onClick={() => toastStore.success(`Exported PDF for ${r.id}`)}>
                    PDF
                  </button>
                  <button type="button" className={css.exportBtn} onClick={() => toastStore.success(`Exported CSV for ${r.id}`)}>
                    CSV
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
