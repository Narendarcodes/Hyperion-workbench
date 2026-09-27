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

Slimmed 2026-09-28 for the MRPL demo: only document intake and evidence
skills remain (`pdf`, `docx`, `xlsx`, `powerpoint`, `nano-pdf`,
`ocr-and-documents`, `grounded-citations`). Everything else (code review/quality, security scanners,
API/architecture, process/meta, UI/misc — 44 dirs) was deleted: none of it
loads in the web composition, and every entry taxes each step of every
session on small local models. Restore from source control if a use case
needs one back.

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

7 entries ride the per-session skill catalog (name + capped description;
bodies load on demand via the `skill` tool). Keep the allowlist tight —
every entry taxes each step of every session on small local models.
