---
description: "Mission View for the dsh web client: a pixel-art office simulation projecting real session events into specialist agent stations, activity bubbles, and mission progression."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-mission

English

## Summary

`dsh-client-ui-mission` is a browser-only Mission View for the dsh web client. It renders a top-down pixel-art office with a Hyperion orchestrator dais, six labeled specialist stations, deterministic worker movement, activity bubbles, a phase roadmap, sovereignty facts, verification status, and produced-file chips. The office is a pure projection of the existing session event window: it adds no session events, backend, polling loop, spatial persistence, or synthetic activity scheduler.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount this package with `ui-conversation` in the Web bundle. It contributes the Mission tab to the conversation view ring. Chat remains the default tab; selecting Mission does not cancel or alter the running task.

The office dominates the view. The orchestrator occupies the top-center dais. Workers are created only from durable delegation or workflow-agent evidence, enter through the office entrance, and route to the station selected by the event-derived tool family. Stations without workers remain labeled but empty. Verification pending highlights the Verification chamber and opens the existing chat verification surface when selected.

The bottom strip shows status counts, the seven phase states, a collapsed activity feed, and deliverable paths limited to successful `write`, `edit`, and mutating editor locations. Network telemetry is displayed as unavailable because the runtime reports no egress metric.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

`mission-snapshot-builder.ts` folds durable `SessionEventLike` entries and transient assistant chunks into `MissionSnapshot`. `mission-vocabulary.ts` owns tool-family classification and safe activity wording. `visual-behavior.ts` maps a worker snapshot to a station target, glyph, motion directive, and bubble priority. `visual-driver.ts` owns only renderer-side interpolation; it uses requestAnimationFrame to move figures toward domain-derived station seats and skips interpolation for reduced motion.

The renderer uses a single SVG layering order: room shell, furniture, workers, status rings, bubbles, and verification highlight. Live and recorded windows use the same builder and renderer. The owner-local replay fixture covers delegation, workflow workers, tools, approval, and deliverables.

The small files under `src/client/` adapt pure geometry, sprite-grid, bubble, and furniture pieces from Agent Virtual Office. Each retains the MIT attribution header. AI Town and Race Condition are architectural references only; no code or second runtime is copied.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [ui-conversation](../ui-conversation/README.md) — conversation shell and view ring.
- [ui-trajectory](../ui-trajectory/README.md) — durable event ledger.
- [ui-deliverables](../ui-deliverables/README.md) — produced-file vocabulary.
- [session](../../core/session/README.md) — append-only event source.

-----

<a id="model-experience"></a>
## Model Experience

None. This package registers no model-facing prompt, tool, or provider behavior.

#### Token effect

Zero token effect.

#### KV Cache effect

Zero KV-cache effect.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Network egress telemetry is unavailable** — the view intentionally does not fabricate packet counts or infer network state.
- **Rive asset is not present** — the reserved `mission.orb` child slot currently renders the pixel orchestrator figure.
- **Terminal-created files remain outside deliverables** — the view follows the existing produced-file vocabulary and only lists recorded mutation locations.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No invariant companion is published because this pure consumer owns no mutable cross-plugin state to validate. View, locale, and Conversation target registrations are effect-owned and disposed with the plugin.
