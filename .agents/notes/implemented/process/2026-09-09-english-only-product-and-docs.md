# Agent Note: English-only product and docs

Status: implemented

## Problem

HYPERION ships an English-only product for SIH 2026, but the fork carried the full upstream bilingual system: 1360 Chinese doc files, Chinese dictionaries in every client locale, a Chinese-first onboarding path, and the translation-pairing gates, merge driver, hooks, website locale trees, and translation skills that maintained them. Every product surface a reviewer opens showed Chinese first, and every docs edit paid the pairing tax.

## Decision

The tree is English-only. Chinese Markdown files, `.i18n.yaml` records, and `zh` locale dictionaries are deleted; `LOCALE_IDS` is `['en']`; the website projects one locale; the pairing gate, merge driver, hooks, brief/prompt tooling, and translate skill are removed. Display strings that named the removed system now name the English reality (provider display names, onboarding copy, preset names). Route keys, settings namespaces, wire ids, npm scope, licenses, and attribution stay exactly as upstream shipped them.

Synthetic non-English test data (user-authored preset names, pasted user content, error payloads, Japanese language-pack plugin fixtures) stays where it exercises Unicode handling; only locale-provided copy assertions moved to English. Frozen history (implemented/rejected notes, archived prose) keeps its past-tense rationale; only dead outbound link targets were retargeted to living authority, which the notes index requires for moved or deleted files.

## Alternatives considered

- **UI-only removal.** Keeps 1360 Chinese docs and the pairing gates alive for a product that never renders them. Rejected: the gates would keep failing and every docs edit would keep paying for a second language.
- **Full structural rename (route keys, npm scope).** Breaks session logs, settings documents, hundreds of tests, and the pnpm workspace for zero user-visible gain. Rejected: identifiers are not language.
- **Translating all synthetic test data.** Destroys Unicode-handling coverage (CJK rendering, search, metadata round-trips) for no product effect. Rejected.

## Consequences

Upstream pulls will reintroduce Chinese files and bilingual gates; each pull needs a re-application of this cutover rather than a clean merge. The archive manifest was re-sealed to the post-removal tree. E2e suites were migrated to English but cannot execute in this environment (no browsers); CI owns that signal.
