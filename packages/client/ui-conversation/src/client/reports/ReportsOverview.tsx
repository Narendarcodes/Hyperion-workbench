import { FIXTURE_REPORTS, FIXTURE_SUMMARY_CARDS } from './mockData.ts'
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
      {/* HEADER */}
      <header className={css.header}>
        <div className={css.headerLeft}>
          <div className={css.breadcrumb}>Reports / All Reports</div>
          <h1 className={css.title}>Reports</h1>
          <div className={css.subtitle}>
            Engineering reports, analysis summaries and AI-generated deliverables • MRPL Refinery
          </div>
        </div>
        <div className={css.headerRight}>
          <div className={css.searchBox}>
            <svg className={css.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search reports, investigations, equipment..."
              className={css.searchInput}
            />
          </div>
          <button className={css.filterBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filter
          </button>
          <button className={css.generateBtn}>+ Generate Report</button>
        </div>
      </header>

      {/* SUMMARY CARDS */}
      <div className={css.summaryCardsRow}>
        {FIXTURE_SUMMARY_CARDS.map(card => (
          <div key={card.id} className={css.summaryCard}>
            <div className={css.cardIconBox}>{renderCardIcon(card.icon)}</div>
            <div className={css.cardContent}>
              <div className={css.cardLabel}>{card.label}</div>
              <div className={css.cardValue}>{card.value}</div>
            </div>
            <div className={css.cardChevron}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <button className={css.toggleBtnActive} aria-label="Grid view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
              <button className={css.toggleBtn} aria-label="List view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <button className={css.libTab}>All (98)</button>
            <button className={css.libTab}>Investigation Reports (42)</button>
            <button className={join(css.libTab, css.libTabActive)}>Analysis Reports (18)</button>
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
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            ))}
          </div>

          <div className={css.tableHeader}>
            <span>Title</span>
            <span>Type</span>
            <span>Unit / Equip</span>
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
                <div className={css.rowTitle}>{report.title}</div>
                <div className={css.rowType}>{report.type}</div>
                <div className={css.rowUnit}>{report.unitEquipment}</div>
                <div className={css.rowDate}>{report.date}</div>
                <div className={css.rowStatus}>{report.status}</div>
              </div>
            ))}
          </div>

          <div className={css.paginationRow}>
            <button className={css.pageBtn}>&lt;</button>
            <button className={join(css.pageBtn, css.pageBtnActive)}>1</button>
            <button className={css.pageBtn}>2</button>
            <button className={css.pageBtn}>3</button>
            <button className={css.pageBtn}>4</button>
            <button className={css.pageBtn}>5</button>
            <span className={css.paginationEllipsis}>..</span>
            <button className={css.pageBtn}>10</button>
            <button className={css.pageBtn}>&gt;</button>
            <span className={css.paginationMeta}>10 per page</span>
            <span className={css.paginationGoto}>Go to</span>
            <span className={css.paginationGotoValue}>1</span>
          </div>
        </div>

        {/* CENTER: REPORT VIEWER */}
        <div className={css.viewerPanel}>
          <div className={css.viewerHeader}>
            <div className={css.viewerHeaderMain}>
              <h2 className={css.viewerTitle}>Vibration Analysis Report - P-204</h2>
              <span className={css.statusText}>Completed</span>
            </div>
            <div className={css.viewerMetaRow}>
              <span className={css.metaType}>Analysis</span>
              <span className={css.metaSep}>CDU-03</span>
              <span className={css.metaSep}>P-204</span>
              <span className={css.metaSep}>
                Generated on <span className={css.metaDateHighlight}>18 Jan 2024</span>
              </span>
              <span className={css.metaSep}>12 pages</span>
            </div>
            <div className={css.viewerActions}>
              <button className={css.actionLink}>Share</button>
              <button className={css.actionLink}>Download</button>
              <button className={css.actionLink}>...</button>
            </div>
          </div>

          <div className={css.viewerTabs}>
            <button className={join(css.viewerTab, css.viewerTabActive)}>Preview</button>
            <button className={css.viewerTab}>Summary</button>
            <button className={css.viewerTab}>Key Findings</button>
            <button className={css.viewerTab}>Recommendations</button>
            <button className={css.viewerTab}>Evidence</button>
          </div>

          <div className={css.viewerContent}>
            <div className={css.reportDocument}>
              <div className={css.docHeader}>
                <div className={css.docBrand}>
                  <div className={css.docBrandName}>HYPERION</div>
                  <div className={css.docBrandSub}>Industrial Engineering Workbench</div>
                </div>
                <div className={css.docConfidential}>
                  <div>CONFIDENTIAL</div>
                  <div className={css.docConfidentialSub}>For Internal Use Only</div>
                </div>
              </div>

              <div className={css.docTitleSection}>
                <h3 className={css.docReportTitle}>Vibration Analysis Report</h3>
                <div className={css.docReportSubtitle}>P-204 – Crude Feed Pump</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: ACTIONS & DETAILS */}
        <div className={css.detailsPanel}>
          <div className={css.detailsSection}>
            <h3>Report Actions</h3>
            <div className={css.actionList}>
              <button className={css.btnBlack}>Download PDF</button>
              <button className={css.btnWhite}>Share Report</button>
              <button className={css.btnWhite}>Create Follow-up Investigation</button>
              <button className={css.btnWhite}>Export to Word</button>
              <button className={css.btnWhite}>Export Data (CSV)</button>
              <button className={css.btnWhite}>Set as Template</button>
            </div>
          </div>

          <div className={css.detailsSection}>
            <h3>Report Information</h3>
            <dl className={css.infoGrid}>
              <dt>Report ID</dt>
              <dd>RPT-2024-001</dd>
              <dt>Type</dt>
              <dd>Analysis</dd>
              <dt>Unit</dt>
              <dd>CDU-03</dd>
              <dt>Equipment</dt>
              <dd>P-204</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

function renderCardIcon(type: string) {
  switch (type) {
    case 'Sparkle':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
        </svg>
      )
    case 'Clock':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    case 'Users':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'Analytics':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      )
    case 'Document':
    case 'Document2':
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )
  }
}
