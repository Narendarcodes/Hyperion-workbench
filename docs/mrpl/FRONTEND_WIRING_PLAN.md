# MRPL frontend consistency + backend wiring — audit and plan

Branch `feat/mrpl-frontend-wiring` (base `mrpl/integration` @ 86bc38a5). Work in progress; this
document is the first commit so the PR exists. Labels: **verified** = read in code on this base;
**proposed** = planned change, not yet implemented; **unresolved** = open question.

## 1. Screen audit (verified, from source on 86bc38a5)

| Screen | Source | Data today | States today |
|---|---|---|---|
| Documents | `packages/client/ui-conversation/src/client/documents/*` | `mockData.ts` (13 corpus records, `DOCUMENT_CATEGORIES`, `MOCK_DOCUMENTS`) + embedded page text in `corpusText.ts`, imported synchronously by `DocumentsOverview.tsx` | Only an inline "No documents" `role=status`; no loading/error; filter/upload buttons are `console.info` |
| Equipment | `.../equipment/*` | `DEFAULT_EQUIPMENT_DATA` in `equipment/mockData.ts` held in `useState`; category clicks synthesize fake tags (`XX-102`) | No loading/empty/error; most actions `console.info` |
| Evidence card (chat) | `packages/client/ui-chat/src/client/chat/MrplEvidenceCard.tsx`, `mrplEvidence.ts` | Fixed demo copy (`DOC-010`, `Page 1–2`, artifact name) triggered by prose signatures; file header says "No backend evidence service exists behind it" | Always "Verified" — no pending/unverified/error state |
| Deliverables | `.../reports/deliverables.ts`, `ReportsOverview.tsx`, `ui-deliverables` | Static `GENERATED_DELIVERABLES` list pointing at `apps/web/public/deliverables/*` | Reports page has no loading/empty/error (per `UX_UI_AUDIT_REPORT.md` §10) |
| Agent presets / chat / mission | `ui-agent-preset`, `ui-chat`, `ui-mission` | Not yet audited in detail | — |

Existing host routes (`packages/host/hyperion-bridge/src/shared.ts`, verified): `/hyperion/health`,
`/state`, `/registry`, `/skills`, `/telemetry`, `/chat`, `/turn`, `/files/<name>.xlsx`. None serve
documents, equipment, evidence or deliverables. All routes sit behind `connection.requestRejection`
(Host/Origin fence + browser-session cookie), so same-origin browser `fetch` is the right client.

Design-system debt carried from `UX_UI_AUDIT_REPORT.md` (verified there, still open): no spacing
token scale; page-card radii 6/8/10/12; Reports literal palette/radii; per-page empty/loading/error
states missing; Documents "throw-if-empty". Note: `packages/client/ui-brand-official` only fills the
sidebar mark/name slots — the actual tokens live in `ui-theme` (`--dsw-*`).

## 2. Plan (proposed)

1. **Typed contract** in `packages/host/hyperion-bridge/src/shared.ts` (already the browser-shared
   module): `MrplDocumentSummary`, `MrplDocumentDetail` (+pages), `MrplEquipmentWorkspace`,
   `MrplCitation`/`MrplEvidence`, `MrplDeliverable`, list envelopes, and route constants under
   `/hyperion/mrpl/{documents,documents/<id>,equipment,evidence,deliverables}`.
2. **Host routes** in hyperion-bridge serving the corpus catalog (moved out of the client bundle),
   same trust fence, `no-store`, 404 for unknown ids, tests in `tests/host-routes.spec.ts`.
3. **RAG seam (not implemented)**: a named `MrplRetrievalProvider` interface
   (`retrieve(query, { documentIds?, limit }) → MrplCitation[]`) with a catalog-only default that
   returns no citations and marks evidence `retrieval: 'not-configured'`. `feat/rag-embeddinggemma2`
   plugs in by providing the service; no RAG code lands here.
4. **Client**: one `mrplApi` fetch client + `useMrplResource` hook (`loading | ready | empty | error`),
   injectable data source so unit tests use fixtures; replace `mockData.ts` imports in Documents,
   Equipment, Reports/deliverables, Evidence card.
5. **Shared UI set**: workbench tokens (spacing 4/8/12/16/24/32, radius 8/10, card surface =
   `bg-layer-1 + border-l2 + elevation-panel`), `StatusChip`, `WorkbenchState`
   (loading skeleton / empty / error + retry) used on every MRPL screen.
6. **Tests**: unit specs per screen (fixture source), host route specs, Playwright smoke per screen
   against a harness with `page.route` fixtures; before/after screenshots.

## 3. Unresolved

- Whether a real `refinery-corpus/` directory should be read at runtime (config field) instead of the
  bundled catalog — not present in this repo.
- Live equipment telemetry has no backend source; the equipment route will serve the static
  workspace record, labelled as such.
