/**
 * DocumentsOverview: root of the HYPERION Documents page.
 * - Header with breadcrumbs, title, dataset badge, search, filter, upload
 * - Category cards (counts from the host catalog; click filters the library)
 * - 3-column split: Document Library, Document Viewer, Document Details + Copilot
 * Data comes from `/hyperion/mrpl/documents` through the MRPL data source;
 * loading / empty / error states use the shared WorkbenchState.
 * Sets data-hide-composer to hide the chat composer seat.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/documents/DocumentsOverview
 */

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { DocumentsHeader } from './DocumentsHeader.tsx'
import { CategoryCards } from './CategoryCards.tsx'
import { DocumentLibraryPanel } from './DocumentLibraryPanel.tsx'
import { DocumentViewerPanel } from './DocumentViewerPanel.tsx'
import { DocumentDetailsPanel } from './DocumentDetailsPanel.tsx'
import { UploadAskPanel } from './UploadAskPanel.tsx'
import { toDocumentCategories, toDocumentItem } from './adapter.ts'
import type { DocumentItem } from './types.ts'
import { useMrplSource } from '../mrpl/api.ts'
import { MRPL_UPLOAD_CONTENT_TYPES } from '../mrpl/contract.ts'
import { useMrplResource } from '../mrpl/useMrplResource.ts'
import { DatasetBadge, WorkbenchState, workbenchTokensClass } from '../mrpl/Workbench.tsx'
import css from './DocumentsOverview.module.css'

export interface DocumentsOverviewProps {
  readonly onOpenPid?: (doc: DocumentItem) => void
  readonly onAddToInvestigation?: (doc: DocumentItem) => void
  readonly onAskCopilot?: (question: string) => void
  /** Ingest-job poll interval (ms). */
  readonly ingestPollMs?: number
}

const SUBTITLE = 'Engineering documents and reference material • Refinery corpus'

export function DocumentsOverview({
  onOpenPid,
  onAddToInvestigation,
  onAskCopilot,
  ingestPollMs,
}: DocumentsOverviewProps) {
  const source = useMrplSource()
  const catalog = useMrplResource(
    signal => source.listDocuments(signal),
    data => data.documents.length === 0,
    'catalog',
  )
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [askOpen, setAskOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const canUpload = source.uploadDocument !== undefined

  const documents = useMemo(
    () => (catalog.status === 'ready' ? catalog.data.documents.map(toDocumentItem) : []),
    [catalog],
  )
  const categories = useMemo(
    () => (catalog.status === 'ready' ? toDocumentCategories(catalog.data.categories) : []),
    [catalog],
  )
  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return documents.filter((doc) => {
      if (selectedCategoryId !== undefined && doc.category !== selectedCategoryId) return false
      if (q === '') return true
      return [doc.name, doc.subtitle, doc.unit, doc.type, doc.uploadedBy, ...doc.tags]
        .some(value => value.toLowerCase().includes(q))
    })
  }, [documents, searchQuery, selectedCategoryId])
  const selectedDoc = visible.find(doc => doc.id === selectedId) ?? visible[0]

  const openSource = (doc: DocumentItem): void => {
    if (doc.sourceUrl !== undefined) window.open(doc.sourceUrl, '_blank', 'noopener')
  }

  const header = (
    <DocumentsHeader
      title="Documents"
      subtitle={SUBTITLE}
      breadcrumb={['Documents', 'All Documents']}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onFilterClick={() => {
        setSelectedCategoryId(undefined)
        setSearchQuery('')
      }}
      onUploadClick={canUpload ? () => { fileInput.current?.click() } : undefined}
      uploadDisabledReason={canUpload ? undefined : 'Uploads need the live RAG service (HYPERION_RAG_URL on the bridge)'}
      badge={catalog.status === 'ready' || catalog.status === 'empty' ? <DatasetBadge dataset={catalog.data.dataset} /> : undefined}
    />
  )

  const shell = (body: ReactNode) => (
    <div
      className={`${css.documentsRoot} ${workbenchTokensClass}`}
      data-hide-composer=""
      role="region"
      aria-label="Documents"
    >
      <div className={css.backgroundWatermark} aria-hidden="true" />
      <div className={css.contentWrapper}>
        {header}
        <input
          ref={fileInput}
          type="file"
          hidden
          data-mrpl-upload=""
          accept={[...MRPL_UPLOAD_CONTENT_TYPES, '.pdf', '.md', '.txt'].join(',')}
          onChange={(event) => {
            const picked = event.target.files?.[0]
            if (picked !== undefined) {
              setUploadFile(picked)
              setAskOpen(true)
            }
            event.target.value = ''
          }}
        />
        {askOpen || (source.answerEvidence !== undefined && uploadFile === null && canUpload)
          ? <UploadAskPanel source={source} file={uploadFile} {...(ingestPollMs === undefined ? {} : { pollMs: ingestPollMs })} />
          : null}
        {body}
      </div>
    </div>
  )

  if (catalog.status === 'loading') {
    return shell(<WorkbenchState kind="loading" label="Documents" />)
  }
  if (catalog.status === 'error') {
    return shell(<WorkbenchState kind="error" label="Documents" error={catalog.error} onRetry={catalog.retry} />)
  }
  if (catalog.status === 'empty') {
    return shell(
      <WorkbenchState
        kind="empty"
        label="Documents"
        title="No documents in the corpus catalog"
        detail="The configured document store has an empty manifest. Add documents to manifest/documents.json."
      />,
    )
  }

  return shell(
    <>
      <CategoryCards
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={(id) => {
          setSelectedCategoryId(current => (current === id ? undefined : id))
        }}
      />
      {selectedDoc === undefined ? (
        <WorkbenchState
          kind="empty"
          label="Documents"
          title="No documents match"
          detail="Clear the search or category filter to see the full catalog."
        />
      ) : (
        <div className={css.columnsContainer}>
          <DocumentLibraryPanel
            documents={visible}
            selectedDocId={selectedDoc.id}
            onSelectDocument={(doc) => {
              setSelectedId(doc.id)
            }}
          />
          <DocumentViewerPanel
            document={selectedDoc}
            onClose={() => {
              setSelectedId(undefined)
            }}
            onDownload={() => {
              openSource(selectedDoc)
            }}
            onOpenFullscreen={() => {
              onOpenPid?.(selectedDoc)
            }}
          />
          <DocumentDetailsPanel
            document={selectedDoc}
            onOpenFullscreen={() => {
              onOpenPid?.(selectedDoc)
            }}
            onDownload={() => {
              openSource(selectedDoc)
            }}
            onAddToInvestigation={onAddToInvestigation ?? (() => {})}
            onAskCopilot={onAskCopilot ?? (() => {})}
          />
        </div>
      )}
    </>,
  )
}
