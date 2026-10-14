/**
 * EquipmentPage: root of the HYPERION Equipment Workspace.
 * Reads `/hyperion/mrpl/equipment` (source-cited equipment records whose
 * citations the host has verified against page text) and the document
 * catalog for citation titles. Browser tree, detail card, source documents
 * and Ask Hyperion are all driven by that data; nothing is synthesized.
 * Sets data-hide-composer to hide the chat composer seat.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/equipment/EquipmentPage
 */

import { useMemo, useState, type ReactNode } from 'react'
import { EquipmentHeader } from './EquipmentHeader.tsx'
import { EquipmentBrowser } from './EquipmentBrowser.tsx'
import { EquipmentDetail, equipmentSubject } from './EquipmentDetail.tsx'
import { ConnectedDocuments } from './ConnectedDocuments.tsx'
import { AskHyperionPanel } from './AskHyperionPanel.tsx'
import type { ConnectedDocument, EquipmentSuggestionPrompt, EquipmentUnitGroup } from './types.ts'
import type { MrplEquipmentRecord, MrplEquipmentResponse } from '../mrpl/contract.ts'
import { useMrplSource } from '../mrpl/api.ts'
import { useMrplResource } from '../mrpl/useMrplResource.ts'
import { DatasetBadge, WorkbenchState, workbenchTokensClass } from '../mrpl/Workbench.tsx'
import css from './EquipmentPage.module.css'

export interface EquipmentPageProps {
  readonly onOpenPid?: (equipment: MrplEquipmentRecord) => void
  readonly onOpenDocuments?: (equipment: MrplEquipmentRecord) => void
  readonly onOpenCitation?: (documentId: string, page: number) => void
  readonly onNewInvestigation?: (equipment: MrplEquipmentRecord | undefined) => void
  readonly onAskEquipment?: (query: string) => void
}

const UNIT_COLORS: readonly EquipmentUnitGroup['color'][] = ['blue', 'green', 'purple', 'amber', 'cyan', 'teal', 'slate']

/** Browser tree from the host's equipment groups (counts are real). */
export function toUnitGroups(response: MrplEquipmentResponse): EquipmentUnitGroup[] {
  return response.groups.map((group, index) => ({
    id: group.id,
    code: group.unit,
    name: `${group.unit} — ${group.facility}`,
    count: group.count,
    color: UNIT_COLORS[index % UNIT_COLORS.length] ?? 'blue',
    categories: group.types.map(type => ({
      id: `${group.id}::${type.type}`,
      name: type.type,
      count: type.equipmentIds.length,
      equipmentIds: type.equipmentIds,
    })),
  }))
}

function suggestionsFor(record: MrplEquipmentRecord): EquipmentSuggestionPrompt[] {
  const subject = equipmentSubject(record)
  const docs = [...new Set(record.citations.map(cite => cite.documentId))].join(', ')
  return [
    { id: 'what-happened', text: `What does ${docs} report about ${subject}?`, iconType: 'sparkle' },
    { id: 'lessons', text: `Summarize the lessons for ${record.type.toLowerCase()} like ${subject}`, iconType: 'sparkle' },
    { id: 'related', text: `Find related documents for ${subject}`, iconType: 'document' },
  ]
}

