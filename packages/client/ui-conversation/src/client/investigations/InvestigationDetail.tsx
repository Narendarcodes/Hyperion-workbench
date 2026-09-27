/**
 * InvestigationDetail: Center panel displaying the selected investigation workspace,
 * including summary notes, 6-card metadata grid, Key Metrics telemetry chart,
 * and Recent Evidence documents list.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/InvestigationDetail
 */

import { useState } from 'react'
import {
  IconChevronDownOutline14,
  IconEllipsisOutline16,
  IconShareOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  InvestigationDetailTab,
  InvestigationEvidence,
  SelectedInvestigation,
} from './types.ts'
import css from './InvestigationDetail.module.css'

export interface InvestigationDetailProps {
  readonly investigation: SelectedInvestigation
  readonly onOpenStatus?: () => void
  readonly onEditSummary?: () => void
  readonly onTabChange?: (tab: InvestigationDetailTab) => void
  readonly onOpenEvidence?: (item: InvestigationEvidence) => void
  readonly onViewAllEvidence?: () => void
}

const DETAIL_TABS: readonly { readonly key: InvestigationDetailTab; readonly label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'actions', label: 'Actions' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'related', label: 'Related' },
  { key: 'report', label: 'Report' },
]

/** Vibration Trend SVG Chart with threshold reference line and gradient */
function TelemetryLineChart({ data }: { data: readonly number[] }) {
  const width = 200
  const height = 48
  const paddingY = 6

  const min = 0.4
  const max = 2.4
  const range = max - min

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width
    const y = height - paddingY - ((val - min) / range) * (height - paddingY * 2)
    return [x, y] as const
  })

  // Smooth curve string
  let linePath = `M ${points[0]?.[0]} ${points[0]?.[1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i] as readonly [number, number]
    const next = points[i + 1] as readonly [number, number]
    const midX = (curr[0] + next[0]) / 2
    linePath += ` C ${midX} ${curr[1]}, ${midX} ${next[1]}, ${next[0]} ${next[1]}`
  }

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`

  // Threshold line at 1.5 mm/s
  const thresholdY = height - paddingY - ((1.5 - min) / range) * (height - paddingY * 2)

  return (
    <div className={css.chartWrapper} aria-hidden="true">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={css.chartSvg}>
        <defs>
          <linearGradient id="vibe-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Dashed threshold line */}
        <line
          x1="0"
          y1={thresholdY}
          x2={width}
          y2={thresholdY}
          stroke="#fca5a5"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Area fill */}
        <path d={areaPath} fill="url(#vibe-grad)" />

        {/* Main trend line */}
        <path
          d={linePath}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current point indicator */}
        {points[points.length - 1] && (
          <circle
            cx={points[points.length - 1]?.[0]}
            cy={points[points.length - 1]?.[1]}
            r="3"
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        )}
      </svg>
    </div>
  )
}

function FileTypeIcon({ type }: { type: InvestigationEvidence['fileType'] }) {
  if (type === 'pdf') {
    return (
      <span className={`${css.fileIconBadge} ${css.fileTone_red}`} aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </span>
    )
  }
  if (type === 'xlsx') {
    return (
      <span className={`${css.fileIconBadge} ${css.fileTone_green}`} aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M8 13l3 4M11 13l-3 4M13 15h3" />
        </svg>
      </span>
    )
  }
  // Image/photo
  return (
    <span className={`${css.fileIconBadge} ${css.fileTone_blue}`} aria-hidden="true">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </span>
  )
}

