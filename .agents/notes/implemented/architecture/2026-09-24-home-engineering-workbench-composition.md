# Agent Note: Home engineering-workbench composition

Status: implemented

English

## Problem

The Home surface presented the workspace browser as the primary navigation and left the hero shell consuming the full scrollport height, which produced a large vertical gap between the identity copy and the composer. The hero carried a second Hyperion brand already owned by the sidebar shell. The animated heading split the question mark from the animated phrase, and the sidebar exposed the raw session list as its top-level content.

## Decision

`ConversationRoot` and `WorkspaceBrowser` remain the only Home and session-navigation owners; no router, store, or persistence seam was added. The sidebar renders the workbench taxonomy — Home, Plant, Work, Simulation, History, More — with unimplemented destinations as disabled planned placeholders carrying localized planned names, never fake screens. The real session browser lives only inside the History disclosure under Conversations, closed by default; opening it restores search, grouping, ordering, workspace creation, renaming, archiving, and session opening unchanged. The More disclosure holds the planned advanced entries, while the active Model Hub and Settings controls stay in the foot. The sidebar brand carries the tagline with the build version de-emphasized, and the New Work action is a quiet secondary control.

`HeroShell` renders no brand mark; the `conversation.hero.brand.mark` slot, its owner props, its public export, the generated catalog entry, and the brand package's hero references are retired, leaving the sidebar as the single product identity. The hero, composer, suggestions, and recent work share one content width derived from the composer geometry, with the desktop axis using 80% of the available conversation column up to 1040px and left-aligned hero copy. The hero stack centers through auto margins when it fits and top-anchors when it overflows.

The animated phrase carries its own question mark, paints in the business-blue accent, reserves a stable 11ch width and line height, and transitions with opacity and vertical translation over 260ms every 3 seconds through analyzing, investigating, reviewing, comparing, and diagnosing. The complete localized heading is the accessible name while the rotating phrase is hidden from assistive technology. Reduced motion stops the interval and the animation. The local-state pill reflects the workspace registry snapshot: available once ready without error, unavailable on error, hidden while loading.

The refinery illustration ships as `apps/web/public/refinery.png` and renders from the `ConversationRoot` hero phase as a full-width, non-flow layer across the main Home workspace with edge masking, desaturation, and reduced opacity; it does not change document height or enter the sidebar. The Home utility row keeps the local-state pill separate from compact presentation buttons carrying the sun, bell, circular N avatar, and chevron glyphs. These buttons are visual chrome only; the existing Settings and Appearance surfaces remain the theme, notification, and user owners. The composer keeps every control; the hero variant adds Context and Skill chips that insert `@` and `/` through the existing trigger pipeline, and the model trigger uses the brain glyph with an automatic-routing tooltip instead of the MODEL caption. Suggestion cards carry icons, supporting copy, arrows, and a two-column tablet layout at a consistent height; recent rows carry conversation glyphs, an overflow affordance, and the `Open conversations →` hint over real session data.

## Alternatives considered

**Add a router and dedicated Plant, P&ID, and Simulation pages.** Rejected. The application has no routing or domain services for those surfaces, and a second navigation or persistence system would fabricate behavior the Host cannot provide.

**Move session history into a new browser or store.** Rejected. `SessionListState`, `WorkspaceBrowser`, `openSession`, and `startSession` already provide the authoritative list and actions.

**Animate the entire heading or use a live region.** Rejected. Full-heading animation moves layout and a live region repeats announcements; the fixed phrase span with a stable accessible name keeps motion restrained.

**Add new notification or user-menu behavior to Home.** Rejected. No notification center or user profile service exists, so the header sequence remains presentation chrome; the existing Settings and Appearance surfaces retain their behavior.

**Wire an Open-conversations action on Home.** Rejected. No channel exists from the conversation surface to the sidebar disclosure; the History disclosure itself is the entry point.

**Draw sidebar icons from approximate glyphs.** Rejected. The icon set has no home, plant, or shield glyphs, and mismatched metaphors mislead more than text-only rows. Shared bell and brain outline glyphs were added to the existing primitive icon set for the Home header and Auto trigger.

## Testing

- Focused Home suites: 4 files, 111 tests passed; the broader earlier client pass covered 7 files and 185 tests.
- Changed-package TypeScript checks, scoped Oxlint, and `pnpm run build` passed with no findings or build errors.
- The Impeccable detector reports no findings on the changed surfaces.
- Agent-note format and classification gates pass; `git diff --check` is clean.
- Authenticated browser renders at 1440×900, 1038×650, 768×800, and 390×844 confirmed the full-width `/refinery.png` layer, 80% desktop composer axis, responsive card grids, real Recent Work, focusable header controls, stable phrase width, and no horizontal page overflow; reduced-motion renders keep the phrase static.
- The aggregate GUI lane still has unrelated theme/elevation failures; the two assembled-sidebar tests were updated to open the existing History disclosure before asserting session rows. The keyless web replay reached the app flow but its Windows temporary-directory cleanup fails with `EPERM` after the smoke cases complete.

## Consequences

- Home reads as one workbench composition sharing the composer grid instead of centered chat chrome stacked with arbitrary margins.
- The committed `workspace-browser.client.spec.tsx` uses carriage-return-doubled line endings; new lines in that file must use single line endings to keep `git diff --check` clean.
- Plant, P&ID, Equipment, Investigations, Documents, Reports, Simulation, Agent Runs, Model Router, Sovereignty, and Audit Logs remain planned navigation until owning surfaces exist.
- A rendered-browser comparison against the mockup is recorded in the final Home screenshot; repository tests do not compare pixels.
