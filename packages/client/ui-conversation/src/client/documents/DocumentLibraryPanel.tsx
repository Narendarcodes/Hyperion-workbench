/**
 * DocumentLibraryPanel: Left-column document table, filter tabs, search and pagination.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/documents/DocumentLibraryPanel
 */

import { useState } from 'react'
import type { DocumentItem, LibraryTab } from './types.ts'
import css from './DocumentLibraryPanel.module.css'

export interface DocumentLibraryPanelProps {
  readonly documents: readonly DocumentItem[]
  readonly selectedDocId: string
  readonly onSelectDocument: (doc: DocumentItem) => void
}

function PdfFileIcon({ color }: { color: string }) {
  const fillMap: Record<string, { bg: string; stroke: string }> = {
    red: { bg: '#fee2e2', stroke: '#ef4444' },
    purple: { bg: '#f3e8ff', stroke: '#8b5cf6' },
    blue: { bg: '#e0f2fe', stroke: '#0284c7' },
    orange: { bg: '#ffedd5', stroke: '#ea580c' },
    teal: { bg: '#ccfbf1', stroke: '#0d9488' },
  }
  const config = fillMap[color] ?? fillMap.blue

  return (
    <svg width="22" height="26" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 2C3 0.89543 3.89543 0 5 0H15L23 8V26C23 27.1046 22.1046 28 21 28H5C3.89543 28 3 27.1046 3 26V2Z"
        fill={config.bg}
      />
      <path
        d="M15 0L23 8H17C15.8954 8 15 7.10457 15 6V0Z"
        fill={config.stroke}
        opacity="0.3"
      />
      <path
        d="M3 2C3 0.89543 3.89543 0 5 0H15L23 8V26C23 27.1046 22.1046 28 21 28H5C3.89543 28 3 27.1046 3 26V2Z"
        stroke={config.stroke}
        strokeWidth="1.5"
      />
      <path
        d="M7 13H17M7 17H14M7 21H12"
        stroke={config.stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function DocumentLibraryPanel({
  documents,
  selectedDocId,
  onSelectDocument,
}: DocumentLibraryPanelProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [page, setPage] = useState(1)

  const filteredDocs = documents.filter((doc) => {
    if (activeTab === 'pids' && doc.type !== 'P&ID') return false
    if (activeTab === 'procedures' && doc.type !== 'Procedure' && doc.type !== 'Manual' && doc.type !== 'Guide') return false
    if (activeTab === 'reports' && doc.type !== 'Inspection') return false

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      const matchName = doc.name.toLowerCase().includes(q)
      const matchSub = doc.subtitle.toLowerCase().includes(q)
      const matchUnit = doc.unit.toLowerCase().includes(q)
      const matchType = doc.type.toLowerCase().includes(q)
      const matchTags = doc.tags.some(t => t.toLowerCase().includes(q))
      return matchName || matchSub || matchUnit || matchType || matchTags
    }
    return true
  })

  return (
    <section className={css.panelRoot} aria-label="Document Library">
      {/* 1. Header with View Toggles */}
      <div className={css.headerRow}>
        <h2 className={css.panelTitle}>Document Library</h2>
        <div className={css.viewModeGroup}>
          <button
            type="button"
            className={`${css.viewModeBtn} ${viewMode === 'grid' ? css.viewModeBtnActive : ''}`}
            aria-label="Grid view"
            title="Grid view"
            onClick={() => setViewMode('grid')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            className={`${css.viewModeBtn} ${viewMode === 'list' ? css.viewModeBtnActive : ''}`}
            aria-label="List view"
            title="List view"
            onClick={() => setViewMode('list')}
          >
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

      {/* 2. Tabs */}
      <div className={css.tabsBar} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`${css.tabItem} ${activeTab === 'all' ? css.tabItemActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All (2,362)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pids'}
          className={`${css.tabItem} ${activeTab === 'pids' ? css.tabItemActive : ''}`}
          onClick={() => setActiveTab('pids')}
        >
          P&IDs (428)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'procedures'}
          className={`${css.tabItem} ${activeTab === 'procedures' ? css.tabItemActive : ''}`}
          onClick={() => setActiveTab('procedures')}
        >
          Procedures (312)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'reports'}
          className={`${css.tabItem} ${activeTab === 'reports' ? css.tabItemActive : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports (98)
        </button>
      </div>

      {/* 3. Search and Filter Pills */}
      <div className={css.filterControls}>
        <div className={css.searchBox}>
          <svg className={css.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={css.searchInput}
            placeholder="Search documents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Filter documents table"
          />
        </div>

        <div className={css.pillsRow}>
          <button type="button" className={css.filterPill}>
            <span>Unit</span>
            <svg className={css.pillChevron} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button type="button" className={css.filterPill}>
            <span>Equipment</span>
            <svg className={css.pillChevron} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button type="button" className={css.filterPill}>
            <span>Document Type</span>
            <svg className={css.pillChevron} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button type="button" className={css.filterPill}>
            <span>Tag</span>
            <svg className={css.pillChevron} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <button type="button" className={css.filterSettingsBtn} aria-label="Sort and filter options">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 4. Documents Table */}
      <div className={css.tableContainer}>
        <table className={css.docTable}>
          <thead>
            <tr className={css.tableHeadRow}>
              <th className={css.tableTh}>
                Name <span className={css.sortIcon}>▾</span>
              </th>
              <th className={css.tableTh}>
                Type <span className={css.sortIcon}>▾</span>
              </th>
              <th className={css.tableTh}>Unit / Equipment</th>
              <th className={css.tableTh}>
                Date <span className={css.sortIcon}>▾</span>
              </th>
              <th className={css.tableTh}></th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.map((doc) => {
              const isSelected = selectedDocId === doc.id
              return (
                <tr
                  key={doc.id}
                  className={`${css.tableRow} ${isSelected ? css.tableRowSelected : ''}`}
                  onClick={() => onSelectDocument(doc)}
                  aria-selected={isSelected}
                >
                  <td className={css.tableTd}>
                    <div className={css.nameCell}>
                      <div className={css.fileIcon}>
                        <PdfFileIcon color={doc.iconColor} />
                      </div>
                      <div className={css.nameInfo}>
                        <span className={css.fileName} title={doc.name}>{doc.name}</span>
                        <span className={css.fileSubtitle} title={doc.subtitle}>{doc.subtitle}</span>
                      </div>
                    </div>
                  </td>
                  <td className={css.tableTd}>
                    <span className={`${css.badge} ${css[`badge-${doc.typeColor}`]}`}>
                      {doc.type}
                    </span>
                  </td>
                  <td className={`${css.tableTd} ${css.unitCell}`}>{doc.unit}</td>
                  <td className={`${css.tableTd} ${css.dateCell}`}>{doc.date}</td>
                  <td className={`${css.tableTd} ${css.actionCell}`}>
                    <button
                      type="button"
                      className={css.actionBtn}
                      aria-label={`Actions for ${doc.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 5. Pagination */}
      <div className={css.paginationRow}>
        <div className={css.pageNumbers}>
          <button
            type="button"
            className={css.pageBtn}
            aria-label="Previous page"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            ‹
          </button>
          {[1, 2, 3, 4, 5].map(pNum => (
            <button
              key={pNum}
              type="button"
              className={`${css.pageBtn} ${page === pNum ? css.pageBtnActive : ''}`}
              onClick={() => setPage(pNum)}
            >
              {pNum}
            </button>
          ))}
          <span className={css.ellipsis}>...</span>
          <button type="button" className={css.pageBtn} onClick={() => setPage(237)}>
            237
          </button>
          <button
            type="button"
            className={css.pageBtn}
            aria-label="Next page"
            onClick={() => setPage(p => p + 1)}
          >
            ›
          </button>
        </div>

        <div className={css.perPageSelect}>
          <span>10 per page</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        <div className={css.goToBox}>
          <span>Go to</span>
          <input
            type="text"
            className={css.goToInput}
            defaultValue="1"
            aria-label="Go to page"
          />
        </div>
      </div>
    </section>
  )
}
