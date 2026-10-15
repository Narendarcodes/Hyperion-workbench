/**
 * useInvestigationContext: Equipment Context and Related Documents for the open
 * investigation record, read through the MRPL source — the equipment record whose
 * tag matches the investigation's (`/hyperion/mrpl/equipment`), evidence search for
 * the tag (`/hyperion/mrpl/evidence/search`), document titles from the catalog
 * (`/hyperion/mrpl/documents`) and the citations of the investigation's analysis.
 * A source without a route, or a failing route, yields an empty result (the UI
 * shows a labelled empty state), never fixture data.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/useInvestigationContext
 */

import { useEffect, useMemo, useState } from 'react'
import { useMrplSource } from '../mrpl/api.ts'
import type { MrplAnswerCitation, MrplDocumentSummary, MrplEquipmentRecord, MrplRetrievedPassage } from '../mrpl/contract.ts'
import { investigationsConfig } from './config.ts'

export interface RecordEquipment {
  readonly tag: string
  readonly name: string
  readonly type: string
  readonly unit: string
  readonly facility: string
  readonly service: string
}

export type RelatedDocumentProvenance = 'equipment' | 'evidence' | 'analysis'

export interface RelatedDocument {
  readonly documentId: string
  readonly page: number
  readonly title: string
  readonly provenance: RelatedDocumentProvenance
}

export type ContextPhase<T> = { readonly state: 'loading' } | { readonly state: 'ready'; readonly value: T }

export interface InvestigationContextState {
  readonly tag: string
  readonly equipment: ContextPhase<RecordEquipment | null>
  readonly documents: ContextPhase<readonly RelatedDocument[]>
}

/** Tag comparison ignoring case, spaces and hyphens ("e 6600-e" = "E-6600E"). */
export function normaliseTag(tag: string): string {
  return tag.toUpperCase().replace(/[\s\-_]/g, '')
}

export function findEquipmentByTag(equipment: readonly MrplEquipmentRecord[], tag: string): MrplEquipmentRecord | undefined {
  const want = normaliseTag(tag)
  if (want === '') return undefined
  return equipment.find(e => e.tag !== null && normaliseTag(e.tag) === want)
}

/** Ordered, de-duplicated (one row per document) related documents. */
export function mergeRelatedDocuments(
  sources: {
    readonly provenance: RelatedDocumentProvenance
    readonly refs: readonly { readonly documentId: string; readonly page: number }[]
  }[],
  catalog: ReadonlyMap<string, string>,
  max: number,
): RelatedDocument[] {
  const out: RelatedDocument[] = []
  const seen = new Set<string>()
  for (const { provenance, refs } of sources) {
    for (const r of refs) {
      if (seen.has(r.documentId)) continue
      seen.add(r.documentId)
      out.push({ documentId: r.documentId, page: r.page, title: catalog.get(r.documentId) ?? r.documentId, provenance })
    }
  }
  return out.slice(0, Math.max(0, max))
}

interface Loaded {
  readonly key: string
  readonly equipment: MrplEquipmentRecord | null
  readonly passages: readonly MrplRetrievedPassage[]
  readonly catalog: ReadonlyMap<string, string>
}

async function settle<T>(run: (() => Promise<T>) | undefined): Promise<T | undefined> {
  if (run === undefined) return undefined
  try {
    return await run()
  } catch (error) {
    if ((error as { name?: unknown }).name === 'AbortError') throw error
    return undefined
  }
}

export function useInvestigationContext(
  inv: { readonly tag: string; readonly title: string } | null,
  analysisCitations: readonly MrplAnswerCitation[],
): InvestigationContextState | null {
  const source = useMrplSource()
  const tag = inv?.tag ?? null
  const title = inv?.title ?? ''
  const key = tag === null ? '' : `${tag}\u0000${title}`
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (tag === null) return undefined
    const ctl = new AbortController()
    const cfg = investigationsConfig().context
    const getEquipment = typeof source.getEquipment === 'function' ? () => source.getEquipment(ctl.signal) : undefined
    const search = typeof source.searchEvidence === 'function'
      ? () => source.searchEvidence(cfg.documentsQuery({ tag, title }), { limit: cfg.documentsSearchLimit }, ctl.signal)
      : undefined
    const list = typeof source.listDocuments === 'function' ? () => source.listDocuments(ctl.signal) : undefined
    Promise.all([settle(getEquipment), settle(search), settle(list)])
      .then(([eq, found, docs]) => {
        if (ctl.signal.aborted) return
        const catalog = new Map<string, string>((docs?.documents ?? []).map((d: MrplDocumentSummary) => [d.id, d.title]))
        setLoaded({
          key,
          equipment: findEquipmentByTag(eq?.equipment ?? [], tag) ?? null,
          passages: found?.passages ?? [],
          catalog,
        })
      })
      .catch(() => { /* aborted */ })
    return () => { ctl.abort() }
  }, [source, key, tag, title])

  return useMemo(() => {
    if (tag === null) return null
    if (loaded?.key !== key) return { tag, equipment: { state: 'loading' }, documents: { state: 'loading' } }
    const cfg = investigationsConfig().context
    const eq = loaded.equipment
    const documents = mergeRelatedDocuments([
      { provenance: 'equipment', refs: eq?.citations ?? [] },
      { provenance: 'evidence', refs: loaded.passages },
      { provenance: 'analysis', refs: analysisCitations },
    ], loaded.catalog, cfg.documentsMax)
    const equipment: RecordEquipment | null = eq === null ? null : {
      tag: eq.tag ?? tag, name: eq.name, type: eq.type, unit: eq.unit, facility: eq.facility, service: eq.service,
    }
    return { tag, equipment: { state: 'ready', value: equipment }, documents: { state: 'ready', value: documents } }
  }, [tag, key, loaded, analysisCitations])
}
