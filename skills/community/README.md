# Hyperion internal skills (`community/`)

Vendored, product-curated skill bundles shipped with the workbench. Every
clone gets them through the `bundled` discovery source — no per-machine
`~/.agents/skills` needed.

## Source and provenance

- Origin: `~/.agents/skills` on the maintainer workstation, vendored 2026-09-10.
- Each skill dir carries `.provenance.json` (source path, date, frontmatter
  name, license presence). The vendored copy is byte-identical except that file.
- Updates: re-copy from the source root, refresh `.provenance.json`, keep the
  curation tiers below. Do not edit vendored bodies in place — diverged copies
  lose their upgrade path.

## Curation tiers (sovereign industrial workbench)

Kept skills are local-only and brand-aligned: document intake and evidence
(`pdf`, `docx`, `xlsx`, `powerpoint`, `nano-pdf`, `ocr-and-documents`,
`document-to-action-items`, `grounded-citations`, `meeting-action-items`),
engineering rigor (`diagnose`, `systematic-debugging`, `code-review`,
`requesting-code-review`, `simplify-code`, `sdlc-review`,
`merge-reconciler`, `dogfood`, `session-librarian`,
`agents-towards-production`), planning and deliverables (`plan`, `spike`,
`prototype`, `to-issues`, `to-prd`, `handoff`), coding pillars
(`tdd`, `codebase-inspection`, `*-patterns`, `database-optimizer`,
debuggers, security reviewers and scanners, performance/observability),
knowledge structuring (`llm-wiki`, `graphify`), technical writing
(`humanizer`, `grill-me`, `grill-with-docs`), engineering diagrams
(`excalidraw`, `architecture-diagram`, `ui-ux-specialist`), and
`write-a-skill` for team authorship.

Deliberately excluded: networked/external-service skills (reach, cloud
drives, inboxes, social, video, maps, package registries), OS-vendor-locked
skills (Apple, smart home), creative-coding toys, external-agent CLIs, and
anything over budget (`research-paper-writing`, 1.4 MB, out of brand scope).

## License status (gate, not done)

Only `docx`, `xlsx`, `pdf`, `powerpoint`, and `humanizer` carry license
files. The remaining 49 ship unattributed third-party prose. Before any
external distribution of this repository: complete the per-skill license
pass or drop unattributed entries.

## Context cost

54 entries ride the per-session skill catalog (name + capped description;
bodies load on demand via the `skill` tool). Keep the allowlist tight —
every entry taxes each step of every session on small local models.
