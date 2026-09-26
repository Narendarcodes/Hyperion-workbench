import { useState } from 'react'
import {
  Button,
  IconSearchOutline16,
  IconSettingsOutline16,
  Tag,
} from '@deepseek-ai/dsh-client-ui-primitives'
import {
  FIXTURE_REPORTS,
  FIXTURE_RELATED_ITEMS,
  ReportSummary,
} from './mockData.ts'
import css from './ReportsOverview.module.css'

export interface ReportsOverviewProps {
  readonly localState?: 'available' | 'unavailable' | undefined
}

export function ReportsOverview(_props: ReportsOverviewProps) {
  const [activeTab, setActiveTab] = useState('All')
  const [selectedReport, setSelectedReport] = useState<ReportSummary | null>(
    FIXTURE_REPORTS[0] ?? null,
  )
  const [previewTab, setPreviewTab] = useState('Preview')
  const [searchQuery, setSearchQuery] = useState('')

  const renderIcon = (type: string) => {
    switch (type) {
      case 'Sparkle':
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
          </svg>
        )
      case 'Clock':
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        )
      case 'Users':
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        )
      case 'Analytics':
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
        )
      case 'Document':
      default:
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'green'
      case 'In Review':
        return 'orange'
      case 'Draft':
        return 'neutral'
      case 'Rejected':
        return 'red'
      default:
        return 'neutral'
    }
  }

  return (
    <div
      className={css.root}
      data-hide-composer=""
      role="region"
      aria-label="Reports Overview"
    >
      {/* BACKGROUND ILLUSTRATION */}
      <div className={css.backgroundIllustration} aria-hidden="true" />

      {/* HEADER */}
      <header className={css.header}>
        <div className={css.headerLeft}>
          <div className={css.breadcrumb}>Reports / All Reports</div>
          <h1 className={css.title}>Reports</h1>
          <div className={css.subtitle}>
            Engineering reports, analysis summaries and AI-generated
            deliverables
            <br />• MRPL Refinery
          </div>
        </div>
        <div className={css.headerRight}>
          <div className={css.searchBox}>
            <IconSearchOutline16 className={css.searchIcon} />
            <input
              type="text"
              placeholder="Search reports, investigations, equipment..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={css.searchInput}
            />
          </div>
          <Button variant="outline" className={css.filterBtn}>
            <IconSettingsOutline16 /> Filter
          </Button>
          <Button variant="primary" className={css.generateBtn}>
            + Generate Report
          </Button>
        </div>
      </header>

      {/* SUMMARY CARDS */}
      <div className={css.summaryCardsRow}>
        {[
          { icon: 'Document', label: 'Total Reports', value: '98' },
          { icon: 'Sparkle', label: 'AI Generated', value: '56' },
          { icon: 'Document', label: 'Manual Reports', value: '42' },
          { icon: 'Clock', label: 'Pending Review', value: '6' },
          { icon: 'Users', label: 'Shared Reports', value: '18' },
          { icon: 'Analytics', label: 'This Month', value: '14' },
        ].map((card, idx) => (
          <div key={idx} className={css.summaryCard}>
            <div className={css.cardIconBox}>{renderIcon(card.icon)}</div>
            <div className={css.cardContent}>
              <div className={css.cardLabel}>{card.label}</div>
              <div className={css.cardValue}>{card.value}</div>
            </div>
            <div className={css.cardChevron}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN WORKSPACE */}
      <div className={css.mainWorkspace}>
        {/* LEFT: REPORT LIBRARY */}
        <div className={css.libraryPanel}>
          <div className={css.panelHeader}>
            <h2>Report Library</h2>
            <div className={css.toggleGroup}>
              <button className={css.toggleBtnActive} aria-label="List view">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </button>
              <button className={css.toggleBtn} aria-label="Grid view">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </button>
            </div>
          </div>
          <div className={css.libraryTabs}>
            {[
              'All (98)',
              'Investigation Reports (42)',
              'Analysis Reports (18)',
              'Compliance (12)',
            ].map(tab => (
              <button
                key={tab}
                className={clsx(
                  css.libTab,
                  activeTab === tab.split(' ')[0] && css.libTabActive,
                )}
                onClick={() => setActiveTab(tab.split(' ')[0] ?? '')}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className={css.librarySearchRow}>
            <input
              type="text"
              placeholder="Search reports..."
              className={css.libSearchInput}
            />
          </div>
          <div className={css.libraryFilterRow}>
            {['Report Type', 'Unit', 'Equipment', 'Date Range'].map(f => (
              <span key={f} className={css.libFilterPill}>
                {f}{' '}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            ))}
          </div>

          <div className={css.reportList}>
            {FIXTURE_REPORTS.map(report => (
              <div
                key={report.id}
                className={clsx(
                  css.reportRow,
                  selectedReport?.id === report.id && css.reportRowSelected,
                )}
                onClick={() => setSelectedReport(report)}
              >
                <div className={css.rowIcon}>{renderIcon('Document')}</div>
                <div className={css.rowMain}>
                  <div className={css.rowTitle}>{report.title}</div>
                  <div className={css.rowContext}>
                    <Tag tone="neutral" className={css.rowBadge}>
                      {report.type}
                    </Tag>
                    <span className={css.rowUnit}>
                      {report.unit !== '-' ? report.unit : ''}{' '}
                      {report.equipment !== '-' ? report.equipment : ''}
                    </span>
                  </div>
                </div>
                <div className={css.rowMeta}>
                  <div className={css.rowDate}>{report.date}</div>
                  <Tag
                    tone={getStatusColor(report.status) as unknown as 'green' | 'blue' | 'red' | 'neutral' | 'orange' | 'purple' | undefined}
                    className={css.rowStatusBadge}
                  >
                    {report.status}
                  </Tag>
                </div>
                <button className={css.rowMenuBtn}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: REPORT VIEWER */}
        <div className={css.viewerPanel}>
          {selectedReport ? (
            <>
              <div className={css.viewerHeader}>
                <div className={css.viewerHeaderMain}>
                  <h2 className={css.viewerTitle}>
                    {selectedReport.title} -{' '}
                    {selectedReport.equipment !== '-'
                      ? selectedReport.equipment
                      : selectedReport.unit}
                  </h2>
                  <Tag tone={getStatusColor(selectedReport.status) as unknown as 'green' | 'blue' | 'red' | 'neutral' | 'orange' | 'purple' | undefined}>
                    {selectedReport.status}
                  </Tag>
                </div>
                <div className={css.viewerMetaRow}>
                  <span>
                    {selectedReport.unit !== '-'
                      ? selectedReport.unit
                      : 'MRPL Refinery'}
                  </span>
                  {selectedReport.equipment !== '-' && (
                    <span> • {selectedReport.equipment}</span>
                  )}
                  <span> • Generated on {selectedReport.date}</span>
                  <span> • 12 pages</span>
                </div>
                <div className={css.viewerActions}>
                  <Button variant="ghost">Share</Button>
                  <Button variant="ghost">Download</Button>
                  <Button variant="ghost" className={css.iconOnlyBtn}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="19" cy="12" r="1"></circle>
                      <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                  </Button>
                </div>
              </div>

              <div className={css.viewerTabs}>
                {[
                  'Preview',
                  'Summary',
                  'Key Findings',
                  'Recommendations',
                  'Evidence',
                  'Versions',
                ].map(tab => (
                  <button
                    key={tab}
                    className={clsx(
                      css.viewerTab,
                      previewTab === tab && css.viewerTabActive,
                    )}
                    onClick={() => setPreviewTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className={css.viewerContent}>
                {previewTab === 'Preview' && (
                  <div className={css.reportDocument}>
                    <div className={css.docHeader}>
                      <div className={css.docBrand}>
                        HYPERION
                        <br />
                        <span>Industrial Engineering Workbench</span>
                      </div>
                      <div className={css.docConfidential}>
                        CONFIDENTIAL
                        <br />
                        <span>For Internal Use Only</span>
                      </div>
                    </div>

                    <h1 className={css.docTitle}>
                      {selectedReport.title}
                      <br />
                      <span>
                        {selectedReport.equipment !== '-'
                          ? selectedReport.equipment
                          : selectedReport.unit}{' '}
                        – Crude Feed Pump
                      </span>
                    </h1>

                    <div className={css.docMetaGrid}>
                      <div>
                        <strong>MRPL Refinery</strong>
                        <br />
                        {selectedReport.unit}
                        <br />
                        {selectedReport.equipment !== '-'
                          ? selectedReport.equipment
                          : ''}
                      </div>
                      <div>
                        <strong>Report Type</strong>
                        <br />
                        {selectedReport.type}
                        <br />
                        <br />
                        <strong>Generated By</strong>
                        <br />
                        Hyperion AI
                      </div>
                      <div>
                        <strong>Generated On</strong>
                        <br />
                        {selectedReport.date}
                        <br />
                        <br />
                        <strong>Report ID</strong>
                        <br />
                        {selectedReport.id}
                        <br />
                        <br />
                        <strong>Version</strong>
                        <br />
                        1.0
                      </div>
                    </div>

                    <div className={css.docDivider} />

                    <div className={css.docSection}>
                      <h2>1. Executive Summary</h2>
                      <p>
                        This report details the findings of the recent vibration
                        analysis conducted on{' '}
                        {selectedReport.equipment !== '-'
                          ? selectedReport.equipment
                          : selectedReport.unit}
                        . The analysis indicates abnormal vibration levels on
                        the outboard bearing housing. Prompt attention is
                        recommended to prevent potential failure.
                      </p>

                      <div className={css.metricCards}>
                        <div className={css.metricCard}>
                          <div className={css.metricValue}>2.1 mm/s</div>
                          <div className={css.metricLabel}>Current RMS</div>
                        </div>
                        <div className={css.metricCard}>
                          <div className={css.metricValue}>2.3 mm/s</div>
                          <div className={css.metricLabel}>Peak (Radial H)</div>
                        </div>
                        <div className={css.metricCard}>
                          <div className={css.metricValue}>48.5 Hz</div>
                          <div className={css.metricLabel}>
                            Dominant Frequency
                          </div>
                        </div>
                        <div className={css.metricCard}>
                          <div className={css.metricValueHigh}>High</div>
                          <div className={css.metricLabel}>Severity Level</div>
                        </div>
                      </div>
                    </div>

                    {/* Placeholder for report image */}
                    <div className={css.docImagePlaceholder}>
                      [ Pump Equipment Image ]
                    </div>
                  </div>
                )}
                {previewTab !== 'Preview' && (
                  <div className={css.tabPlaceholder}>
                    Select the Preview tab to view the document.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={css.noSelection}>
              Select a report to view details
            </div>
          )}
        </div>

        {/* RIGHT: ACTIONS & DETAILS */}
        <div className={css.detailsPanel}>
          <div className={css.detailsSection}>
            <h3>Report Actions</h3>
            <div className={css.actionList}>
              <Button variant="primary" className={css.actionBtnFull}>
                Download PDF
              </Button>
              <Button variant="outline" className={css.actionBtnFull}>
                Share Report
              </Button>
              <Button variant="outline" className={css.actionBtnFull}>
                Create Follow-up Investigation
              </Button>
              <Button variant="outline" className={css.actionBtnFull}>
                Export to Word
              </Button>
              <Button variant="outline" className={css.actionBtnFull}>
                Export Data (CSV)
              </Button>
              <Button variant="outline" className={css.actionBtnFull}>
                Set as Template
              </Button>
            </div>
          </div>

          {selectedReport && (
            <div className={css.detailsSection}>
              <h3>Report Information</h3>
              <dl className={css.infoGrid}>
                <dt>Report ID</dt>
                <dd>{selectedReport.id}</dd>
                <dt>Type</dt>
                <dd>{selectedReport.type}</dd>
                <dt>Unit</dt>
                <dd>{selectedReport.unit}</dd>
                <dt>Equipment</dt>
                <dd>{selectedReport.equipment}</dd>
                <dt>Generated On</dt>
                <dd>{selectedReport.date}, 10:30</dd>
                <dt>Generated By</dt>
                <dd>Hyperion AI</dd>
                <dt>Version</dt>
                <dd>1.0</dd>
                <dt>Pages</dt>
                <dd>12</dd>
                <dt>File Size</dt>
                <dd>4.8 MB</dd>
                <dt>Status</dt>
                <dd>{selectedReport.status}</dd>
              </dl>
            </div>
          )}

          <div className={css.detailsSection}>
            <div className={css.relatedHeader}>
              <h3>Related Items</h3>
              <a href="#" className={css.viewAllLink}>
                View all &rarr;
              </a>
            </div>
            <div className={css.relatedList}>
              {FIXTURE_RELATED_ITEMS.map(item => (
                <div key={item.id} className={css.relatedItem}>
                  <div className={css.relatedIcon}>
                    {renderIcon('Document')}
                  </div>
                  <div className={css.relatedContent}>
                    <div className={css.relatedTitle}>{item.id}</div>
                    <div className={css.relatedSubtitle}>{item.title}</div>
                  </div>
                  <Tag tone="neutral" className={css.relatedBadge}>
                    {item.type}
                  </Tag>
                  <div className={css.relatedChevron}>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function clsx(...args: unknown[]) {
  return args.filter(Boolean).join(' ')
}
