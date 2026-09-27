/**
 * RightContextColumn: Right-side column in the Investigation Analysis workspace.
 * Displays Equipment Context, Quick Actions, Related Documents (6), and Similar Equipment.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/RightContextColumn
 */

import {
  IconEllipsisOutline16,
  IconShareOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  InvestigationAnalysisDetailData,
  InvestigationEvidence,
  SimilarEquipmentRecord,
} from './types.ts'
import css from './RightContextColumn.module.css'

export interface RightContextColumnProps {
  readonly data: InvestigationAnalysisDetailData
  readonly onViewEquipmentDetails?: () => void
  readonly onQuickAction?: (actionId: string) => void
  readonly onOpenDocument?: (doc: InvestigationEvidence) => void
  readonly onViewAllDocuments?: () => void
  readonly onSelectSimilarEquipment?: (item: SimilarEquipmentRecord) => void
  readonly onViewAllSimilar?: () => void
}

function MiniSparkline({ data }: { data: readonly number[] }) {
  const width = 45
  const height = 16
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width
    const y = height - 2 - ((val - min) / range) * (height - 4)
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className={css.miniSparkline} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DocIcon({ idx }: { idx: number }) {
  const tones = ['red', 'purple', 'blue', 'orange', 'cyan', 'green'] as const
  const tone = tones[idx % tones.length]

  return (
    <span className={`${css.docBadge} ${css[`docTone_${tone}`]}`} aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    </span>
  )
}

export function RightContextColumn({
  data,
  onViewEquipmentDetails,
  onQuickAction,
  onOpenDocument,
  onViewAllDocuments,
  onSelectSimilarEquipment,
  onViewAllSimilar,
}: RightContextColumnProps) {
  return (
    <aside className={css.columnRoot} aria-label="Investigation context and connected items">
      {/* 1. Equipment Context Card */}
      <div className={css.sideCard}>
        <h3 className={css.cardTitle}>Equipment Context</h3>

        <div className={css.equipTopRow}>
          <img
            src="/equipment-pump.png"
            alt={data.equipmentName}
            className={css.equipThumbnail}
          />
          <div className={css.equipTopDetails}>
            <span className={css.equipTagBold}>{data.tag}</span>
            <span className={css.equipNameText}>{data.equipmentName}</span>
            <span className={css.inServiceBadge}>
              <span className={css.greenDot} aria-hidden="true" />
              <span>{data.equipmentStatus}</span>
            </span>
          </div>
        </div>

        <dl className={css.specList}>
          <div className={css.specRow}>
            <dt className={css.specKey}>Unit</dt>
            <dd className={css.specVal}>{data.unit}</dd>
          </div>
          <div className={css.specRow}>
            <dt className={css.specKey}>Service</dt>
            <dd className={css.specVal}>{data.service}</dd>
          </div>
          <div className={css.specRow}>
            <dt className={css.specKey}>Type</dt>
            <dd className={css.specVal}>{data.equipmentType}</dd>
          </div>
          <div className={css.specRow}>
            <dt className={css.specKey}>Manufacturer</dt>
            <dd className={css.specVal}>{data.manufacturer}</dd>
          </div>
          <div className={css.specRow}>
            <dt className={css.specKey}>Model</dt>
            <dd className={css.specVal}>{data.model}</dd>
          </div>
          <div className={css.specRow}>
            <dt className={css.specKey}>Tag Number</dt>
            <dd className={css.specVal}>{data.tag}</dd>
          </div>
        </dl>

        <button
          type="button"
          className={css.viewDetailsLinkBtn}
          onClick={onViewEquipmentDetails}
        >
          <span>View Equipment Details</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      {/* 2. Quick Actions Card */}
      <div className={css.sideCard}>
        <h3 className={css.cardTitle}>Quick Actions</h3>

        <div className={css.quickActionsList}>
          <button
            type="button"
            className={css.quickActionBtn}
            onClick={() => onQuickAction?.('ask-hyperion')}
          >
            <span className={`${css.actionIconSlot} ${css.iconBlue}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
              </svg>
            </span>
            <span>Ask Hyperion</span>
          </button>

          <button
            type="button"
            className={css.quickActionBtn}
            onClick={() => onQuickAction?.('compare-similar')}
          >
            <span className={`${css.actionIconSlot} ${css.iconGreen}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </span>
            <span>Compare with Similar</span>
          </button>

          <button
            type="button"
            className={css.quickActionBtn}
            onClick={() => onQuickAction?.('open-pid')}
          >
            <span className={`${css.actionIconSlot} ${css.iconCyan}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <path d="M6 10v7h8M10 6h4" />
              </svg>
            </span>
            <span>Open in P&ID</span>
          </button>

          <button
            type="button"
            className={css.quickActionBtn}
            onClick={() => onQuickAction?.('create-work-order')}
          >
            <span className={`${css.actionIconSlot} ${css.iconOrange}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
            </span>
            <span>Create Work Order</span>
          </button>

          <button
            type="button"
            className={css.quickActionBtn}
            onClick={() => onQuickAction?.('generate-report')}
          >
            <span className={`${css.actionIconSlot} ${css.iconPurple}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </span>
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* 3. Related Documents (6) */}
      <div className={css.sideCard}>
        <div className={css.cardHeaderRow}>
          <h3 className={css.cardTitle}>Related Documents ({data.totalDocumentsCount})</h3>
          <button
            type="button"
            className={css.viewAllBtn}
            onClick={onViewAllDocuments}
          >
            <span>View all</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <ul className={css.docsList} role="list">
          {data.relatedDocuments.map((doc, idx) => (
            <li key={doc.id} className={css.docItemRow}>
              <button
                type="button"
                className={css.docMainBtn}
                onClick={() => onOpenDocument?.(doc)}
              >
                <DocIcon idx={idx} />
                <div className={css.docTextColumn}>
                  <span className={css.docTitleText}>{doc.name}</span>
                  <span className={css.docSubtitleText}>{doc.description}</span>
                </div>
              </button>

              <div className={css.docActionButtons}>
                <button
                  type="button"
                  className={css.docIconBtn}
                  onClick={() => onOpenDocument?.(doc)}
                  aria-label={`Open ${doc.name}`}
                  title="Open"
                >
                  <IconShareOutline16 size={12} />
                </button>
                <button
                  type="button"
                  className={css.docIconBtn}
                  aria-label={`More options for ${doc.name}`}
                  title="Options"
                >
                  <IconEllipsisOutline16 size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 4. Similar Equipment */}
      <div className={css.sideCard}>
        <div className={css.cardHeaderRow}>
          <h3 className={css.cardTitle}>Similar Equipment</h3>
          <button
            type="button"
            className={css.viewAllBtn}
            onClick={onViewAllSimilar}
          >
            <span>View all</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <ul className={css.similarList} role="list">
          {data.similarEquipment.map(item => (
            <li key={item.id} className={css.similarItemRow}>
              <button
                type="button"
                className={css.similarBtn}
                onClick={() => onSelectSimilarEquipment?.(item)}
              >
                <span className={css.pumpGlyphBadge} aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="7" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 5v-3M19 12h3M12 19v3M5 12H2" />
                  </svg>
                </span>

                <div className={css.similarTextGroup}>
                  <span className={css.similarTag}>{item.tag}</span>
                  <span className={css.similarSubtext}>{item.name} • {item.unit}</span>
                </div>

                <MiniSparkline data={item.sparkline} />

                <span className={css.similarMetricText}>{item.metric}</span>

                <span className={css.statusNormalBadge}>
                  {item.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
