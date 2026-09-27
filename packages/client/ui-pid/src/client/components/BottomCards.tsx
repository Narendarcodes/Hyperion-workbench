import React from 'react'
import { usePIDStore, pidStore } from '../pidStore'
import { workbenchStore } from '../workbenchStore'
import { toastStore } from '../toastStore'
import css from './BottomCards.module.css'

export const BottomCards: React.FC = () => {
  const { equipments, documents, lines, selectedEquipment } = usePIDStore()

  const handleEquipmentViewAll = () => {
    workbenchStore.setActiveRoute('/equipment')
    toastStore.info('Navigating to Equipment Directory', 'Viewing all registered equipment assets')
  }

  const handleDocumentsViewAll = () => {
    workbenchStore.setActiveRoute('/documents')
    toastStore.info('Navigating to Engineering Documents', 'Viewing connected drawings and spec sheets')
  }

  const handleLinesViewAll = () => {
    pidStore.setActivePIDTab('lines')
    toastStore.info('P&ID Process Lines View', 'Displaying full process line schedule')
  }

  const handleDocClick = (docName: string) => {
    toastStore.success(`Opened Document: ${docName}`, 'Engineering document viewer loaded successfully')
  }

  return (
    <div className={css.cardsRow}>
      {/* CARD 1: Related Equipment (8) */}
      <div className={css.card}>
        <div className={css.cardHeader}>
          <span className={css.cardTitle}>Related Equipment ({equipments.length})</span>
          <span className={css.viewAllLink} onClick={handleEquipmentViewAll}>
            View all →
          </span>
        </div>
        <div className={css.cardBody}>
          <table className={css.table}>
            <thead>
              <tr>
                <th>Tag</th>
                <th>Description</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {equipments.slice(0, 5).map((eq) => {
                const isSelected = selectedEquipment?.id === eq.id
                return (
                  <tr
                    key={eq.id}
                    className={css.trSelectable}
                    style={{ background: isSelected ? '#e0f2fe' : undefined }}
                    onClick={() => {
                      pidStore.setSelectedEquipment(eq)
                      toastStore.info(`Selected Equipment: ${eq.tag}`, `${eq.name} (${eq.status})`)
                    }}
                  >
                    <td className={css.tagCell}>{eq.tag}</td>
                    <td>{eq.name}</td>
                    <td>{eq.type}</td>
                    <td>
                      <span
                        className={css.statusDot}
                        style={{ background: eq.status === 'In Service' ? '#16a34a' : '#cbd5e1' }}
                      />
                      {eq.status}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CARD 2: Connected Documents (12) */}
      <div className={css.card}>
        <div className={css.cardHeader}>
          <span className={css.cardTitle}>Connected Documents ({documents.length})</span>
          <span
            className={css.viewAllLink}
            onClick={handleDocumentsViewAll}
          >
            View all →
          </span>
        </div>
        <div className={css.cardBody}>
          <div className={css.docList}>
            {documents.slice(0, 5).map((doc) => (
              <div
                key={doc.id}
                className={css.docItem}
                onClick={() => handleDocClick(doc.fileName)}
                style={{ cursor: 'pointer' }}
              >
                <div className={css.docInfo}>
                  <svg className={css.docIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <div>
                    <div className={css.docName}>{doc.fileName}</div>
                    <div className={css.docMeta}>
                      {doc.type} · {doc.date}
                    </div>
                  </div>
                </div>

                <div className={css.actionIcons}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    title="Open Document"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDocClick(doc.fileName)
                    }}
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CARD 3: Related Lines (4) */}
      <div className={css.card}>
        <div className={css.cardHeader}>
          <span className={css.cardTitle}>Related Lines ({lines.length})</span>
          <span className={css.viewAllLink} onClick={handleLinesViewAll}>
            View all →
          </span>
        </div>
        <div className={css.cardBody}>
          <table className={css.table}>
            <thead>
              <tr>
                <th>Line No.</th>
                <th>Service</th>
                <th>From</th>
                <th>To</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(line => (
                <tr
                  key={line.id}
                  className={css.trSelectable}
                  onClick={() => {
                    pidStore.setSelectedLine(line)
                    toastStore.info(`Selected Line: ${line.lineNo}`, `Service: ${line.service} (${line.from} → ${line.to})`)
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

