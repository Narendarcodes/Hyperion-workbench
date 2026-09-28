import {
  FIXTURE_REPORTS,
  FIXTURE_SUMMARY_CARDS,
  FIXTURE_RELATED_ITEMS,
} from './mockData.ts'
import { GENERATED_DELIVERABLES } from './deliverables.ts'
import { pumpBase64 } from './pumpImage.ts'
import css from './ReportsOverview.module.css'

export interface ReportsOverviewProps {
  readonly localState?: 'available' | 'unavailable' | undefined
}

function join(...args: unknown[]) {
  return args.filter(Boolean).join(' ')
}

export function ReportsOverview(_props: ReportsOverviewProps) {
  return (
    <div className={css.root} data-hide-composer="" role="region">
      <div className={css.watermarkBg} />
      {/* HEADER */}
      <header className={css.header}>
        <div className={css.headerLeft}>
          <div className={css.breadcrumb}>Reports / All Reports</div>
          <h1 className={css.title}>
            Reports <span className={css.demoBadge} title="Illustrative generated records, not refinery documents">Demo dataset</span>
          </h1>
          <div className={css.subtitle}>
            Engineering reports, analysis summaries and AI-generated
            deliverables • MRPL Refinery
          </div>
        </div>
        <div className={css.headerRight}>
          <div className={css.searchBox}>
            <svg
              className={css.searchIcon}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search reports, investigations, equipment..."
              aria-label="Search reports, investigations, equipment"
              className={css.searchInput}
            />
          </div>
          <button className={css.filterBtn}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="21" x2="4" y2="14"></line>
              <line x1="4" y1="10" x2="4" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12" y2="3"></line>
              <line x1="20" y1="21" x2="20" y2="16"></line>
              <line x1="20" y1="12" x2="20" y2="3"></line>
              <line x1="1" y1="14" x2="7" y2="14"></line>
              <line x1="9" y1="8" x2="15" y2="8"></line>
              <line x1="17" y1="16" x2="23" y2="16"></line>
            </svg>
            Filter
          </button>
          <button className={css.generateBtn}>+ Generate Report</button>
        </div>
      </header>

      {/* GENERATED DELIVERABLES — real files derived from corpus DOC-010 */}
      <section className={css.deliverablesStrip} aria-label="Generated deliverables">
        <div className={css.deliverablesHeader}>
          <h2 className={css.deliverablesTitle}>Generated deliverables</h2>
          <span className={css.deliverablesProvenance}>
            Hyperion-generated from corpus DOC-010 (MRPL MG 91 spec) — not original MRPL records
          </span>
        </div>
        <div className={css.deliverablesGrid}>
          {GENERATED_DELIVERABLES.map(item => (
            <div key={item.id} className={css.deliverableCard}>
              <span className={css.formatBadge} data-format={item.format}>
                {item.format}
              </span>
              <div className={css.deliverableBody}>
                <div className={css.deliverableName}>{item.fileName}</div>
                <div className={css.deliverableMeta}>
                  {item.title} · {item.source} · {item.size}
                </div>
                <div className={css.deliverableClass}>{item.classification}</div>
              </div>
              <div className={css.deliverableActions}>
                <a
                  className={css.deliverableOpen}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.format === 'PDF' ? 'Preview' : 'Open'}
                </a>
                <a
                  className={css.deliverableDownload}
                  href={item.href}
                  download={item.fileName}
                >
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SUMMARY CARDS */}
      <div className={css.summaryCardsRow}>
        {FIXTURE_SUMMARY_CARDS.map(card => (
          <div key={card.id} className={css.summaryCard}>
            <div className={css.cardIconBox} data-color={card.iconColor}>
              {renderIcon(card.icon, 20)}
            </div>
            <div className={css.cardContent}>
              <div className={css.cardLabel}>{card.label}</div>
              <div className={css.cardValue}>{card.value}</div>
            </div>
            <div className={css.cardChevron}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#a0aec0"
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
            <span className={css.demoCaption}>Demo records — illustrative layout</span>
            <div className={css.toggleGroup}>
              <button className={css.toggleBtnActive} aria-label="Grid view">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
              <button className={css.toggleBtn} aria-label="List view">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className={css.libraryTabs}>
            <button className={join(css.libTab, css.libTabActive)}>
              All (98)
            </button>
            <button className={css.libTab}>Investigation Reports (42)</button>
            <button className={css.libTab}>Analysis Reports (18)</button>
            <button className={css.libTab}>Compliance (12)</button>
          </div>

          <div className={css.librarySearchRow}>
            <div className={css.libSearchBox}>
              <svg
                className={css.libSearchIcon}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search reports..."
                aria-label="Search reports"
                className={css.libSearchInput}
              />
            </div>
          </div>

          <div className={css.libraryFilterRow}>
            <div className={css.filterPills}>
              {['Report Type', 'Unit', 'Equipment', 'Date Range'].map(f => (
                <span key={f} className={css.libFilterPill}>
                  {f}{' '}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              ))}
            </div>
            <button className={css.sortBtn}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="12" x2="14" y2="12"></line>
                <line x1="4" y1="18" x2="8" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className={css.tableWrapper}>
            <div className={css.tableHeader}>
              <span className={css.thTitle}>
                Title
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
              <span>Type</span>
              <span>Unit / Equipment</span>
              <span>Date</span>
              <span>Status</span>
            </div>

            <div className={css.reportList}>
              {FIXTURE_REPORTS.map((report, i) => (
                <div
                  key={report.id}
                  className={join(
                    css.reportRow,
                    i === 0 && css.reportRowSelected,
                  )}
                >
                  <div className={css.rowTitleCol}>
                    <div className={css.rowIcon} data-color={report.iconColor}>
                      {renderIcon('Document', 16)}
                    </div>
                    <div>
                      <div className={css.rowTitleText}>{report.title}</div>
                      <div className={css.rowSubtitleText}>
                        {report.subtitle}
                      </div>
                    </div>
                  </div>
                  <div className={css.rowTypeCol}>
                    <span className={css.typePill} data-type={report.type}>
                      {report.type}
                    </span>
                  </div>
                  <div className={css.rowUnitCol}>
                    <div className={css.rowUnitText}>{report.unit}</div>
                    <div className={css.rowEquipText}>{report.equipment}</div>
                  </div>
                  <div className={css.rowDateCol}>{report.date}</div>
                  <div className={css.rowStatusCol}>
                    <span
                      className={css.statusPill}
                      data-status={report.status}
                    >
                      <span className={css.statusDot} />
                      {report.status}
                    </span>
                  </div>
                  <div className={css.rowMoreCol}>
                    <button className={css.moreBtn}>⋮</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={css.paginationRow}>
            <button className={css.pageBtn}>&lt;</button>
            <button className={join(css.pageBtn, css.pageBtnActive)}>1</button>
            <button className={css.pageBtn}>2</button>
            <button className={css.pageBtn}>3</button>
            <button className={css.pageBtn}>4</button>
            <button className={css.pageBtn}>5</button>
            <span className={css.paginationEllipsis}>...</span>
            <button className={css.pageBtn}>10</button>
            <button className={css.pageBtn}>&gt;</button>

            <div className={css.paginationControls}>
              <span className={css.perPage}>
                10 per page
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
              <span className={css.gotoLabel}>Go to</span>
              <span className={css.gotoInput}>1</span>
            </div>
          </div>
        </div>

        {/* CENTER: REPORT VIEWER */}
        <div className={css.viewerPanel}>
          <div className={css.viewerHeader}>
            <div className={css.viewerHeaderMain}>
              <div className={css.viewerTitleRow}>
                <div className={css.viewerTitleIcon} data-color="purple">
                  {renderIcon('Document', 18)}
                </div>
                <h2 className={css.viewerTitle}>
                  Vibration Analysis Report - P-204
                </h2>
                <span className={css.demoCaption}>Demo preview</span>
                <span className={css.statusPill} data-status="Completed">
                  <span className={css.statusDot} /> Completed
                </span>
              </div>
              <div className={css.viewerSubRow}>
                <span className={css.typePill} data-type="Analysis">
                  Analysis Report
                </span>
              </div>
            </div>
            <div className={css.viewerMetaRow}>
              <span className={css.metaItem}>
                {renderIcon('User', 14)} MRPL Refinery
              </span>
              <span className={css.metaItem}>
                {renderIcon('Building', 14)} CDU-03
              </span>
              <span className={css.metaItem}>
                {renderIcon('Tag', 14)} P-204
              </span>
              <span className={css.metaItem}>Generated on 18 Jan 2024</span>
              <span className={css.metaItem}>
                {renderIcon('Document', 14)} 12 pages
              </span>

              <div className={css.viewerActions}>
                <button className={css.actionLink}>
                  {renderIcon('Share', 14)} Share
                </button>
                <button className={css.actionLink}>
                  {renderIcon('Download', 14)} Download
                </button>
                <button className={css.actionLinkDots}>...</button>
              </div>
            </div>
          </div>

          <div className={css.viewerTabs}>
            <button className={join(css.viewerTab, css.viewerTabActive)}>
              Preview
            </button>
            <button className={css.viewerTab}>Summary</button>
            <button className={css.viewerTab}>Key Findings</button>
            <button className={css.viewerTab}>Recommendations</button>
            <button className={css.viewerTab}>Evidence</button>
            <button className={css.viewerTab}>Versions</button>
          </div>

          <div className={css.viewerContent}>
            <div className={css.reportDocument}>
              <div className={css.docHeader}>
                <div className={css.docBrand}>
                  <div className={css.docBrandLogo}>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div>
                    <div className={css.docBrandName}>HYPERION</div>
                    <div className={css.docBrandSub}>
                      Industrial Engineering Workbench
                    </div>
                  </div>
                </div>
                <div className={css.docConfidential}>
                  <div>CONFIDENTIAL</div>
                  <div className={css.docConfidentialSub}>
                    For Internal Use Only
                  </div>
                </div>
              </div>

              <div className={css.docHero}>
                <div className={css.docHeroText}>
                  <h3 className={css.docReportTitle}>
                    Vibration Analysis Report
                  </h3>
                  <div className={css.docReportSubtitle}>
                    P-204 - Crude Feed Pump
                  </div>

                  <div className={css.docHeroMeta}>
                    <div className={css.heroMetaItem}>
                      {renderIcon('User', 12)} MRPL Refinery
                    </div>
                    <div className={css.heroMetaItem}>
                      {renderIcon('Building', 12)} CDU-03
                    </div>
                    <div className={css.heroMetaItem}>
                      {renderIcon('Tag', 12)} P-204
                    </div>
                  </div>

                  <table className={css.docMetaTable}>
                    <tbody>
                      <tr>
                        <td>Report Type</td>
                        <td>: Vibration Analysis</td>
                      </tr>
                      <tr>
                        <td>Generated On</td>
                        <td>: 18 Jan 2024</td>
                      </tr>
                      <tr>
                        <td>Generated By</td>
                        <td>: Hyperion AI</td>
                      </tr>
                      <tr>
                        <td>Report ID</td>
                        <td>: RPT-2024-001</td>
                      </tr>
                      <tr>
                        <td>Version</td>
                        <td>: 1.0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className={css.docHeroImage}>
                  <img
                    src={pumpBase64}
                    alt="Blue Industrial Pump"
                    className={css.pumpImagePlaceholder}
                  />
                </div>
              </div>

              <div className={css.docBody}>
                <h4>1. Executive Summary</h4>
                <p>
                  This report presents the vibration analysis of P-204 (Crude
                  Feed Pump) based on data collected over the past 7 days. The
                  analysis indicates an increasing vibration trend, with the
                  highest levels observed in the radial direction.
                </p>

                <div className={css.metricsGrid}>
                  <div className={css.metricCard}>
                    <div className={css.metricVal}>2.1 mm/s</div>
                    <div className={css.metricLabel}>Current RMS</div>
                    <div className={css.metricTrend}>
                      <span className={css.trendIconRed}>↗</span>
                      <span className={css.trendTextRed}>
                        +91%
                        <br />
                        vs normal
                      </span>
                    </div>
                  </div>
                  <div className={css.metricCard}>
                    <div className={css.metricVal}>2.3 mm/s</div>
                    <div className={css.metricLabel}>Peak (Radial H)</div>
                  </div>
                  <div className={css.metricCard}>
                    <div className={css.metricVal}>48.5 Hz</div>
                    <div className={css.metricLabel}>Dominant Frequency</div>
                  </div>
                  <div className={css.metricCard}>
                    <div className={css.metricPillRed}>High</div>
                    <div className={css.metricLabel}>Severity Level</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: ACTIONS & DETAILS */}
        <div className={css.detailsPanel}>
          <div className={css.detailsSection}>
            <h3>Report Actions</h3>
            <div className={css.actionList}>
              <button className={css.btnBlue}>
                {renderIcon('Download', 16)} Download PDF
              </button>
              <button className={css.btnOutline}>
                {renderIcon('Share', 16)} Share Report
              </button>
              <button className={css.btnOutline}>
                {renderIcon('CreateFollowUp', 16)} Create Follow-up
                Investigation
              </button>
              <button className={css.btnOutline}>
                {renderIcon('ExportWord', 16)} Export to Word
              </button>
              <button className={css.btnOutline}>
                {renderIcon('Table', 16)} Export Data (CSV)
              </button>
              <button className={css.btnOutline}>
                {renderIcon('Template', 16)} Set as Template
              </button>
            </div>
          </div>

          <div className={css.detailsSection}>
            <h3>Report Information</h3>
            <dl className={css.infoGrid}>
              <dt>Report ID</dt>
              <dd>RPT-2024-001</dd>
              <dt>Type</dt>
              <dd>Analysis Report</dd>
              <dt>Unit</dt>
              <dd>CDU-03</dd>
              <dt>Equipment</dt>
              <dd>P-204</dd>
              <dt>Generated On</dt>
              <dd>18 Jan 2024, 10:30</dd>
              <dt>Generated By</dt>
              <dd>Hyperion AI</dd>
              <dt>Version</dt>
              <dd>1.0</dd>
              <dt>Pages</dt>
              <dd>12</dd>
              <dt>File Size</dt>
              <dd>4.8 MB</dd>
              <dt>Status</dt>
              <dd>
                <span className={css.statusTextGreen}>
                  <span className={css.statusDotSmall} /> Completed
                </span>
              </dd>
            </dl>
          </div>

          <div className={css.detailsSection}>
            <div className={css.relatedHeader}>
              <h3>Related Items</h3>
              <a href="#" className={css.viewAllLink}>
                View all →
              </a>
            </div>
            <div className={css.relatedList}>
              {FIXTURE_RELATED_ITEMS.map(item => (
                <div key={item.id} className={css.relatedItem}>
                  <div className={css.relatedIcon} data-type={item.type}>
                    {item.type === 'Investigation' &&
                      renderIcon('SearchGlass', 16)}
                    {item.type === 'Equipment' && renderIcon('Cube', 16)}
                    {item.type === 'Data' && renderIcon('Analytics', 16)}
                    {item.type === 'Maintenance' && renderIcon('Wrench', 16)}
                  </div>
                  <div className={css.relatedText}>
                    <div className={css.relatedTitle}>{item.id}</div>
                    <div className={css.relatedSub}>{item.title}</div>
                  </div>
                  <div className={css.relatedPill} data-type={item.type}>
                    {item.type}
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

function renderIcon(type: string, size: number) {
  switch (type) {
    case 'Sparkle':
      return (
        <svg
          width={size}
          height={size}
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
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    case 'Users':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'Analytics':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
          <polyline points="4 12 10 6 14 10 20 2" stroke="#38a169" />
        </svg>
      )
    case 'Download':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      )
    case 'Share':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
      )
    case 'Table':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="3" y1="15" x2="21" y2="15"></line>
          <line x1="9" y1="9" x2="9" y2="21"></line>
          <line x1="15" y1="9" x2="15" y2="21"></line>
        </svg>
      )
    case 'Template':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
      )
    case 'User':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      )
    case 'Building':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
          <path d="M9 22v-4h6v4"></path>
          <path d="M8 6h.01"></path>
          <path d="M16 6h.01"></path>
          <path d="M12 6h.01"></path>
          <path d="M12 10h.01"></path>
          <path d="M12 14h.01"></path>
          <path d="M16 10h.01"></path>
          <path d="M16 14h.01"></path>
          <path d="M8 10h.01"></path>
          <path d="M8 14h.01"></path>
        </svg>
      )
    case 'Tag':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
          <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
      )

    case 'CreateFollowUp':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      )
    case 'ExportWord':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <polyline points="9 13 10.5 17 12 14 13.5 17 15 13" />
        </svg>
      )
    case 'SearchGlass':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      )
    case 'Cube':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      )
    case 'Wrench':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
        </svg>
      )
    case 'Document':
    default:
      return (
        <svg
          width={size}
          height={size}
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
