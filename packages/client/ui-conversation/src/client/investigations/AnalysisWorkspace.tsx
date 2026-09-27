/**
 * AnalysisWorkspace: Central engineering analysis workspace.
 * Displays tabs (Analysis, Evidence, Timeline, Actions, Similar Cases),
 * Agent preset selector (Standard), Rerun CTA, User Request message,
 * Hyperion Analysis Response with Sub-tabs (Findings, Root Causes, Comparisons, Recommendations),
 * highlighted Key Findings card, and multi-line Vibration Trend chart with tooltip.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/AnalysisWorkspace
 */

import { useState } from 'react'
import {
  IconChevronDownOutline14,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  AnalysisSubTab,
  InvestigationAnalysisDetailData,
  InvestigationAnalysisWorkspaceTab,
  VibrationTrendPoint,
} from './types.ts'
import css from './AnalysisWorkspace.module.css'

export interface AnalysisWorkspaceProps {
  readonly data: InvestigationAnalysisDetailData
  readonly onRerun?: () => void
  readonly onAgentChange?: (agent: string) => void
  readonly onTabChange?: (tab: InvestigationAnalysisWorkspaceTab) => void
  readonly onSubTabChange?: (subTab: AnalysisSubTab) => void
}

const WORKSPACE_TABS: readonly { key: InvestigationAnalysisWorkspaceTab; label: string }[] = [
  { key: 'analysis', label: 'Analysis' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'actions', label: 'Actions' },
  { key: 'similar-cases', label: 'Similar Cases' },
]

const SUB_TABS: readonly { key: AnalysisSubTab; label: string }[] = [
  { key: 'findings', label: 'Findings' },
  { key: 'root-causes', label: 'Root Causes' },
  { key: 'comparisons', label: 'Comparisons' },
  { key: 'recommendations', label: 'Recommendations' },
]

