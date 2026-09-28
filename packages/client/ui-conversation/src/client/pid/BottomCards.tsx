/**
 * P&ID bottom cards: related equipment, connected documents, related lines.
 * Extracted from origin/Harshith ui-pid; rewired to Hyperion callbacks
 * (no parallel workbench router, no toast store). Equipment list honors the
 * shared pidStore search query and status filter.
 */
import React from 'react'
import { usePIDStore, pidStore } from './pidStore'
import type { PIDDocument, PIDEquipment } from './types'
import css from './BottomCards.module.css'

/** Status dot tone per equipment state. */
function statusClass(status: PIDEquipment['status']): string | undefined {
  switch (status) {
    case 'In Service': return css.statusInService
    case 'Standby': return css.statusStandby
    case 'Maintenance': return css.statusMaintenance
    case 'Offline': return css.statusOffline
  }
}

export interface BottomCardsProps {
  /** Navigate to the Hyperion Equipment view. */
  onViewAllEquipment: () => void
  /** Navigate to the Hyperion Documents view. */
  onViewAllDocuments: () => void
  /** Open a connected document in the Hyperion Documents view. */
  onOpenDocument: (doc: PIDDocument) => void
}

export const BottomCards: React.FC<BottomCardsProps> = ({
  onViewAllEquipment,
  onViewAllDocuments,
  onOpenDocument,
}) => {
  const {
    equipments, documents, lines, selectedEquipment, searchQuery, filterState,
  } = usePIDStore()

  const query = searchQuery.trim().toLowerCase()
  const visibleEquipment = equipments.filter(eq =>
    (filterState === 'all' || eq.status === filterState)
    && (query === ''
      || eq.tag.toLowerCase().includes(query)
      || eq.name.toLowerCase().includes(query)),
  )

  return (
    <div className={css.cardsRow}>
      <div className={css.card}>
        <div className={css.cardHeader}>
          <span className={css.cardTitle}>Related Equipment ({visibleEquipment.length})</span>
          <button type="button" className={css.viewAllLink} onClick={onViewAllEquipment}>
            View all →
          </button>
        </div>
        <div className={css.cardBody}>
          <table className={css.table} aria-label="Related equipment">
            <thead>
              <tr>
                <th scope="col">Tag</th>
                <th scope="col">Description</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleEquipment.slice(0, 5).map((eq) => {
                const isSelected = selectedEquipment?.id === eq.id
                return (
                  <tr
                    key={eq.id}
                    className={css.trSelectable}
                    data-selected={isSelected || undefined}
                    tabIndex={0}
                    onClick={() => { pidStore.setSelectedEquipment(eq) }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        pidStore.setSelectedEquipment(eq)
                      }
                    }}
                  >
                    <td className={css.tagCell}>{eq.tag}</td>
                    <td>{eq.name}</td>
                    <td>{eq.type}</td>
                    <td>
                      <span className={`${css.statusDot} ${statusClass(eq.status) ?? ''}`} aria-hidden="true" />
                      {eq.status}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className={css.card}>
        <div className={css.cardHeader}>
          <span className={css.cardTitle}>Connected Documents ({documents.length})</span>
          <button type="button" className={css.viewAllLink} onClick={onViewAllDocuments}>
            View all →
          </button>
        </div>
        <div className={css.cardBody}>
          <div className={css.docList}>
            {documents.slice(0, 5).map(doc => (
              <button
                key={doc.id}
                type="button"
                className={css.docItem}
                onClick={() => { onOpenDocument(doc) }}
              >
                <span className={css.docInfo}>
                  <svg className={css.docIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span>
                    <span className={css.docName}>{doc.fileName}</span>
                    <span className={css.docMeta}>
                      {doc.type} · {doc.date}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={css.card}>
        <div className={css.cardHeader}>
          <span className={css.cardTitle}>Related Lines ({lines.length})</span>
          <button
            type="button"
            className={css.viewAllLink}
            onClick={() => { pidStore.setActivePIDTab('lines') }}
          >
            View all →
          </button>
        </div>
        <div className={css.cardBody}>
          <table className={css.table} aria-label="Related process lines">
            <thead>
              <tr>
                <th scope="col">Line No.</th>
                <th scope="col">Service</th>
                <th scope="col">From</th>
                <th scope="col">To</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(line => (
                <tr
                  key={line.id}
                  className={css.trSelectable}
                  tabIndex={0}
                  onClick={() => { pidStore.setSelectedLine(line) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      pidStore.setSelectedLine(line)
                    }
                  }}
                >
                  <td className={css.tagCell}>{line.lineNo}</td>
                  <td>{line.service}</td>
                  <td>{line.from}</td>
                  <td>{line.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
