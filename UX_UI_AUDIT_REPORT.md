# Hyperion UX/UI Audit

Branch: `feat/mrpl-specific` · worktree `_fork-mrp` · read-only analysis, no code changed by this report.
Skills applied (read from `~/.agents/skills` before use): `impeccable` (Operate-mode critique lens),
`ui-doctor` (Nielsen heuristics, cognitive load, button hierarchy), `redesign-existing-projects`
(existing-product audit checklist), `minimalist-ui` (restrained token system),
`fixing-accessibility` (names, keyboard, focus, semantics). `high-end-visual-design` principles
(hierarchy, spacing, card consistency) applied via the same evidence; no redesign was performed.
Every finding cites actual code. No runtime/browser verification (no server started per task rules).

## 1. Executive Summary

The shell (sidebar, composer, primitives) is a disciplined token-driven system (`--dsw-*`,
`--dsh-*`): consistent 28–32px control rhythm, `currentColor` icons, locale-owned copy, labelled
icon-only controls. The MRPL workbench pages (Plant, Equipment, Investigations, Documents,
Reports) are a second, looser system: hardcoded radii (6/8/10/12), hardcoded shadows and
literal palette values, one page with its own font stack, and mock-only state with no
empty/loading/error branches. The audit therefore splits into: keep enforcing the shell
system, and pull the five workbench pages onto it. No P0 (nothing broken/blocking) was
found; the bulk is P1 consistency debt plus P2 polish. Accessibility is structurally sound
(names, aria-hidden, dialogs) with narrow gaps (focus-visible coverage, one unlabeled
search input).

## 2. Design System Findings

### Typography
- Shell scale is tokenized: 11/12/13/14/16/20/24 (`--dsw-font-xxxs-11`…`--dsw-font-xl-24`),
  weights 400/500/600/700 (`gradient-shadow-text.css:59-268`, `base.css:7-10`).
- Section labels are consistent: 10px/600/uppercase/`ls .1em` (`WorkspaceBrowser.module.css:51-61`).
- Violation: `ReportsOverview.module.css:13-15` declares its own font stack, bypassing tokens.
- Body copy inside workbench pages defaults to 14/24 with 12/20 meta — matches tokens, but
  only by coincidence (literal values, not token references).

### Spacing
- No spacing scale exists: no `--dsw-spacing-*` tokens (verified by grep over `ui-theme/src`).
  All padding/gap values are hardcoded per component — the single largest consistency risk.
- Sidebar internals are self-consistent (row `6px 10px`, gaps 2/10/14), but page shells
  diverge: Plant `24/32/48 gap 28`, Equipment/Investigations `14/20/32 gap 12`,
  Documents `24/32/48 gap 22`, ModelHub `12/20/28`, Reports root `pad 32`.

### Colors
- Two-tier token system is healthy: statics `--dsw-static-*` + aliases `--dsw-alias-bg/label/interactive/button/state-*`,
  light + dark (`design-platform.css:5-82,165-348`); sidebar has dedicated fill/nav tokens (`:251-254`).
- Violations (all literal, theme-blind): Plant badge fills `#eff6ff/#f0fdf4/#f5f3ff/#fffbeb`
  (`PlantContext:78-93`); Reports full literal palette (`#fff/#e2e8f0/#3b82f6/#718096…`);
  `ReportsOverview:5-19` hardcodes `#fafbfc` background.
- `Equipment/Investigations/ModelHub` sub-cards reference `--dsw-alias-surface-raised/sunken`,
  which **do not exist** in `design-platform.css` (only `bg-layer-*` does) — always saved by
  hardcoded fallbacks (`#ffffff/#1e293b/#f8fafc`). Dead token names should be renamed to
  `bg-layer-*` or added to the theme.

### Radius
- No radius token; values drift by surface: composer card r22, ModelSelect menu r20,
  Modal r24, Button md r18 / sm r14, nav items r8, page sub-cards r10–12, Reports mixes
  4/6/8/12/16/9999 (`ReportsOverview:246,292,329,438,473,913,929`).