/** Multi-axis Vibration Trend line chart */
function VibrationMultiTrendChart({
  points,
  hoverIndex,
  onHover,
}: {
  points: readonly VibrationTrendPoint[]
  hoverIndex: number | null
  onHover: (idx: number | null) => void
}) {
  const width = 620
  const height = 120
  const padLeft = 36
  const padRight = 16
  const padTop = 10
  const padBottom = 20

  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom

  // Y-axis range: 0.0 to 4.0 mm/s
  const minY = 0
  const maxY = 4.0

  const toX = (idx: number) => padLeft + (idx / (points.length - 1)) * chartW
  const toY = (val: number) => padTop + chartH - ((val - minY) / (maxY - minY)) * chartH

  // Build line path
  const makePath = (accessor: (p: VibrationTrendPoint) => number) => {
    let d = `M ${toX(0)} ${toY(accessor(points[0]))}`
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      const x1 = toX(i)
      const y1 = toY(accessor(p1))
      const x2 = toX(i + 1)
      const y2 = toY(accessor(p2))
      const midX = (x1 + x2) / 2
      d += ` C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
    }
    return d
  }

  const pathH = makePath(p => p.h)
  const pathV = makePath(p => p.v)
  const pathA = makePath(p => p.a)

  const activeIdx = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < points.length ? hoverIndex : 5
  const activePoint = points[activeIdx]

  return (
    <div className={css.chartContainer} onMouseLeave={() => onHover(5)}>
      {/* Tooltip Overlay */}
      {activePoint && (
        <div
          className={css.chartTooltip}
          style={{
            left: `${(toX(activeIdx) / width) * 100}%`,
            top: `${(toY(activePoint.h) / height) * 100 - 35}%`,
          }}
        >
          <div className={css.tooltipDate}>{activePoint.fullDate}</div>
          <div className={css.tooltipRow}>
            <span className={`${css.tooltipDot} ${css.dotBlue}`} aria-hidden="true" />
            <span className={css.tooltipLabel}>H:</span>
            <span className={css.tooltipVal}>{activePoint.h.toFixed(1)} mm/s</span>
          </div>
          <div className={css.tooltipRow}>
            <span className={`${css.tooltipDot} ${css.dotPurple}`} aria-hidden="true" />
            <span className={css.tooltipLabel}>V:</span>
            <span className={css.tooltipVal}>{activePoint.v.toFixed(1)} mm/s</span>
          </div>
          <div className={css.tooltipRow}>
            <span className={`${css.tooltipDot} ${css.dotGreen}`} aria-hidden="true" />
            <span className={css.tooltipLabel}>A:</span>
            <span className={css.tooltipVal}>{activePoint.a.toFixed(1)} mm/s</span>
          </div>
        </div>
      )}

      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className={css.trendSvg}>
        {/* Y Axis Grid and Labels */}
        {[0, 0.8, 1.6, 2.5, 3.5, 4.0].map((yVal) => {
          const y = toY(yVal)
          return (
            <g key={yVal}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="currentColor"
                className={css.gridLine}
              />
              <text
                x={padLeft - 8}
                y={y + 3}
                textAnchor="end"
                className={css.axisLabel}
              >
                {yVal.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* X Axis Labels */}
        {points.map((p, idx) => {
          if (!p.dateLabel) return null
          const x = toX(idx)
          return (
            <text
              key={p.dateLabel + idx}
              x={x}
              y={height - 5}
              textAnchor="middle"
              className={css.axisLabel}
            >
              {p.dateLabel}
            </text>
          )
        })}

        {/* Active Vertical Guideline */}
        {activePoint && (
          <line
            x1={toX(activeIdx)}
            y1={padTop}
            x2={toX(activeIdx)}
            y2={padTop + chartH}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {/* 3 Trend Lines */}
        <path d={pathH} fill="none" className={css.strokeH} strokeWidth="2" strokeLinecap="round" />
        <path d={pathV} fill="none" className={css.strokeV} strokeWidth="2" strokeLinecap="round" />
        <path d={pathA} fill="none" className={css.strokeA} strokeWidth="2" strokeLinecap="round" />

        {/* Points for H, V, A */}
        {points.map((p, idx) => {
          const x = toX(idx)
          const isAct = idx === activeIdx
          return (
            <g key={idx} onMouseEnter={() => onHover(idx)}>
              <circle
                cx={x}
                cy={toY(p.h)}
                r={isAct ? 4.5 : 2.5}
                className={css.pointH}
                stroke="#ffffff"
                strokeWidth={isAct ? 2 : 1}
              />
              <circle
                cx={x}
                cy={toY(p.v)}
                r={isAct ? 4 : 2}
                className={css.pointV}
                stroke="#ffffff"
                strokeWidth={isAct ? 2 : 1}
              />
              <circle
                cx={x}
                cy={toY(p.a)}
                r={isAct ? 4 : 2}
                className={css.pointA}
                stroke="#ffffff"
                strokeWidth={isAct ? 2 : 1}
              />
              {/* Invisible wide hit area for hover */}
              <rect
                x={x - chartW / (points.length * 2)}
                y={padTop}
                width={chartW / points.length}
                height={chartH}
                fill="transparent"
                style={{ cursor: 'pointer' }}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function AnalysisWorkspace({
  data,
  onRerun,
  onAgentChange,
  onTabChange,
  onSubTabChange,
}: AnalysisWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<InvestigationAnalysisWorkspaceTab>(data.activeWorkspaceTab)
  const [activeSubTab, setActiveSubTab] = useState<AnalysisSubTab>(data.aiResponse.activeSubTab)
  const [agentPreset, setAgentPreset] = useState(data.activeAgentPreset)
  const [trendRange, setTrendRange] = useState<'7D' | '30D' | '90D'>('7D')
  const [hoverIndex, setHoverIndex] = useState<number | null>(data.aiResponse.vibrationTrend.defaultTooltipIndex)

  const handleTabClick = (tab: InvestigationAnalysisWorkspaceTab) => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }

  const handleSubTabClick = (subTab: AnalysisSubTab) => {
    setActiveSubTab(subTab)
    onSubTabChange?.(subTab)
  }

  const handleAgentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setAgentPreset(val)
    onAgentChange?.(val)
  }

  return (
    <div className={css.workspaceRoot} role="region" aria-label="Investigation analysis workspace">
      {/* 1. Main Workspace Tabs & Agent Bar */}
      <div className={css.topTabBar}>
        <nav className={css.tabsNav} aria-label="Investigation workspace tabs">
          <ul className={css.tabsList} role="tablist">
            {WORKSPACE_TABS.map((tab) => {
              const isActive = tab.key === activeTab
              return (
                <li key={tab.key} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    id={`ws-tab-${tab.key}`}
                    aria-selected={isActive}
                    className={`${css.tabBtn} ${isActive ? css.tabActive : ''}`}
                    onClick={() => handleTabClick(tab.key)}
                  >
                    {tab.label}
                    {isActive && <span className={css.tabActiveIndicator} aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Right Controls: Agent Preset dropdown & Rerun */}
        <div className={css.topRightControls}>
          <div className={css.agentSelectWrapper}>
            <span className={css.agentPrefix}>Agent:</span>
            <select
              className={css.agentSelect}
              value={agentPreset}
              onChange={handleAgentSelect}
              aria-label="Agent preset selection"
            >
              <option value="Standard">Standard</option>
              <option value="PTC">PTC</option>
              <option value="Minimal">Minimal</option>
              <option value="Creator">Creator</option>
            </select>
            <IconChevronDownOutline14 size={10} className={css.selectChevron} aria-hidden="true" />
          </div>

          <button
            type="button"
            className={css.rerunBtn}
            onClick={onRerun}
            aria-label="Rerun analysis"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Rerun</span>
          </button>
        </div>
      </div>

      {/* 2. Central Analysis Conversation Card */}
      <div className={css.conversationCard}>
        {/* User Request Block */}
        <div className={css.userRequestBlock}>
          <div className={css.messageHeader}>
            <span className={css.userAvatarSlot} aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span className={css.senderName}>{data.userRequest.sender}</span>
            <time className={css.timestampText}>{data.userRequest.timeAgo}</time>
          </div>
          <p className={css.requestText}>{data.userRequest.text}</p>
        </div>

        {/* Hyperion AI Response Block */}
        <div className={css.aiResponseBlock}>
          <div className={css.messageHeader}>
            <span className={css.hyperionAvatarSlot} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5a1 1 0 0 1-2 0V11a1 1 0 0 1 2 0zm-1-7.5a1.25 1.25 0 1 1 1.25-1.25A1.25 1.25 0 0 1 12 9z" />
              </svg>
            </span>
            <span className={css.senderName}>{data.aiResponse.sender}</span>
            <time className={css.timestampText}>{data.aiResponse.timeAgo}</time>
            <span className={css.statusBadgeComplete}>
              <span className={css.statusCheckIcon} aria-hidden="true">✔</span>
              <span>{data.aiResponse.statusText}</span>
            </span>
          </div>

          <p className={css.aiResponseIntro}>{data.aiResponse.text}</p>

          {/* Sub-Tabs: Findings / Root Causes / Comparisons / Recommendations */}
          <nav className={css.subTabsBar} aria-label="Analysis dimension tabs">
            <ul className={css.subTabsList} role="tablist">
              {SUB_TABS.map((st) => {
                const isActive = st.key === activeSubTab
                return (
                  <li key={st.key} role="presentation">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`${css.subTabBtn} ${isActive ? css.subTabActive : ''}`}
                      onClick={() => handleSubTabClick(st.key)}
                    >
                      {st.label}
                      {isActive && <span className={css.subTabActiveBar} aria-hidden="true" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Key Findings Highlight Card */}
          <div className={css.keyFindingsCard}>
            <div className={css.keyFindingsHeader}>
              <span className={css.shieldIconSlot} aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <h3 className={css.keyFindingsTitle}>Key Findings</h3>
            </div>

            <ul className={css.findingsBullets}>
              {data.aiResponse.keyFindings.map((finding, idx) => (
                <li key={idx} className={css.findingItem}>
                  <span className={css.bulletDot} aria-hidden="true">•</span>
                  <span className={css.findingText}>{finding}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Vibration Trend Line Chart Card */}
          <div className={css.vibrationTrendCard}>
            <div className={css.vibrationHeader}>
              <h3 className={css.vibrationTitle}>Vibration Trend</h3>

              {/* Legend */}
              <div className={css.chartLegend}>
                <span className={css.legendItem}>
                  <span className={`${css.legendDot} ${css.dotBlue}`} aria-hidden="true" />
                  <span>Horizontal (H)</span>
                </span>
                <span className={css.legendItem}>
                  <span className={`${css.legendDot} ${css.dotPurple}`} aria-hidden="true" />
                  <span>Vertical (V)</span>
                </span>
                <span className={css.legendItem}>
                  <span className={`${css.legendDot} ${css.dotGreen}`} aria-hidden="true" />
                  <span>Axial (A)</span>
                </span>
              </div>

              {/* Time Range Pills: 7D / 30D / 90D */}
              <div className={css.timeRangePills} role="group" aria-label="Vibration chart time range">
                {(['7D', '30D', '90D'] as const).map(range => (
                  <button
                    key={range}
                    type="button"
                    className={`${css.rangePillBtn} ${trendRange === range ? css.rangePillActive : ''}`}
                    onClick={() => setTrendRange(range)}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className={css.chartYAxisLabel} aria-hidden="true">
              Vibration (mm/s)
            </div>

            <VibrationMultiTrendChart
              points={data.aiResponse.vibrationTrend.points}
              hoverIndex={hoverIndex}
              onHover={setHoverIndex}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
