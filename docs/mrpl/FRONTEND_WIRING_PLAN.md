# MRPL frontend consistency + backend wiring — audit and plan

Branch `feat/mrpl-frontend-wiring` (base `mrpl/integration` @ 86bc38a5). Sections 1–3 are the
original audit/plan; section 4 records what was implemented. Labels: **verified** = read in code on this base;
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

## 4. Implementation status (verified = in code + tests on this branch)

### Backend (`packages/host/hyperion-bridge`)
- **verified** Typed contract in `src/shared.ts` (`Mrpl*` types, 7 route constants under `/hyperion/mrpl`).
- **verified** File-backed store `src/mrpl-store.ts` reading the refinery-corpus layout
  (`manifest/documents.json`, `corpus/processed/<DOC>.json`, `equipment/equipment.json`, `deliverables/`).
  Default store = bundled `mrpl-seed/` built by `scripts/build_mrpl_seed.py` from the public refinery
  corpus (13 documents; DOC-011 is OCR-pending; DOC-012 limited to Ch.7 pp. 558–590). Every payload
  carries `dataset` = `public-sample` ("Public sample data … Not MRPL plant records").
  `HYPERION_MRPL_CORPUS_DIR` or config `mrplCorpusDir` points it at another corpus (`kind: configured`).
- **verified** Routes `src/mrpl-routes.ts`: `GET documents`, `GET documents/<id>`, `GET documents/<id>/text?page=N`,
  `GET equipment`, `POST evidence/verify`, `GET evidence/search`, `GET deliverables[/<file>]`. Same
  connection fence, `no-store`, 404 unknown ids/pages, 415/413/400 wire validation, 503 unreadable store.
- **verified** Citation verification: a citation is `verified` only when every quote appears on the cited
  page's text (whitespace/case-insensitive; numeric quotes compared as numbers). Other outcomes:
  `unverified`, `page-not-found`, `document-not-found`, `no-text`. Equipment tags are only kept when
  their cited quote verifies.
- **verified** RAG seam: `MrplRetrievalProvider` (`retrieve(query, { documentIds, limit })`), provided as
  composition service `mrplRetrieval`. Unset → `evidence/search` answers `retrieval: 'not-configured'`.
  Verification never depends on the retriever. No RAG code lands here.

### Client
- **verified** `ui-conversation/src/client/mrpl/`: contract mirror (drift-tested against the host file),
  `createHttpMrplSource` + `MrplSourceProvider`/`useMrplSource`, `useMrplResource`
  (loading/ready/empty/error + retry), shared `WorkbenchState`, `StatusChip`, `DatasetBadge`, and
  workbench tokens (`--hx-space-*` 4/8/12/16/24/32, `--hx-radius-s/m` 8/10, card surface on `--dsw-*`).
- **verified** Removed: `documents/mockData.ts`, `documents/corpusText.ts` (embedded page text),
  `equipment/mockData.ts` (fake P-101 asset, telemetry, activity, synthesized `XX-102` tags),
  `PerformancePanel`, `RecentEquipmentActivity`, `reports/deliverables.ts`, `apps/web/public/deliverables/*`
  (now served by the host from the seed).
- **verified** Documents, Equipment, Reports deliverables strip and the chat Evidence card read through the
  data source; each has loading / empty / error (+ retry). Evidence status = host verification roll-up
  (`Verified` / `Partially verified (n/m)` / `Not verified` / `Verification unavailable` / `No citations to check`).

### Consistency audit — Agent presets, chat, Mission (verified by grep on this branch)
| Package | Literal hex in CSS | `--dsw-*` uses | Distinct px radii |
|---|---|---|---|
| ui-agent-preset | 0 | 65 | 6 7 8 10 15 16 20 999 |
| ui-chat | 6 | 144 | 1 2 3 6 8 10 12 14 16 18 22 28 100 999 |
| ui-mission | 46 (+47 rgba) | 0 | 4 6 7 8 10 12 20 |
| new mrpl/ shared set | 0 | 20 | 6 999 (rest via `--hx-radius-*`) |

- Agent presets: fully on theme tokens; radius scale is wide but token-backed colours — **no change**.
- Chat: token-based; the Evidence card now uses the shared `StatusChip` — **changed** (only the card).
- Mission: no `--dsw-*` tokens at all (hard-coded palette, pixel-office canvas colours) — **unresolved,
  not changed here**: `ui-mission` is being edited concurrently by the mission-sim stream; migrating
  it to `--dsw-*`/`--hx-*` is proposed as a follow-up on that branch to avoid a conflicting edit.
- Remaining MRPL screen CSS (documents/equipment/reports) still carries many literal hex values from the
  original mock-ups (166/247/165); only new/changed parts use the tokens — **proposed** follow-up sweep.

### Still unresolved
- Live equipment telemetry: no source exists; the UI says "Not connected" rather than drawing numbers.
- Reports page "Report Library"/summary cards remain the labelled demo fixture (`reports/mockData.ts`).
- P&ID view, Plant overview and Investigations still use their own fixtures (out of this PR's scope).