- Stale comment: `SidebarRoot.module.css:240-241` claims "38px bar, 12px radius" while the
  rule below sets h32/r8 (`:242-261`).

### Borders
- Hairline system is consistent: `border-l1..l4` aliases + 0.5px usage
  (`design-platform.css:179-185`, `Input.module.css:7`, Modal footer).

### Shadows
- Current system is elevation strokes (`--dsw-elevation-stroke/-panel/-prominent/-soft`,
  `gradient-shadow-text.css:28-34`), used by composer/menu/modal.
- Pages bypass it with ~10 hardcoded `0 1px Npx rgba(0,0,0,.02-.06)` variants
  (`PlantHeader:22-28`, `CategoryCards:13-18`, `AskHyperionPanel:6-17`,
  `InvestigationDetail:6-18`, `ModelHubHeader:54-66`, Reports `:139-147`).

### Iconography
- Two systems coexist: fill-based figma glyphs in `ui-primitives/icons` (`IconProps {size,className}`,
  `fill=currentColor`) vs feather-style stroke inline SVGs in workbench nav
  (15px, 24-grid, `stroke=currentColor sw2`). Both inherit `currentColor`; decorative
  instances are all `aria-hidden` (verified across InputBar, ModelSelect, WorkspaceBrowser,
  SidebarRoot, Modal). This task unifies the five target icons (Auto, New work, Plant,
  P&ID, Equipment) on the stroke system; the remaining nav icons already use it.

## 3. Navigation Findings

- Hierarchy is sound: Home → Plant (Plant/P&ID/Equipment) → Work (Investigations/Documents/Reports)
  → Conversations (disclosure) → More (disclosure). Active state is visible (business-tint bg +
  600 text + tinted icon, `WorkspaceBrowser.module.css:102-110`).
- This task removes the three disabled `plannedItem` entries (Simulation section, Model Router,
  Sovereignty) — all were `disabled` buttons with no route/action, so removal changes no behavior.
- Residual: P&ID and Agent runs remain `plannedItem` (disabled, tooltip "Planned"); Audit logs
  likewise. Disabled items are announced as "{name} (planned)" — acceptable, but three dead
  entries in a 56px-rail product is noise; prefer hiding until implemented (P2).
- Rail parity: wide-only content (nav labels, search input) unmounts at settle; rail keeps
  search/add/toggle at 36px (`SidebarRoot.module.css:28-30`, `SidebarRoot.tsx:52-80`). Good.
- `sessionOverflowButton` hover sets transparent bg (`WorkspaceBrowser.module.css:510-530`) —
  hover affordance weaker than every other row (P3).

## 4. Composer Findings

- Structure (`InputBar.tsx:488-758`) is logical: notice → card (attachments, editor,
  tools/modes left, model/meter/send right) → dock. Icon sizes disciplined (tools 14,
  send/stop 16).
- ModelSelect trigger (h28, `0 4px 0 8px`, r24, 13/500) sits beside h28 chips/selects —
  consistent row. Menu option min-h 38 vs app Menu item 40 — negligible.
- Composer card (r22, `elevation-soft`) vs app Modal (r24) vs Menu card (r20): three large
  radii for three overlay roles; acceptable if intentional, worth one canonical overlay
  radius (P2).
- Hidden file input has no label (`InputBar.tsx:614-621`, P1 a11y — see §8).
- Composer uses `aria-label=placeholderText` on the editable div (`:550`): recognition-over-recall
  is fine here (single-purpose input), but placeholder text must never be the *only* label on
  multi-field surfaces (applies to Reports search, §8).

## 5. Buttons & Controls

- Primitive scale is coherent: Button md h36/r18, sm h28/r14; Input h32/r8; Menu item 40
  (dense 34, compact 26); icon-only 28 (circle in shell, r8 in modal).
- Drift points: rename input h44/r22 (`WorkspaceBrowser:539-552`) vs primitive Input h32/r8;
  pill radii 999 (composer chips) vs 24 (ModelSelect) vs 18/14 (Button); ghost vs outline
  both exist with no documented role split (P2: document when to use which).
