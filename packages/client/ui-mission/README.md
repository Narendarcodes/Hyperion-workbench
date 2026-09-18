---
description: "Mission View for the dsh web client: header, verification, phases, and activity over session events, with the live Studio office embedded."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-mission

English

## Summary

`dsh-client-ui-mission` is a browser-only Mission View for the dsh web client. It renders the mission header (task title, status, orchestrator line, deliverables, sovereignty facts), the pending-verification banner, a live Studio 2D office embedded by session id, and the bottom strip (status counts, seven phase states, activity feed, deliverables). The office picture is owned by the external Studio, not this package: the view only frames it with the session binding.

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

Configure `studioUrl` (default `http://localhost:3000`) to point the embedded office at the running Studio. The iframe loads `{studioUrl}/office/embed?sessionId=<id>`; Studio opens its own gateway connection and renders the live 2D office for that session.

The bottom strip shows status counts, the seven phase states, a collapsed activity feed, and deliverable paths limited to successful `write`, `edit`, and mutating editor locations. Network telemetry is displayed as unavailable because the runtime reports no egress metric.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

`mission-snapshot-builder.ts` folds durable `SessionEventLike` entries and transient assistant chunks into `MissionSnapshot`. `mission-vocabulary.ts` owns tool-family classification and safe activity wording. `studio-url.ts` holds the Studio base URL from the plugin Config for the office iframe.

The renderer section is intentionally thin: the live office picture is owned by the external Studio (embedded by session id). Live and recorded windows use the same snapshot builder. The owner-local replay fixture covers delegation, workflow workers, tools, approval, and deliverables.

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