export function EquipmentPage({
  onOpenPid,
  onOpenDocuments,
  onOpenCitation,
  onNewInvestigation,
  onAskEquipment,
}: EquipmentPageProps) {
  const source = useMrplSource()
  const equipment = useMrplResource(
    signal => source.getEquipment(signal),
    data => data.equipment.length === 0,
    'equipment',
  )
  const catalog = useMrplResource(signal => source.listDocuments(signal), () => false, 'catalog')
  const [selection, setSelection] = useState<{ unitId: string; categoryId: string; equipmentId: string } | undefined>(undefined)
  const [browserCollapsed, setBrowserCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const units = useMemo(() => (equipment.status === 'ready' ? toUnitGroups(equipment.data) : []), [equipment])
  const records = useMemo(
    () => new Map((equipment.status === 'ready' ? equipment.data.equipment : []).map(item => [item.id, item])),
    [equipment],
  )
  const documentTitles = useMemo(
    () => new Map(catalog.status === 'ready' ? catalog.data.documents.map(doc => [doc.id, doc.title]) : []),
    [catalog],
  )
  const documentMeta = useMemo(
    () => new Map(catalog.status === 'ready' ? catalog.data.documents.map(doc => [doc.id, doc]) : []),
    [catalog],
  )

  // Header search filters the tree by tag/name/type/unit.
  const query = searchQuery.trim().toLowerCase()
  const visibleUnits = useMemo(() => {
    if (query === '') return units
    return units.flatMap((unit) => {
      const categories = unit.categories.flatMap((category) => {
        const ids = (category.equipmentIds ?? []).filter((id) => {
          const item = records.get(id)
          return item !== undefined && [item.tag ?? '', item.name, item.type, item.unit, item.facility, item.service]
            .some(value => value.toLowerCase().includes(query))
        })
        return ids.length === 0 ? [] : [{ ...category, count: ids.length, equipmentIds: ids }]
      })
      return categories.length === 0 ? [] : [{ ...unit, count: categories.reduce((n, c) => n + c.count, 0), categories }]
    })
  }, [units, records, query])

  const firstUnit = visibleUnits[0]
  const firstCategory = firstUnit?.categories[0]
  const active = (() => {
    if (selection !== undefined) {
      const unit = visibleUnits.find(candidate => candidate.id === selection.unitId)
      const category = unit?.categories.find(candidate => candidate.id === selection.categoryId)
      if (unit !== undefined && category !== undefined && (category.equipmentIds ?? []).includes(selection.equipmentId)) {
        return { unit, category, id: selection.equipmentId }
      }
    }
    if (firstUnit === undefined || firstCategory === undefined) return undefined
    return { unit: firstUnit, category: firstCategory, id: firstCategory.equipmentIds?.[0] ?? '' }
  })()
  const selected = active === undefined ? undefined : records.get(active.id)
  const siblings = active === undefined
    ? []
    : (active.category.equipmentIds ?? []).flatMap(id => records.get(id) ?? [])

  const connected: ConnectedDocument[] = selected === undefined
    ? []
    : [...new Map(selected.citations.map(cite => [cite.documentId, cite])).values()].map((cite) => {
      const meta = documentMeta.get(cite.documentId)
      return {
        id: cite.documentId,
        name: meta?.fileName ?? cite.documentId,
        type: meta?.docType ?? 'Document',
        date: meta?.date ?? '—',
        iconColor: 'red',
        ...(meta?.sourceUrl == null ? {} : { url: meta.sourceUrl }),
      }
    })

  const shell = (body: ReactNode) => (
    <div className={`${css.pageRoot} ${workbenchTokensClass}`} data-hide-composer="" role="region" aria-label="Equipment Workspace">
      <EquipmentHeader
        title="Equipment"
        subtitle="Equipment named in public incident and investigation reports • Source-cited"
        breadcrumb={['Plant', 'Equipment']}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterClick={() => {
          setSearchQuery('')
        }}
        onNewInvestigation={() => onNewInvestigation?.(selected)}
        badge={equipment.status === 'ready' || equipment.status === 'empty' ? <DatasetBadge dataset={equipment.data.dataset} /> : undefined}
      />
      {body}
    </div>
  )

  if (equipment.status === 'loading') return shell(<WorkbenchState kind="loading" label="Equipment" />)
  if (equipment.status === 'error') {
    return shell(<WorkbenchState kind="error" label="Equipment" error={equipment.error} onRetry={equipment.retry} />)
  }
  if (equipment.status === 'empty') {
    return shell(
      <WorkbenchState
        kind="empty"
        label="Equipment"
        title="No equipment records"
        detail="The document store has no equipment/equipment.json. Equipment appears here only when a source document names it."
      />,
    )
  }

  return shell(
    <main className={css.workspaceMain}>
      <section className={css.upperSection} aria-label="Equipment Information">
        {!browserCollapsed && (
          visibleUnits.length === 0 ? (
            <WorkbenchState kind="empty" label="Equipment" title="No equipment matches" detail="Clear the search to see every record." compact />
          ) : (
            <EquipmentBrowser
              key={query}
              units={visibleUnits}
              selectedUnitId={active?.unit.id ?? ''}
              selectedCategoryId={active?.category.id ?? ''}
              onSelectCategory={(unitId, categoryId) => {
                const category = visibleUnits.find(unit => unit.id === unitId)?.categories.find(cat => cat.id === categoryId)
                const first = category?.equipmentIds?.[0]
                if (first !== undefined) setSelection({ unitId, categoryId, equipmentId: first })
              }}
              onCollapse={() => {
                setBrowserCollapsed(true)
              }}
            />
          )
        )}
        {selected === undefined || active === undefined ? (
          <WorkbenchState kind="empty" label="Equipment" title="Select equipment" detail="Pick a category in the browser." />
        ) : (
          <EquipmentDetail
            equipment={selected}
            documentTitles={documentTitles}
            siblings={siblings}
            onSelectSibling={(id) => {
              setSelection({ unitId: active.unit.id, categoryId: active.category.id, equipmentId: id })
            }}
            onViewPid={() => onOpenPid?.(selected)}
            onOpenDocuments={() => onOpenDocuments?.(selected)}
            onOpenCitation={onOpenCitation}
          />
        )}
      </section>

      {selected !== undefined && (
        <section className={css.lowerSection} aria-label="Equipment Documentation and Assistance">
          <ConnectedDocuments
            documents={connected}
            onViewAll={() => onOpenDocuments?.(selected)}
            onOpenDocument={(doc) => {
              if (doc.url !== undefined) window.open(doc.url, '_blank', 'noopener')
            }}
          />
          <AskHyperionPanel
            key={selected.id}
            subject={equipmentSubject(selected)}
            suggestions={suggestionsFor(selected)}
            onAskEquipment={onAskEquipment}
          />
        </section>
      )}
    </main>,
  )
}