- One primary per section holds; destructive delete uses outline + custom class
  (`WorkspaceBrowser:1680-1690`) rather than a danger variant — no `status=danger`
  equivalent exists in Button (P2).
- Focus-visible exists on ModelSelect, WorkspaceBrowser rows, HeroShell, and most primitives,
  but has zero hits in `SidebarRoot.module.css`, `Modal.module.css`, `InputBar.module.css`
  (P1 — keyboard users tab through exactly these surfaces).

## 6. Cards / Panels / Surfaces

Core P1: the same "card" is r6 vs 8 vs 10 vs 12 across the five overviews, with shadows
split between elevation tokens (shell) and hardcoded literals (pages), and backgrounds
split between semantic tokens, nonexistent `surface-raised`, and literals. Fix = map all
page cards to `bg-layer-1 + border-l2 + elevation-panel` (or a documented page-card
alias), delete literal shadows. Reports is the worst offender (own font stack, own
palette, 7 radii) — normalize it first.

## 7. Naming / Terminology

| Term | Status | Evidence |
|---|---|---|
| P&ID | Canonical, consistent | `nav.pid:'P&ID'` en/hi/te; zero `\bPID\b`/`PId` user-facing hits (`pid` only as code ids) |
| Equipment | Canonical | Dominant everywhere; `assets` only twice in Plant placeholder copy (`EngineeringPlantMapPlaceholder:18`, `plant/mockData:25`) → change to "equipment" (P2) |
| Simulation vs Mission | Split by layer | User-facing `Simulation` (`workspace locales:30`, `mission locales:22-23`); code `mission/*`, slot `mission.orb`. Keep user term; do not rename code (P3 doc note) |
| Model Hub | Canonical | `nav.modelHub:'Model Hub'`; internal tab id `models` is fine (code, not copy) |
| Conversations/History/Sessions | Three names, one surface | `nav.history:'History'` (section aria), `nav.conversations:'Conversations'` (row), `section.sessions:'Sessions'` (tree aria + search). Pick one user term (recommend **Conversations**) and relegate others to aria/code (P1) |
| Reports vs Deliverables | Clean split | Reports = page; Deliverables = subset (mission chips, report subtitle). No change |
| Auto | Consistent visible | Always `Auto`; `Automatic` only in aria/title attributes. No change |
| New work vs New Session | **Real inconsistency** | Same key `session.new` = `'New work'` (sidebar) vs `'New Session'` (workspace). One key, two values — canonicalize to **New work** (sidebar is the visible surface; tree blank-row copy should follow) (P1) |
| Plant case | Minor | `all plant equipment` (lowercase, Equipment subtitle) vs `Plant` elsewhere — sentence-case body copy, acceptable; normalize only if touching the file (P3) |

## 8. Accessibility Findings

Strengths: every icon-only button found has an accessible name; every decorative icon is
`aria-hidden`; Settings modal traps/focuses/Escape-closes (`SettingsRoot:47-70`); heading
order is clean (Home h1→h2, Reports h1→h2→h3, Modal h2); status/alerts use implicit live
regions (`role=status/alert`, no explicit `aria-live` needed).
Gaps:
- P1: Reports search `<input placeholder>` with no label (`ReportsOverview:45-49`); hidden
  composer file input unlabeled (`InputBar:614-621`).
- P1: no `:focus-visible` in SidebarRoot/Modal/InputBar stylesheets (keyboard path surfaces).
- P2: no `<label>` anywhere — aria-label/placeholder pattern works but is fragile under
  translation (hi/te placeholder length); prefer visually-hidden labels on new inputs.
- P3: no skip link to the conversation region; Modals rely on the shared Modal primitive
  (verify trap once centrally rather than per dialog).

## 9. Interaction Consistency

- Outside-click/Escape dismissal is consistent (ModelSelect menu, search, WorkspacePickFlow,
  Settings modal). Disclosure expand/collapse animated through shared DisclosureRow.
- Drag-reorder (sessions, workspaces) commits on drop with marker affordances; failures log
  console warnings only — acceptable for local-only order state.
