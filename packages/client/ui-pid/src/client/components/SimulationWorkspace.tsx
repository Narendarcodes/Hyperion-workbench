import React, { useState } from 'react'
import { toastStore } from '../toastStore'
import css from './SimulationWorkspace.module.css'

export const SimulationWorkspace: React.FC = () => {
  const [feedRate, setFeedRate] = useState('14,500')
  const [preheatTemp, setPreheatTemp] = useState('210')
  const [columnPressure, setColumnPressure] = useState('3.2')
  const [isRunning, setIsRunning] = useState(false)

  const handleRunSimulation = () => {
    setIsRunning(true)
    toastStore.info('Running thermodynamic steady-state simulation for CDU-03...')
    setTimeout(() => {
      setIsRunning(false)
      toastStore.success('Simulation completed: Yield optimized (+1.4% distillate recovery)')
    }, 1500)
  }

  return (
    <div className={css.container}>
      <div className={css.header}>
        <div>
          <div className={css.breadcrumb}>Simulation / Process Sandbox</div>
          <h1 className={css.title}>Process Flow & Thermodynamic Simulation</h1>
          <p className={css.subtitle}>Simulate yield curves, hydraulic pressure drops, and thermal energy balances</p>
        </div>

        <button type="button" className={css.runBtn} onClick={handleRunSimulation} disabled={isRunning}>
          {isRunning ? 'Running Physics Engine...' : '► Run Steady-State Simulation'}
        </button>
      </div>

      <div className={css.grid}>
        <div className={css.panelCard}>
          <h3 className={css.cardTitle}>Simulation Parameters</h3>

          <div className={css.formGroup}>
            <label className={css.label}>Crude Feed Rate (BPD)</label>
            <input
              type="text"
              className={css.input}
              value={feedRate}
              onChange={e => setFeedRate(e.target.value)}
            />
          </div>

          <div className={css.formGroup}>
            <label className={css.label}>Preheat Train Outlet Temp (°C)</label>
            <input
              type="text"
              className={css.input}
              value={preheatTemp}
              onChange={e => setPreheatTemp(e.target.value)}
            />
          </div>

          <div className={css.formGroup}>
            <label className={css.label}>Column Overhead Pressure (bar)</label>
            <input
              type="text"
              className={css.input}
              value={columnPressure}
              onChange={e => setColumnPressure(e.target.value)}
            />
          </div>

          <button type="button" className={css.resetBtn} onClick={() => toastStore.info('Reset simulation parameters to design baseline')}>
            Reset to Baseline Specs
          </button>
        </div>

        <div className={css.resultsCard}>
          <h3 className={css.cardTitle}>Simulated Output Metrics</h3>

          <div className={css.metricsGrid}>
            <div className={css.metricBox}>
              <span className={css.metricLabel}>Naphtha Yield</span>
              <span className={css.metricVal}>18.4 %</span>
            </div>
            <div className={css.metricBox}>
              <span className={css.metricLabel}>Kerosene Recovery</span>
              <span className={css.metricVal}>24.2 %</span>
            </div>
            <div className={css.metricBox}>
              <span className={css.metricLabel}>Diesel Fraction</span>
              <span className={css.metricVal}>32.8 %</span>
            </div>
            <div className={css.metricBox}>
              <span className={css.metricLabel}>Furnace Heat Duty</span>
              <span className={css.metricVal}>42.6 MW</span>
            </div>
          </div>

          <div className={css.chartPlaceholder}>
            <span>[ Thermodynamic Distillation Curve Chart Visualization ]</span>
          </div>
        </div>
      </div>
    </div>
  )
}
