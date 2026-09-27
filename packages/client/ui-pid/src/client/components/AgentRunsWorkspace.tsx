import React from 'react'
import { toastStore } from '../toastStore'
import css from './AgentRunsWorkspace.module.css'

export const AgentRunsWorkspace: React.FC = () => {
  const runs = [
    { id: 'run-892', agent: 'P&ID Vision Reasoning Subagent', target: 'CDU-03-001', duration: '1.2s', status: 'Completed', tokens: '2,450' },
    { id: 'run-891', agent: 'Equipment Telemetry Monitor', target: 'P-101 A/B', duration: '450ms', status: 'Completed', tokens: '890' },
    { id: 'run-890', agent: 'Thermal Exchanger Analyst', target: 'E-101', duration: '2.8s', status: 'Completed', tokens: '4,120' },
  ]

  return (
    <div className={css.container}>
      <div className={css.header}>
        <div>
          <div className={css.breadcrumb}>More / Agent Runs</div>
          <h1 className={css.title}>Autonomous Agent Execution Logs</h1>
          <p className={css.subtitle}>Inspect background agent invocations, tool calls, and execution metrics</p>
        </div>
      </div>

      <div className={css.card}>
        <table className={css.table}>
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Subagent Name</th>
              <th>Target Asset / Context</th>
              <th>Execution Time</th>
              <th>Tokens Used</th>
              <th>Status</th>
              <th className={css.actionsCol}>Details</th>
            </tr>
          </thead>
          <tbody>
            {runs.map(r => (
              <tr key={r.id}>
                <td className={css.runId}>{r.id}</td>
                <td className={css.agentName}>{r.agent}</td>
                <td>{r.target}</td>
                <td>{r.duration}</td>
                <td>{r.tokens}</td>
                <td><span className={css.statusPill}>● {r.status}</span></td>
                <td className={css.actionsCol}>
                  <button type="button" className={css.viewBtn} onClick={() => toastStore.info(`Inspecting execution trace for ${r.id}`)}>
                    Inspect Trace
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