- Toast usage is restrained (ModelSelect transient Toast anchored to composer card).
- Session-creation entry points (brand shortcut, New work button, tree blank row) all route
  through the single `startSession()` flow — no duplicated logic found.

## 10. Page-by-Page Findings

- Home: airy hero + suggestions + recent; empty-recent handled; no loading/error branches (P2).
- Plant: dense dashboard (map, metrics, units, activity); filter/search present; fallbacks are
  `console.info` — needs real empty/error states (P1 states, not started).
- P&ID (new): full workspace (header/search/filter/ask, navigator, vector viewer with
  pan/zoom/fullscreen/real SVG export, context panel, related tables); navigator + tables
  keyboard-operable; live-region selection announcements. Mock-data backed like sibling pages.
- Equipment: dense 3-column workspace; mock `useState` only; no empty/loading/error (P1 states).
- Investigations: status cards + 3-column layout; same states gap (P1 states).
- Documents: category cards + library/viewer/details; `throw if MOCK empty` is a crash, not an
  empty state (P1 states).
- Reports: densest page; own font stack removed, searches labelled; palette/radii migration
  remains (P2). No loading/empty/error (P1 states).
- Conversations: disclosure + search + view options; consistent with shell tokens.
- Model Hub: tabbed workspace + dialogs; states delegated to store/tab views.
- Settings: modal dialog with focus-close, Escape, mask-click; no issues found.

## 11. Priority Matrix

P0 (blocking): none found.
P1 (implemented this pass): surface-raised/sunken aliases; card-shadow token migration;
Reports font-stack removal; New work canonicalization; Reports/P&ID search labels;
focus-visible coverage (SidebarRoot/Modal/InputBar/P&ID); rename-input parity;
P&ID view-all/document/investigation/ask routing to real Hyperion targets.
P1 (remaining): per-page empty/loading/error states; Documents throw-if-empty.
P2 (implemented): New work primary treatment; System section; Tabler icon unification;
summaryCard canonical treatment; tab roles in context panel.
P2 (remaining): Reports palette/radii migration; ghost-vs-outline documentation; danger
variant; skip link; full tree-grid semantics for P&ID navigator.
P3 (remaining): sessionOverflowButton hover parity; stale SidebarRoot comment already fixed
as part of New work restyle; Plant-case normalization; Simulation/Mission doc note.

## 12. Recommended Design Tokens

- Sidebar row: min-h 32, pad 6/10, gap 10, r8, 13/18 (keep).
- Icon: nav 15–16, composer tools 14, send 16, rail 18/36px controls (keep).
- Button: md h36/r18, sm h28/r14, dialog inputs h32/r8 (now enforced on rename).
- Input: h32–36, r8 (composer card r22 stays as the hero exception).
- Radius vocabulary: 8 (controls/nav), 10 (page cards), 20–24 (menus/dialogs/composer).
- Border: 0.5px border-l2 for cards, l4 for inputs.
- Surfaces: bg-layer-1/surface-raised (cards), bg-layer-2/surface-sunken (wells),
  elevation-panel (card shadow), elevation-prominent/soft (menus/composer).
- Text: 11/12/13/14/16/20/24 token scale; section labels 10/600/uppercase/0.1em.

## 13. Phased Implementation Plan

- Phase 1 (done): navigation + global consistency (System section, icons, naming, surfaces).
- Phase 2 (done): composer + control consistency (focus-visible, rename parity, P&ID inputs).
- Phase 3 (partial): page-level consistency (P&ID integrated; Reports exemplar; states remain).
- Phase 4 (open): accessibility polish (skip link, tree-grid roles) + coverage for pid/ sources.

## 14. Implementation Status (feat/mrpl-specific pass)

Implemented: P1 naming, surfaces, shadows, typography; P1 a11y (except hidden file input,
intentionally unnamed — `hidden` prunes it from browser a11y trees and the attach button
carries the label); P2 buttons/icons/nav; P&ID extraction + integration (7/7 specs green).
Remaining: per-page empty/loading/error states; Reports palette/radii migration; ghost vs
outline docs; danger variant; skip link; tree-grid roles; per-file coverage for pid/.
