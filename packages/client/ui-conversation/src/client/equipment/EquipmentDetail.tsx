/**
 * EquipmentDetail: center card for one source-cited equipment record.
 * Shows only what the public source prints (tag, name, type, unit, facility,
 * service) plus each citation with its host verification status. Fields the
 * source does not carry (manufacturer, maintenance dates, live telemetry)
 * are stated as not available instead of drawn.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/equipment/EquipmentDetail
 */

import type { MrplCitationStatus, MrplEquipmentRecord } from '../mrpl/contract.ts'
import { StatusChip, type StatusTone } from '../mrpl/Workbench.tsx'
import css from './EquipmentDetail.module.css'

export interface EquipmentDetailProps {
  readonly equipment: MrplEquipmentRecord
  /** Document titles by id, for citation labels. */
  readonly documentTitles: ReadonlyMap<string, string>
  /** Other records in the selected browser category (switcher). */
  readonly siblings: readonly MrplEquipmentRecord[]
  readonly onSelectSibling?: ((id: string) => void) | undefined
  readonly onViewPid?: (() => void) | undefined
  readonly onOpenDocuments?: (() => void) | undefined
  readonly onOpenCitation?: ((documentId: string, page: number) => void) | undefined
}

export const CITATION_STATUS_LABEL: Record<MrplCitationStatus, { readonly label: string; readonly tone: StatusTone }> = {
  'verified': { label: 'Verified', tone: 'ok' },
  'unverified': { label: 'Quote not found', tone: 'error' },
  'page-not-found': { label: 'Page not found', tone: 'error' },
  'document-not-found': { label: 'Document missing', tone: 'error' },
  'no-text': { label: 'No text to check', tone: 'warn' },
}

/** Display title for a record: the printed tag, else its name. */
export function equipmentSubject(record: MrplEquipmentRecord): string {
  return record.tag ?? record.name
}

export function EquipmentDetail({
  equipment,
  documentTitles,
  siblings,
  onSelectSibling,
  onViewPid,
  onOpenDocuments,
  onOpenCitation,
}: EquipmentDetailProps) {
  const verified = equipment.citations.filter(cite => cite.status === 'verified').length
  const allVerified = verified === equipment.citations.length && verified > 0
  return (
    <article className={css.detailCard} aria-labelledby="equipment-tag">
      <div className={css.detailHeader}>
        <div className={css.titleAndStatus}>
          <div className={css.tagRow}>
            <h2 id="equipment-tag" className={css.tagHeading}>{equipmentSubject(equipment)}</h2>
            <StatusChip tone={allVerified ? 'ok' : verified > 0 ? 'warn' : 'error'}>
              {allVerified ? 'Source verified' : `${String(verified)}/${String(equipment.citations.length)} citations verified`}
            </StatusChip>
          </div>
          <p className={css.equipmentMeta}>
            <span className={css.metaName}>{equipment.tag === null ? 'No tag printed in source' : equipment.name}</span>
            <span className={css.metaSeparator} aria-hidden="true">•</span>
            <span className={css.metaUnit}>{equipment.unit}</span>
            <span className={css.metaSeparator} aria-hidden="true">•</span>
            <span className={css.metaArea}>{equipment.facility}</span>
          </p>
        </div>

        <div className={css.headerActions}>
          <button type="button" className={css.actionOutlineBtn} onClick={onViewPid} aria-label="View on P&ID">
            <span>View on P&ID</span>
          </button>
          <button type="button" className={css.actionOutlineBtn} onClick={onOpenDocuments} aria-label="Open Documents">
            <span>Open Documents</span>
          </button>
        </div>
      </div>

      {siblings.length > 1 && (
        <div className={css.siblingRow} role="group" aria-label="Equipment in this category">
          {siblings.map(item => (
            <button
              key={item.id}
              type="button"
              className={`${css.siblingBtn} ${item.id === equipment.id ? css.siblingActive : ''}`}
              aria-pressed={item.id === equipment.id}
              onClick={() => onSelectSibling?.(item.id)}
            >
              {equipmentSubject(item)}
            </button>
          ))}
        </div>
      )}

      <div className={css.tabPanel}>
        <div className={css.recordGrid}>
          <div className={css.keyInfoPanel}>
            <div className={css.keyInfoHeader}>
              <h3 className={css.keyInfoTitle}>Key Information</h3>
            </div>
            <dl className={css.infoGrid}>
              <div className={css.infoRow}>
                <dt className={css.infoLabel}>Tag Number</dt>
                <dd className={css.infoValueBold}>{equipment.tag ?? 'Not printed in source'}</dd>
              </div>
              <div className={css.infoRow}>
                <dt className={css.infoLabel}>Name</dt>
                <dd className={css.infoValue}>{equipment.name}</dd>
              </div>
              <div className={css.infoRow}>
                <dt className={css.infoLabel}>Equipment Type</dt>
                <dd className={css.infoValue}>{equipment.type}</dd>
              </div>
              <div className={css.infoRow}>
                <dt className={css.infoLabel}>Service</dt>
                <dd className={css.infoValue}>{equipment.service}</dd>
              </div>
              <div className={css.infoRow}>
                <dt className={css.infoLabel}>Unit</dt>
                <dd className={css.infoValue}>{equipment.unit}</dd>
              </div>
              <div className={css.infoRow}>
                <dt className={css.infoLabel}>Facility</dt>
                <dd className={css.infoValue}>{equipment.facility}</dd>
              </div>
              <div className={css.infoRow}>
                <dt className={css.infoLabel}>Telemetry</dt>
                <dd className={css.infoValue}><StatusChip tone="neutral">Not connected</StatusChip></dd>
              </div>
            </dl>
          </div>

          <div className={css.keyInfoPanel}>
            <div className={css.keyInfoHeader}>
              <h3 className={css.keyInfoTitle}>Source Evidence</h3>
            </div>
            <ul className={css.citationList} aria-label="Source citations">
              {equipment.citations.map(cite => (
                <li key={`${cite.documentId}:${String(cite.page)}:${cite.quote}`} className={css.citationItem}>
                  <div className={css.citationHead}>
                    <button
                      type="button"
                      className={css.citationLink}
                      onClick={() => onOpenCitation?.(cite.documentId, cite.page)}
                    >
                      {`${cite.documentId} · p. ${String(cite.page)}`}
                    </button>
                    <StatusChip tone={CITATION_STATUS_LABEL[cite.status].tone}>
                      {CITATION_STATUS_LABEL[cite.status].label}
                    </StatusChip>
                  </div>
                  <div className={css.citationTitle}>{documentTitles.get(cite.documentId) ?? cite.documentId}</div>
                  <blockquote className={css.citationQuote}>{`“${cite.quote}”`}</blockquote>
                </li>
              ))}
            </ul>
            <p className={css.tabEmptyText}>
              Manufacturer, maintenance history and live readings are not in the public source and are not shown.
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}
