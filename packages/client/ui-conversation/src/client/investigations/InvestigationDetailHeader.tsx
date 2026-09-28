/**
 * InvestigationDetailHeader: Header for HYPERION Screen 5 — Investigation Detail & Analysis.
 * Includes breadcrumb, investigation code, severity and status badges, title, equipment metadata,
 * action buttons (Share, Change Status, Generate Report) and refinery backdrop.
 * The top-right system controls live in the shared WorkbenchUtilityRow.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/InvestigationDetailHeader
 */

import { IconChevronDownOutline14, IconShareOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InvestigationAnalysisDetailData } from './types.ts'
import css from './InvestigationDetailHeader.module.css'

export interface InvestigationDetailHeaderProps {
  readonly data: InvestigationAnalysisDetailData
  readonly onNavigateBack?: () => void
  readonly onShare?: () => void
  readonly onChangeStatus?: () => void
  readonly onGenerateReport?: () => void
}

export function InvestigationDetailHeader({
  data,
  onNavigateBack,
  onShare,
  onChangeStatus,
  onGenerateReport,
}: InvestigationDetailHeaderProps) {
  return (
    <header className={css.headerRoot}>
      {/* Background refinery line-art silhouette decoration */}
      <div className={css.refineryBackdrop} aria-hidden="true">
        <img
          src="/refinery.png"
          alt=""
          className={css.refineryImg}
        />
      </div>

      {/* Main Header Content */}
      <div className={css.mainHeaderRow}>
        <div className={css.titleColumn}>
          {/* Breadcrumb */}
          <nav className={css.breadcrumb} aria-label="Breadcrumb">
            <button
              type="button"
              className={css.breadcrumbLink}
              onClick={onNavigateBack}
            >
              Investigations
            </button>
            <span className={css.breadcrumbSeparator} aria-hidden="true">/</span>
            <span className={css.breadcrumbItem}>{data.code}</span>
            <span className={css.breadcrumbSeparator} aria-hidden="true">/</span>
            <span className={css.breadcrumbActive}>{data.title}</span>
          </nav>

          {/* Heading with ID and Badges */}
          <div className={css.idAndBadgesRow}>
            <h1 className={css.invCodeHeading}>{data.code}</h1>
            <span className={css.severityBadge}>
              <span className={css.sevDot} aria-hidden="true" />
              <span>High</span>
            </span>
            <span className={css.statusBadge}>
              <span>{data.statusLabel}</span>
            </span>
          </div>

          {/* Main Title */}
          <h2 className={css.invTitleText}>{data.title}</h2>

          {/* Metadata line */}
          <div className={css.metadataRow}>
            <span className={css.metaIconSlot} aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span className={css.metaItem}>{data.tag}</span>
            <span className={css.metaSep} aria-hidden="true">•</span>
            <span className={css.metaItem}>{data.unit}</span>
            <span className={css.metaSep} aria-hidden="true">•</span>
            <span className={css.metaItem}>{data.equipmentName}</span>
            <span className={css.metaSep} aria-hidden="true">•</span>
            <span className={css.metaItem}>{data.createdDate}</span>
            <span className={css.metaSep} aria-hidden="true">•</span>
            <span className={css.metaItem}>{data.updatedTimeAgo}</span>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className={css.actionsRow}>
          <button
            type="button"
            className={css.actionSecondaryBtn}
            onClick={onShare}
            aria-label="Share investigation"
          >
            <IconShareOutline16 size={14} />
            <span>Share</span>
          </button>

          <button
            type="button"
            className={css.actionSecondaryBtn}
            onClick={onChangeStatus}
            aria-label="Change status"
          >
            <span>Change Status</span>
            <IconChevronDownOutline14 size={11} className={css.btnChevron} />
          </button>

          <button
            type="button"
            className={css.actionPrimaryBtn}
            onClick={onGenerateReport}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Generate Report</span>
          </button>
        </div>
      </div>
    </header>
  )
}
