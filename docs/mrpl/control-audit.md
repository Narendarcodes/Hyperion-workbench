# Control audit — every button in the MRPL surfaces

Method: TypeScript-AST scan of every `<button>`, `<a href>`, `role="button"` and `*Button` element in the MRPL client surfaces (`audit/scan_buttons.mjs`), then resolution of each callback prop through the parents that pass it (`audit/resolve.mjs`), then hand correction where a prop name collides across components (`audit/report.py`, OVERRIDE table). Branch head at audit time: b3e55cf5.

- **REAL** = reaches a live backend or a real file/URL (verified by the live e2e where noted).
- **WIRED** = does something meaningful in the app (navigates to another workbench view, prefills the agent composer, opens a verification view) but has no dedicated backend of its own.
- **LOCAL** = changes local view state only (tabs, sort, zoom, pagination, collapse). Works; nothing persists.
- **DEAD** = no handler, a no-op, a `console.info` stub, or a callback no parent passes.

Caveat: static analysis + targeted reading, not a click-through of all 224 controls. Rows marked [verify] are inferred.

## Summary by surface

| surface | total | REAL | WIRED | LOCAL | DEAD |
|---|---|---|---|---|---|
| Documents | 49 | 6 | 6 | 24 | 13 |
| Equipment | 20 | 2 | 7 | 7 | 4 |
| Composer | 10 | 5 | 2 | 3 | 0 |
| Chat evidence | 1 | 1 | 0 | 0 | 0 |
| MRPL workbench shell | 1 | 1 | 0 | 0 | 0 |
| Mission | 11 | 0 | 3 | 8 | 0 |
| Reports | 36 | 2 | 0 | 0 | 34 |
| P&ID | 21 | 1 | 3 | 17 | 0 |
| Plant overview | 18 | 0 | 7 | 4 | 7 |
| Investigations | 57 | 0 | 6 | 23 | 28 |
| **all** | **224** | **18** | **34** | **86** | **86** |

## REAL controls

