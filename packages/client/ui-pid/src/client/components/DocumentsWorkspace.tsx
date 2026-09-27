import React from 'react'
import { useWorkbenchStore, workbenchStore } from '../workbenchStore'
import { pidStore } from '../pidStore'
import { toastStore } from '../toastStore'
import css from './DocumentsWorkspace.module.css'

export const DocumentsWorkspace: React.FC = () => {
  const { documents, activeFilters } = useWorkbenchStore()

  const filtered = documents.filter(doc => {
    if (activeFilters.unit && activeFilters.unit !== 'All Units' && doc.unit !== activeFilters.unit) return false
    if (activeFilters.type && activeFilters.type !== 'All Types' && doc.type !== activeFilters.type) return false
    return true
  })

  const handleOpenDoc = (docTitle: string) => {
    if (docTitle.endsWith('.pdf') && docTitle.includes('001')) {
      pidStore.setActiveNav('pid')
      toastStore.info(`Opening interactive vector schematic for ${docTitle}`)
    } else {
      toastStore.success(`Opened document viewer for ${docTitle}`)
    }
  }

  const handleDownloadDoc = (docTitle: string) => {
    toastStore.success(`Downloaded ${docTitle} to local disk`)
  }

  return (
    <div className={css.container}>
      <div className={css.header}>
        <div>
          <div className={css.breadcrumb}>Work / Documents</div>
          <h1 className={css.title}>Engineering Document Repository</h1>
          <p className={css.subtitle}>Access datasheets, P&IDs, PFDs, inspection logs, and operating manuals</p>
        </div>

        <div className={css.headerActions}>
          <button type="button" className={css.filterBtn} onClick={() => workbenchStore.openFilter('documents')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filter ({Object.keys(activeFilters).length})</span>
          </button>
        </div>
      </div>

      <div className={css.card}>
        <table className={css.table}>
          <thead>
            <tr>
              <th>Document Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Equipment Tag</th>
              <th>Last Updated</th>
              <th>Size</th>
              <th>Status</th>
              <th className={css.actionsCol}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(doc => (
              <tr key={doc.id}>
                <td className={css.docName} onClick={() => handleOpenDoc(doc.title)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>{doc.title}</span>
                </td>
                <td><span className={css.typeTag}>{doc.type}</span></td>
                <td>{doc.unit}</td>
                <td>{doc.equipmentTag || '—'}</td>
                <td>{doc.updatedAt}</td>
                <td>{doc.size}</td>
                <td>
                  <span className={`${css.statusBadge} ${doc.status === 'Approved' ? css.appr : css.rev}`}>
                    ● {doc.status}
                  </span>
                </td>
                <td className={css.actionsCol}>
                  <button type="button" className={css.actionIconBtn} title="Open Document" onClick={() => handleOpenDoc(doc.title)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                    </svg>
                  </button>

                  <button type="button" className={css.actionIconBtn} title="Download File" onClick={() => handleDownloadDoc(doc.title)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
