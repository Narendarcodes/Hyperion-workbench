# Agent Note: Indic language catalog in the web GUI

Status: implemented

## Problem

The web GUI is English-only: `LOCALE_IDS` is `['en']` and the Settings → General → Language row offers a single option. The product needs Hindi UI copy plus a dropdown of the top Indic languages of India, without breaking the compiler-enforced dictionary completeness that the typed `register` overload provides.

## Decision

The locale plugin catalogues ten Indic languages — Hindi (`hi`), Bengali (`bn`), Marathi (`mr`), Telugu (`te`), Tamil (`ta`), Gujarati (`gu`), Kannada (`kn`), Malayalam (`ml`), Punjabi (`pa`), Odia (`or`) — with `LOCALE_IDS` at `['en', 'hi', 'te']`. Hindi and Telugu each ship a translated dictionary in every client namespace (~1,230 keys per language across 32 dictionaries); the typed `Record<BuiltInLocaleId, …>` register overload compiler-enforces that completeness, so a namespace missing either fails typecheck. The remaining eight languages are registered through `ctx.effect(() => locale.addLanguage({ id, label, fallback: 'en' }))` with no dictionaries yet, so per-key lookup falls through the existing fallback chain to English. Display order is the built-ins first, then the catalogued languages in descending speaker population. Where a language has no natural translation, the copy transliterates into its own script (letter-name acronyms such as एपीआई / ఏపీఐ, technical badges such as सिस्टम / సిస్టమ్); functional tokens stay verbatim — slash-command names (`/plan`, `compact`), key caps (`Tab`, `Cmd/Ctrl+Enter`), file-format names, unit syntax users type (`px`, `K`/`M` suffixes), URLs, and file paths. Browser language detection, `<html lang>` sync, and `locale.preference` persistence work unchanged because they already operate on registered ids.

## Coverage

Each language landed namespace by namespace through the single-locale `register(ns, locale, dict)` form (no `LOCALE_IDS` change, tree green throughout), then the flip converted every call site to the typed `{ en, hi }` and later `{ en, hi, te }` form. Each flip caught missed namespaces and fixture runtimes at compile time, which is the enforcement working as designed.

## Alternatives considered

- **Flip `LOCALE_IDS` to `['en', 'hi']` immediately.** Turns all ~30 `register(NS, { en })` call sites into compile errors in one change, leaving the tree red until ~1,000 Hindi strings are translated and reviewed. Rejected: it couples the dropdown (small, shippable) to the full translation debt and blocks every intermediate gate.
- **Ship Hindi as an external language-pack plugin.** Smaller locale-package diff, but Hindi completeness would never be compiler-enforced and the catalog would depend on plugin load order. Rejected: Hindi is a first-class product language, not an optional pack.
- **Hide untranslated languages until translated.** Shows only English + Hindi for now. Rejected: the dropdown is the commitment device — visible entries create the translation backlog explicitly, and the English fallback keeps them usable.
- **Fall back to Hindi instead of English for the nine.** Rejected: most Hindi dictionaries do not exist yet, so the chain would resolve English anyway after an extra hop; English is the only complete dictionary and stays the chain terminal.

## Consequences

Selecting Hindi or Telugu localizes the full web GUI; the eight catalogued languages remain English-backed until their dictionaries land, and their visible presence is the translation backlog made explicit. The Hindi and Telugu copy is machine-drafted and needs native-speaker review before it counts as final. This note partially supersedes the English-only product decision for the web GUI surface; see [English-only product and docs](../process/2026-09-09-english-only-product-and-docs.md), which still owns the docs tree, TUI/desktop shells, and model-facing text.

## Testing

The locale package suite pins the 11-option dropdown order, Hindi copy resolution, English fallback for dictionary-less entries, Hindi browser auto-detection, and preference persistence. `test:gui` passes 4208 tests with only the two pre-existing theme-CSS failures; both `tsc -b tsconfig.host.json` and `tsc -b tsconfig.client.json --force` are green, and `verify-client-ui-i18n` reports no new violations.