| control | where | what it does |
|---|---|---|
| {document.sourceOrg ?? document.uploadedBy} | `ui-conversation/src/client/documents/DocumentDetailsPanel.tsx:221` | Source link -> public corpus source URL |
| Download | `ui-conversation/src/client/documents/DocumentDetailsPanel.tsx:261` | Download -> opens the public corpus source URL |
| Download document | `ui-conversation/src/client/documents/DocumentViewerPanel.tsx:180` | Download -> opens the public corpus source URL |
| Open original source ( {document.sourceOrg ?? document.uploa | `ui-conversation/src/client/documents/DocumentViewerPanel.tsx:240` | Open original source -> public corpus source URL |
| Upload Document | `ui-conversation/src/client/documents/DocumentsHeader.tsx:90` | Upload Document -> POST /hyperion/mrpl/documents -> RAG ingest job (live e2e) |
| {ask.kind === 'asking' ? 'Asking…' : 'Ask'} | `ui-conversation/src/client/documents/UploadAskPanel.tsx:138` | Ask -> /hyperion/mrpl/answer -> live RAG cited answer (live e2e) |
| {doc.name} | `ui-conversation/src/client/equipment/ConnectedDocuments.tsx:71` | opens the public source URL of the document |
| Open $doc.name in new tab | `ui-conversation/src/client/equipment/ConnectedDocuments.tsx:89` | opens the public source URL of the document |
| Retry | `ui-conversation/src/client/mrpl/Workbench.tsx:63` | Retry -> refetch the /hyperion/mrpl/* route that failed |
| Ask Hyperion about this P&ID | `ui-conversation/src/client/pid/PIDView.tsx:92` | Ask Hyperion about this P&ID -> prefills the agent composer |
| {item.format === 'PDF' ? 'Preview' : 'Open'} | `ui-conversation/src/client/reports/DeliverablesStrip.tsx:63` | Preview/Open -> /hyperion/mrpl deliverable href (bridge-served file) |
| Download | `ui-conversation/src/client/reports/DeliverablesStrip.tsx:66` | Download -> bridge-served deliverable |
| t('voice.record') | `ui-conversation/src/client/skeleton/InputBar.tsx:629` | Mic record -> MediaRecorder -> /hyperion/asr/transcribe (live e2e via harness) |
| t('input.stop') | `ui-conversation/src/client/skeleton/InputBar.tsx:710` | Stop the agent turn |
| {primaryStops ? ( ) : ( )} | `ui-conversation/src/client/skeleton/InputBar.tsx:725` | Send / stop the agent turn (session runtime) |
| t('voice.stop') | `ui-conversation/src/client/skeleton/InputBar.tsx:764` | Mic stop -> transcribe |
| primaryLabel | `ui-conversation/src/client/skeleton/InputBar.tsx:774` | Mic primary (stop+transcribe) |
| {t('evidence.retry')} | `ui-chat/src/client/chat/MrplEvidenceCard.tsx:156` | Retry evidence verification against /hyperion/mrpl evidence routes |

## DEAD controls (nothing happens)

| surface | control | where | why |
|---|---|---|---|
| Documents | Compare Version | `ui-conversation/src/client/documents/DocumentDetailsPanel.tsx:286` | prop onCompareVersion (passed by a parent) (default no-op when host does not pass it) |
| Documents | Add attachment | `ui-conversation/src/client/documents/DocumentDetailsPanel.tsx:386` | no onClick |
| Documents | Attach file | `ui-conversation/src/client/documents/DocumentDetailsPanel.tsx:392` | no onClick |
| Documents | @ Context | `ui-conversation/src/client/documents/DocumentDetailsPanel.tsx:397` | no onClick |
| Documents | ✨ Skill | `ui-conversation/src/client/documents/DocumentDetailsPanel.tsx:400` | no onClick |
| Documents | ⚙ Auto ▾ | `ui-conversation/src/client/documents/DocumentDetailsPanel.tsx:403` | no onClick |
| Documents | Unit | `ui-conversation/src/client/documents/DocumentLibraryPanel.tsx:199` | no onClick |
| Documents | Equipment | `ui-conversation/src/client/documents/DocumentLibraryPanel.tsx:205` | no onClick |
| Documents | Document Type | `ui-conversation/src/client/documents/DocumentLibraryPanel.tsx:211` | no onClick |
| Documents | Tag | `ui-conversation/src/client/documents/DocumentLibraryPanel.tsx:217` | no onClick |
| Documents | Sort and filter options | `ui-conversation/src/client/documents/DocumentLibraryPanel.tsx:224` | no onClick |
| Documents | Search inside document | `ui-conversation/src/client/documents/DocumentViewerPanel.tsx:120` | no onClick |
| Documents | Export or share | `ui-conversation/src/client/documents/DocumentViewerPanel.tsx:193` | no onClick |
| Equipment | Add action or file | `ui-conversation/src/client/equipment/AskHyperionPanel.tsx:129` | no onClick |
| Equipment | Attach file | `ui-conversation/src/client/equipment/AskHyperionPanel.tsx:137` | no onClick |
| Equipment | Auto | `ui-conversation/src/client/equipment/AskHyperionPanel.tsx:166` | no onClick |
| Equipment | Options for $doc.name | `ui-conversation/src/client/equipment/ConnectedDocuments.tsx:98` | no onClick |
| Reports | Filter | `ui-conversation/src/client/reports/ReportsOverview.tsx:56` | no onClick |
| Reports | + Generate Report | `ui-conversation/src/client/reports/ReportsOverview.tsx:79` | no onClick |
| Reports | Grid view | `ui-conversation/src/client/reports/ReportsOverview.tsx:121` | no onClick |
| Reports | List view | `ui-conversation/src/client/reports/ReportsOverview.tsx:136` | no onClick |
| Reports | All (98) | `ui-conversation/src/client/reports/ReportsOverview.tsx:157` | no onClick |
| Reports | Investigation Reports (42) | `ui-conversation/src/client/reports/ReportsOverview.tsx:160` | no onClick |
| Reports | Analysis Reports (18) | `ui-conversation/src/client/reports/ReportsOverview.tsx:161` | no onClick |
| Reports | Compliance (12) | `ui-conversation/src/client/reports/ReportsOverview.tsx:162` | no onClick |
| Reports | (icon) | `ui-conversation/src/client/reports/ReportsOverview.tsx:206` | no onClick |
| Reports | ⋮ | `ui-conversation/src/client/reports/ReportsOverview.tsx:283` | no onClick |
| Reports | &lt; | `ui-conversation/src/client/reports/ReportsOverview.tsx:291` | no onClick |
| Reports | 1 | `ui-conversation/src/client/reports/ReportsOverview.tsx:292` | no onClick |
| Reports | 2 | `ui-conversation/src/client/reports/ReportsOverview.tsx:293` | no onClick |
| Reports | 3 | `ui-conversation/src/client/reports/ReportsOverview.tsx:294` | no onClick |
| Reports | 4 | `ui-conversation/src/client/reports/ReportsOverview.tsx:295` | no onClick |
| Reports | 5 | `ui-conversation/src/client/reports/ReportsOverview.tsx:296` | no onClick |
| Reports | 10 | `ui-conversation/src/client/reports/ReportsOverview.tsx:298` | no onClick |
| Reports | &gt; | `ui-conversation/src/client/reports/ReportsOverview.tsx:299` | no onClick |
| Reports | {renderIcon('Share', 14)} Share | `ui-conversation/src/client/reports/ReportsOverview.tsx:359` | no onClick |
| Reports | {renderIcon('Download', 14)} Download | `ui-conversation/src/client/reports/ReportsOverview.tsx:362` | no onClick |
| Reports | ... | `ui-conversation/src/client/reports/ReportsOverview.tsx:365` | no onClick |
| Reports | Preview | `ui-conversation/src/client/reports/ReportsOverview.tsx:371` | no onClick |
| Reports | Summary | `ui-conversation/src/client/reports/ReportsOverview.tsx:374` | no onClick |
| Reports | Key Findings | `ui-conversation/src/client/reports/ReportsOverview.tsx:375` | no onClick |
| Reports | Recommendations | `ui-conversation/src/client/reports/ReportsOverview.tsx:376` | no onClick |
| Reports | Evidence | `ui-conversation/src/client/reports/ReportsOverview.tsx:377` | no onClick |
| Reports | Versions | `ui-conversation/src/client/reports/ReportsOverview.tsx:378` | no onClick |
| Reports | {renderIcon('Download', 16)} Download PDF | `ui-conversation/src/client/reports/ReportsOverview.tsx:512` | no onClick |
| Reports | {renderIcon('Share', 16)} Share Report | `ui-conversation/src/client/reports/ReportsOverview.tsx:515` | no onClick |
| Reports | {renderIcon('CreateFollowUp', 16)} Create Follow-up Investig | `ui-conversation/src/client/reports/ReportsOverview.tsx:518` | no onClick |
| Reports | {renderIcon('ExportWord', 16)} Export to Word | `ui-conversation/src/client/reports/ReportsOverview.tsx:522` | no onClick |
| Reports | {renderIcon('Table', 16)} Export Data (CSV) | `ui-conversation/src/client/reports/ReportsOverview.tsx:525` | no onClick |
| Reports | {renderIcon('Template', 16)} Set as Template | `ui-conversation/src/client/reports/ReportsOverview.tsx:528` | no onClick |
| Reports | View all → | `ui-conversation/src/client/reports/ReportsOverview.tsx:567` | link "#" |
| Plant overview | Filter | `ui-conversation/src/client/plant/PlantHeader.tsx:72` | Filter: PlantOverview passes no onFilterClick |
| Plant overview | View all units → | `ui-conversation/src/client/plant/ProcessUnits.tsx:21` | onViewAllUnits only console.info (PlantOverview) |
| Plant overview | View all activity → | `ui-conversation/src/client/plant/RecentEngineeringActivity.tsx:21` | onViewAllActivity only console.info (PlantOverview) |
| Plant overview | Equipment {unit.equipmentCount} | `ui-conversation/src/client/plant/UnitDetailsPanel.tsx:76` | prop onRowClick (passed by a parent) |
| Plant overview | Documents {unit.documentCount} | `ui-conversation/src/client/plant/UnitDetailsPanel.tsx:101` | prop onRowClick (passed by a parent) |
| Plant overview | P&IDs {unit.pidCount} | `ui-conversation/src/client/plant/UnitDetailsPanel.tsx:125` | prop onRowClick (passed by a parent) |
| Plant overview | Investigations {unit.investigationCount} | `ui-conversation/src/client/plant/UnitDetailsPanel.tsx:149` | prop onRowClick (passed by a parent) |
| Investigations | Add | `ui-conversation/src/client/investigations/AskHyperionInvestigationPanel.tsx:100` | no onClick |
| Investigations | Attach file | `ui-conversation/src/client/investigations/AskHyperionInvestigationPanel.tsx:108` | no onClick |
| Investigations | Auto | `ui-conversation/src/client/investigations/AskHyperionInvestigationPanel.tsx:137` | no onClick |
| Investigations | Edit | `ui-conversation/src/client/investigations/AskHyperionInvestigationPanel.tsx:174` | prop onEditContext (passed by a parent) |
| Investigations | Add Evidence | `ui-conversation/src/client/investigations/AskHyperionInvestigationPanel.tsx:212` | prop onQuickAction (passed by a parent) |
| Investigations | Assign to Me | `ui-conversation/src/client/investigations/AskHyperionInvestigationPanel.tsx:226` | prop onQuickAction (passed by a parent) |
| Investigations | Create Report | `ui-conversation/src/client/investigations/AskHyperionInvestigationPanel.tsx:238` | 'create-report' quick action is not handled (only 'generate-report' is) |
| Investigations | Change Status | `ui-conversation/src/client/investigations/AskHyperionInvestigationPanel.tsx:251` | prop onQuickAction (passed by a parent) |
| Investigations | More options | `ui-conversation/src/client/investigations/InvestigationDetail.tsx:200` | no onClick |
| Investigations | Edit | `ui-conversation/src/client/investigations/InvestigationDetail.tsx:249` | onEditSummary only console.info in InvestigationsPage |
| Investigations | View all → | `ui-conversation/src/client/investigations/InvestigationDetail.tsx:408` | prop onViewAllEvidence (passed by a parent) |
| Investigations | {item.name} {item.description} | `ui-conversation/src/client/investigations/InvestigationDetail.tsx:422` | prop onOpenEvidence (passed by a parent) |
| Investigations | Open $item.name | `ui-conversation/src/client/investigations/InvestigationDetail.tsx:435` | prop onOpenEvidence (passed by a parent) |
| Investigations | Options for $item.name | `ui-conversation/src/client/investigations/InvestigationDetail.tsx:444` | no onClick |
| Investigations | Filter options | `ui-conversation/src/client/investigations/InvestigationList.tsx:137` | no onClick |
| Investigations | Filter | `ui-conversation/src/client/investigations/InvestigationsHeader.tsx:82` | Filter only console.info (InvestigationsPage) |
| Investigations | Add action or file | `ui-conversation/src/client/investigations/PersistentComposer.tsx:66` | no onClick |
| Investigations | Attach file | `ui-conversation/src/client/investigations/PersistentComposer.tsx:75` | no onClick |
| Investigations | Auto | `ui-conversation/src/client/investigations/PersistentComposer.tsx:121` | no onClick |
| Investigations | Ask Hyperion | `ui-conversation/src/client/investigations/RightContextColumn.tsx:142` | quick action 'ask-hyperion' -> handleQuickAction only logs (console.info) except generate-report |
| Investigations | Compare with Similar | `ui-conversation/src/client/investigations/RightContextColumn.tsx:155` | prop onQuickAction (passed by a parent) |
| Investigations | Open in P&ID | `ui-conversation/src/client/investigations/RightContextColumn.tsx:170` | prop onQuickAction (passed by a parent) |
| Investigations | Create Work Order | `ui-conversation/src/client/investigations/RightContextColumn.tsx:186` | prop onQuickAction (passed by a parent) |
| Investigations | {doc.name} {doc.description} | `ui-conversation/src/client/investigations/RightContextColumn.tsx:237` | handleOpenDoc only console.info (InvestigationDetailView) |
| Investigations | Open $doc.name | `ui-conversation/src/client/investigations/RightContextColumn.tsx:250` | handleOpenDoc only console.info (InvestigationDetailView) |
| Investigations | More options for $doc.name | `ui-conversation/src/client/investigations/RightContextColumn.tsx:259` | no onClick |
| Investigations | View all → | `ui-conversation/src/client/investigations/RightContextColumn.tsx:277` | prop onViewAllSimilar never passed by any parent |
| Investigations | {item.tag} {item.name} • {item.unit} {item.metric} {item.sta | `ui-conversation/src/client/investigations/RightContextColumn.tsx:290` | prop onSelectSimilarEquipment (passed by a parent) |

## WIRED controls

| surface | control | where | how |
|---|---|---|---|
| Documents | {renderCategoryIcon(cat.iconType)} {cat.title} {cat.count.to | `ui-conversation/src/client/documents/CategoryCards.tsx:87` | prop onSelectCategory (passed by a parent) |
| Documents | Open Full Screen | `ui-conversation/src/client/documents/DocumentDetailsPanel.tsx:250` | prop onOpenFullscreen (passed by a parent) |
| Documents | Add to Investigation | `ui-conversation/src/client/documents/DocumentDetailsPanel.tsx:274` | Add to Investigation -> prefills composer (ConversationRoot) |
| Documents | Actions for $doc.name | `ui-conversation/src/client/documents/DocumentLibraryPanel.tsx:287` | handler |
| Documents | Close document viewer | `ui-conversation/src/client/documents/DocumentViewerPanel.tsx:74` | prop onClose (passed by a parent) |
| Documents | Fullscreen | `ui-conversation/src/client/documents/DocumentViewerPanel.tsx:165` | prop onOpenFullscreen (passed by a parent) |
| Equipment | View all → | `ui-conversation/src/client/equipment/ConnectedDocuments.tsx:47` | View all -> Documents for the selected equipment |
| Equipment | {isSelected ? ( ) : ( )} {category.name} ({category.count}) | `ui-conversation/src/client/equipment/EquipmentBrowser.tsx:199` | prop onSelectCategory (passed by a parent) |
| Equipment | View on P&ID | `ui-conversation/src/client/equipment/EquipmentDetail.tsx:70` | prop onViewPid (passed by a parent) |
| Equipment | Open Documents | `ui-conversation/src/client/equipment/EquipmentDetail.tsx:73` | prop onOpenDocuments (passed by a parent) |
| Equipment | {equipmentSubject(item)} | `ui-conversation/src/client/equipment/EquipmentDetail.tsx:82` | prop onSelectSibling (passed by a parent) |
| Equipment | {`${cite.documentId} · p. ${String(cite.page)}`} | `ui-conversation/src/client/equipment/EquipmentDetail.tsx:141` | prop onOpenCitation (passed by a parent) |
| Equipment | New Investigation | `ui-conversation/src/client/equipment/EquipmentHeader.tsx:107` | prop onNewInvestigation (passed by a parent) |
| Composer | t('input.commands') | `ui-conversation/src/client/skeleton/InputBar.tsx:599` | command menu toggle (InputBar-local function) |
| Composer | t('voice.discard') | `ui-conversation/src/client/skeleton/InputBar.tsx:750` | discard voice clip (InputBar-local) |
| Mission | {t('verification.banner', { tool: pendingVerif.title ?? 'Ope | `ui-mission/src/client/MissionView.tsx:148` | opens the verification view |
| Mission | {t('verification.action')} | `ui-mission/src/client/MissionView.tsx:156` | inside the clickable verification banner (banner handles the click) |
| Mission | Back to live | `ui-mission/src/client/pixel-office/lifecycle/LifecycleReplayBar.tsx:192` | handler |
| P&ID | View all → | `ui-conversation/src/client/pid/BottomCards.tsx:102` | prop onViewAllDocuments (passed by a parent) |
| P&ID | {doc.fileName} {doc.type} · {doc.date} | `ui-conversation/src/client/pid/BottomCards.tsx:109` | onOpenDocument passed through from the host |
| P&ID | Start Investigation | `ui-conversation/src/client/pid/EquipmentContextPanel.tsx:172` | prop onStartInvestigation (passed by a parent) |
| Plant overview | {activity.title} {activity.unit} · {activity.category} {acti | `ui-conversation/src/client/plant/ActivityItem.tsx:47` | handler |
| Plant overview | Expand map to fullscreen | `ui-conversation/src/client/plant/EngineeringPlantMap.tsx:78` | prop onFullscreen (passed by a parent) |
| Plant overview | {metric.value} {metric.label} {metric.description} | `ui-conversation/src/client/plant/MetricCard.tsx:52` | handler |
| Plant overview | Open P&ID | `ui-conversation/src/client/plant/PlantHeader.tsx:85` | prop onOpenPid (passed by a parent) |
| Plant overview | {unit.code} {unit.description} {unit.equipmentCount} equipme | `ui-conversation/src/client/plant/ProcessUnitCard.tsx:52` | handler |
| Plant overview | Open Unit → | `ui-conversation/src/client/plant/UnitDetailsPanel.tsx:173` | prop onOpenUnit (passed by a parent) |
| Plant overview | ⊕ Start Investigation | `ui-conversation/src/client/plant/UnitDetailsPanel.tsx:182` | prop onStartInvestigation (passed by a parent) |
| Investigations | Rerun | `ui-conversation/src/client/investigations/AnalysisWorkspace.tsx:308` | Rerun -> prefills composer with the open investigation tag |
| Investigations | Open | `ui-conversation/src/client/investigations/InvestigationDetail.tsx:192` | prop onOpenStatus (passed by a parent) |
| Investigations | Options for $item.code | `ui-conversation/src/client/investigations/InvestigationList.tsx:228` | handler |
| Investigations | New Investigation | `ui-conversation/src/client/investigations/InvestigationsHeader.tsx:102` | prop onNewInvestigation (passed by a parent) |
| Investigations | Generate Report | `ui-conversation/src/client/investigations/RightContextColumn.tsx:202` | generate-report quick action -> prefills composer |
| Investigations | View all → | `ui-conversation/src/client/investigations/RightContextColumn.tsx:224` | prop onViewAllDocuments (passed by a parent) |

LOCAL controls (86) are listed in `audit/buttons_final.json`.

## Surfaces that are still fixtures (not live)

| surface | data source today | what is live on it |
|---|---|---|
| Reports (`reports/ReportsOverview.tsx`) | inline JSX + `reports/mockData.ts`: tab counts (All 98 / 42 / 18 / 12), the P-204 vibration report, pagination | only the Deliverables strip (bridge-served files via `/hyperion/mrpl` deliverables); 34 of 36 controls are dead |
| P&ID (`pid/pidData.ts`, `pid/pidStore.ts`) | static drawing data in the client store | "Ask Hyperion about this P&ID" prefills the agent composer; no P&ID ingest/vision pipeline behind it |
| Plant overview (`plant/mockData.ts`, `DEFAULT_PLANT_OVERVIEW_DATA`) | static units, metrics, activity | navigation only; "View all units/activity" are `console.info` stubs |
| Investigations (`investigations/mockData.ts`, `DEFAULT_ANALYSIS_DETAIL_DATA`) | static INV-2024-00x records, P-204 analysis, evidence list | Share / Change status / Generate report / Rerun prefill the composer with the open record's code/tag (fixed in b3e55cf5); quick actions other than generate-report, evidence opening and similar-equipment are stubs |

Live today: Documents (public refinery-corpus seed via `/hyperion/mrpl/*`, upload → OCR → incremental index → cited answer), Equipment (seed via `/hyperion/mrpl/*`), chat Evidence verification, composer mic STT, Mission view (session-derived; the e2e uses a recorded session fixture).
