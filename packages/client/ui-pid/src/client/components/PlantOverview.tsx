import React from 'react'
import { pidStore } from '../pidStore'
import css from './PlantOverview.module.css'

export const PlantOverview: React.FC = () => {
  return (
    <div className={css.container}>
      {/* Top Header */}
      <div className={css.header}>
        <div className={css.headerLeft}>
          <div className={css.breadcrumb}>
            <span>Plant</span> / <span className={css.activeBreadcrumb}>Overview</span>
          </div>
          <h1 className={css.title}>MRPL Refinery</h1>
          <p className={css.subtitle}>Plant-wide engineering context</p>
        </div>

        <div className={css.headerRight}>
          <div className={css.searchBox}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search units, equipment, documents..."
              className={css.searchInput}
            />
          </div>

          <button type="button" className={css.filterButton}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filter</span>
          </button>

          <button
            type="button"
            className={css.openPidButton}
            onClick={() => pidStore.setActiveNav('pid')}
          >
            <span>Open P&ID</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className={css.contentGrid}>
        {/* Left Map Card */}
        <div className={css.mapCard}>
          <div className={css.mapCardHeader}>
            <div className={css.mapTitleGroup}>
              <div className={css.mapIconBox}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
              </div>
              <div>
                <h3 className={css.mapTitle}>Engineering Plant Map</h3>
                <p className={css.mapSubtitle}>Click on a unit to explore equipment, documents, P&IDs and investigations.</p>
              </div>
            </div>

            <div className={css.mapControls}>
              <div className={css.tabGroup}>
                <button type="button" className={`${css.tabBtn} ${css.activeTab}`}>Diagram</button>
                <button type="button" className={css.tabBtn}>Satellite</button>
                <button type="button" className={css.tabBtn}>List</button>
              </div>
              <button type="button" className={css.expandBtn} title="Expand map">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>
            </div>
          </div>

          {/* Grid Canvas Placeholder */}
          <div className={css.mapCanvas}>
            <div className={css.compass}>N</div>
            <div className={css.placeholderBox}>
              <div className={css.placeholderIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="1.5">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
              </div>
              <h4 className={css.placeholderTitle}>Plant map preview will appear here</h4>
              <p className={css.placeholderDesc}>
                Plant layout visualization will be connected here.<br />
                Plant units, equipment and engineering assets will be mapped in this view.
              </p>
            </div>
          </div>
        </div>

        {/* Right Unit Info Card */}
        <div className={css.unitCard}>
          {/* Unit Image / Banner */}
          <div className={css.unitBanner}>
            <div className={css.unitBannerOverlay} />
            <div className={css.refineryGraphic}>
              <svg width="100%" height="100%" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice">
                <rect width="400" height="160" fill="#0b1329" />
                <path d="M0,160 Q100,100 200,140 T400,120 L400,160 Z" fill="#1e293b" opacity="0.6" />
                <rect x="50" y="40" width="24" height="100" rx="3" fill="#334155" />
                <rect x="90" y="30" width="36" height="110" rx="4" fill="#475569" />
                <rect x="140" y="55" width="20" height="85" rx="3" fill="#334155" />
                <line x1="108" y1="0" x2="108" y2="30" stroke="#f97316" strokeWidth="2" />
                <circle cx="108" cy="10" r="8" fill="#f97316" opacity="0.4" />
                <line x1="50" y1="70" x2="160" y2="70" stroke="#64748b" strokeWidth="1.5" />
                <line x1="50" y1="100" x2="160" y2="100" stroke="#64748b" strokeWidth="1.5" />
              </svg>
            </div>
          </div>

          <div className={css.unitBody}>
            <div className={css.unitHeader}>
              <div>
                <h3 className={css.unitTitle}>Crude Distillation Unit (CDU)</h3>
                <p className={css.unitDesc}>Primary crude processing unit</p>
              </div>
              <span className={css.activeStatus}>● Active</span>
            </div>

            {/* Sub-tabs */}
            <div className={css.unitTabs}>
              <span className={`${css.unitTab} ${css.activeUnitTab}`}>Overview</span>
              <span className={css.unitTab}>Equipment</span>
              <span className={css.unitTab}>Documents</span>
              <span className={css.unitTab}>P&IDs</span>
            </div>

            {/* Counts List */}
            <div className={css.countList}>
              <div className={css.countItem}>
                <div className={css.countLabelGroup}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="8" rx="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" />
                  </svg>
                  <span>Equipment</span>
                </div>
                <div className={css.countValueGroup}>
                  <span className={css.countVal}>42</span>
                  <span className={css.chevron}>&gt;</span>
                </div>
              </div>

              <div className={css.countItem}>
                <div className={css.countLabelGroup}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>Documents</span>
                </div>
                <div className={css.countValueGroup}>
                  <span className={css.countVal}>186</span>
                  <span className={css.chevron}>&gt;</span>
                </div>
              </div>

              <div
                className={`${css.countItem} ${css.clickableCountItem}`}
                onClick={() => pidStore.setActiveNav('pid')}
              >
                <div className={css.countLabelGroup}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <span>P&IDs</span>
                </div>
                <div className={css.countValueGroup}>
                  <span className={css.countVal}>14</span>
                  <span className={css.chevron}>&gt;</span>
                </div>
              </div>

              <div className={css.countItem}>
                <div className={css.countLabelGroup}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span>Investigations</span>
                </div>
                <div className={css.countValueGroup}>
                  <span className={css.countVal}>6</span>
                  <span className={css.chevron}>&gt;</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={css.unitActions}>
              <button
                type="button"
                className={css.openUnitBtn}
                onClick={() => pidStore.setActiveNav('pid')}
              >
                <span>Open Unit →</span>
              </button>

              <button type="button" className={css.startInvestBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <span>Start Investigation</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