export function InvestigationDetail({
  investigation,
  onOpenStatus,
  onEditSummary,
  onTabChange,
  onOpenEvidence,
  onViewAllEvidence,
}: InvestigationDetailProps) {
  const [activeTab, setActiveTab] = useState<InvestigationDetailTab>(investigation.activeTab)
  const [timeRange, setTimeRange] = useState('Last 30 days')

  const handleTabClick = (tab: InvestigationDetailTab) => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }

  const { metadata, keyMetrics, evidenceList } = investigation

  return (
    <article className={css.detailCard} aria-labelledby="inv-heading">
      {/* Header Row */}
      <div className={css.headerTop}>
        <div className={css.titleStack}>
          <div className={css.metaBadgesRow}>
            <span className={css.codeBadge}>{investigation.code}</span>
            <span className={css.severityBadge}>
              <span className={css.sevDot} aria-hidden="true" />
              <span>High</span>
            </span>
          </div>

          <h2 id="inv-heading" className={css.mainTitle}>{investigation.title}</h2>
          <p className={css.subtitleText}>{investigation.subtitle}</p>
        </div>

        <div className={css.actionsGroup}>
          <button
            type="button"
            className={css.openActionBtn}
            onClick={onOpenStatus}
            aria-label="Open investigation status"
          >
            Open
          </button>
          <button
            type="button"
            className={css.moreMenuBtn}
            aria-label="More options"
            title="More options"
          >
            <IconEllipsisOutline16 size={15} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className={css.tabsBar} aria-label="Investigation details tabs">
        <ul className={css.tabsList} role="tablist">
          {DETAIL_TABS.map((tab) => {
            const isActive = tab.key === activeTab
            return (
              <li key={tab.key} role="presentation">
                <button
                  type="button"
                  role="tab"
                  id={`inv-tab-${tab.key}`}
                  aria-selected={isActive}
                  aria-controls={`inv-panel-${tab.key}`}
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

      {/* Main Tab Content */}
      <div
        id={`inv-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`inv-tab-${activeTab}`}
        className={css.tabPanel}
      >
        {activeTab === 'overview' ? (
          <div className={css.overviewContent}>
            {/* 1. Summary Card */}
            <div className={css.summaryCard}>
              <div className={css.summaryHeader}>
                <h3 className={css.sectionHeading}>Summary</h3>
                <button
                  type="button"
                  className={css.editLinkBtn}
                  onClick={onEditSummary}
                  aria-label="Edit summary"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span>Edit</span>
                </button>
              </div>
              <p className={css.summaryBodyText}>{investigation.summary}</p>
            </div>

            {/* 2. Metadata Grid (6 Cards, 2 rows x 3 columns) */}
            <div className={css.metadataGrid}>
              {/* Equipment */}
              <div className={css.metaCard}>
                <span className={`${css.metaIconBadge} ${css.metaTone_blue}`} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="7" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 5v-3M19 12h3M12 19v3M5 12H2" />
                  </svg>
                </span>
                <div className={css.metaTextBlock}>
                  <span className={css.metaLabel}>Equipment</span>
                  <span className={css.metaValueBold}>{metadata.equipmentTag}</span>
                  <span className={css.metaSubtext}>{metadata.equipmentName}</span>
                </div>
              </div>

              {/* Unit */}
              <div className={css.metaCard}>
                <span className={`${css.metaIconBadge} ${css.metaTone_cyan}`} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 20h20M4 20V8l6-3v15M10 20V12l6 3v5M16 20v-8l4 2v6" />
                  </svg>
                </span>
                <div className={css.metaTextBlock}>
                  <span className={css.metaLabel}>Unit</span>
                  <span className={css.metaValueBold}>{metadata.unitCode}</span>
                  <span className={css.metaSubtext}>{metadata.unitName}</span>
                </div>
              </div>

              {/* Service */}
              <div className={css.metaCard}>
                <span className={`${css.metaIconBadge} ${css.metaTone_amber}`} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                </span>
                <div className={css.metaTextBlock}>
                  <span className={css.metaLabel}>Service</span>
                  <span className={css.metaValueBold}>{metadata.service}</span>
                </div>
              </div>

              {/* Status */}
              <div className={css.metaCard}>
                <span className={`${css.metaIconBadge} ${css.metaTone_red}`} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
                <div className={css.metaTextBlock}>
                  <span className={css.metaLabel}>Status</span>
                  <span className={css.metaValueBold}>{metadata.status}</span>
                  <span className={css.metaSubtext}>{metadata.statusSubtext}</span>
                </div>
              </div>

              {/* Created */}
              <div className={css.metaCard}>
                <span className={`${css.metaIconBadge} ${css.metaTone_purple}`} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <div className={css.metaTextBlock}>
                  <span className={css.metaLabel}>Created</span>
                  <span className={css.metaValueBold}>{metadata.createdDate}</span>
                  <span className={css.metaSubtext}>{metadata.createdTimeAgo}</span>
                </div>
              </div>

              {/* Last Worker */}
              <div className={css.metaCard}>
                <span className={`${css.metaAvatarBadge}`} aria-hidden="true">
                  {metadata.leadEngineerInitial}
                </span>
                <div className={css.metaTextBlock}>
                  <span className={css.metaLabel}>Last Worker</span>
                  <span className={css.metaValueBold}>{metadata.leadEngineer}</span>
                </div>
              </div>
            </div>

            {/* 3. Lower Split: Key Metrics & Recent Evidence */}
            <div className={css.lowerRowSplit}>
              {/* Key Metrics */}
              <div className={css.subPanelCard}>
                <div className={css.subPanelHeader}>
                  <h4 className={css.subPanelTitle}>Key Metrics</h4>
                  <button
                    type="button"
                    className={css.timeRangeBtn}
                    onClick={() => {
                      setTimeRange(prev => prev.includes('30') ? 'Last 7 days' : 'Last 30 days')
                    }}
                    aria-label={`Time range: ${timeRange}`}
                  >
                    <span>{timeRange}</span>
                    <IconChevronDownOutline14 size={11} className={css.dropdownChevron} />
                  </button>
                </div>

                <div className={css.metricValueHeadingRow}>
                  <span className={css.metricDotIndicator} aria-hidden="true" />
                  <span className={css.metricNameLabel}>{keyMetrics.name}</span>
                  <span className={css.metricNumberBig}>{keyMetrics.value}</span>
                </div>

                <TelemetryLineChart data={keyMetrics.chartData} />

                <div className={css.metricsStatsList}>
                  <div className={css.statLine}>
                    <span className={css.statLabel}>Normal Range</span>
                    <span className={css.statValue}>{keyMetrics.normalRange}</span>
                  </div>
                  <div className={css.statLine}>
                    <span className={css.statLabel}>Current Value</span>
                    <span className={css.statValueBold}>{keyMetrics.currentValue}</span>
                  </div>
                  <div className={css.statLine}>
                    <span className={css.statLabel}>Threshold</span>
                    <span className={css.statValue}>{keyMetrics.threshold}</span>
                  </div>
                  <div className={css.statLine}>
                    <span className={css.statLabel}>Trend</span>
                    <span className={css.statValueTrend}>
                      <span aria-hidden="true">↗</span> {keyMetrics.trend}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Evidence */}
              <div className={css.subPanelCard}>
                <div className={css.subPanelHeader}>
                  <h4 className={css.subPanelTitle}>Recent Evidence</h4>
                  <button
                    type="button"
                    className={css.viewAllEvidenceBtn}
                    onClick={onViewAllEvidence}
                    aria-label="View all evidence"
                  >
                    <span>View all</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>

                <ul className={css.evidenceList} role="list">
                  {evidenceList.map(item => (
                    <li key={item.id} className={css.evidenceItemRow}>
                      <button
                        type="button"
                        className={css.evidenceNameBtn}
                        onClick={() => onOpenEvidence?.(item)}
                      >
                        <FileTypeIcon type={item.fileType} />
                        <div className={css.evidenceFileDetails}>
                          <span className={css.evidenceFileName}>{item.name}</span>
                          <span className={css.evidenceFileDesc}>{item.description}</span>
                        </div>
                      </button>

                      <div className={css.evidenceActionIcons}>
                        <button
                          type="button"
                          className={css.evidenceIconBtn}
                          onClick={() => onOpenEvidence?.(item)}
                          aria-label={`Open ${item.name}`}
                          title="Open external"
                        >
                          <IconShareOutline16 size={13} />
                        </button>
                        <button
                          type="button"
                          className={css.evidenceIconBtn}
                          aria-label={`Options for ${item.name}`}
                          title="Options"
                        >
                          <IconEllipsisOutline16 size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className={css.emptyTabContainer}>
            <p className={css.emptyTabText}>
              Detailed engineering data for <strong>{DETAIL_TABS.find(t => t.key === activeTab)?.label}</strong> will appear here.
            </p>
          </div>
        )}
      </div>
    </article>
  )
}
