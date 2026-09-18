---
description: "Plain HTTP bridge projecting Hyperion demo state: sessions, models, skills, telemetry, and chat with a hyperion envelope."
kind: "package-reference"
---

# @deepseek-ai/dsh-host-hyperion-bridge

English

## Summary

`dsh-host-hyperion-bridge` is the host-side HTTP bridge for the Hyperion office demo. It mounts plain JSON routes on the composition's `webServer` so an external Studio or client can drive and observe agent work without joining the Typert RPC mesh:

- `GET /hyperion/health` — liveness probe.
- `GET /hyperion/state` — live sessions (id, cwd, preset where known).
- `GET /hyperion/registry` — local model providers and route-policy status.
- `GET /hyperion/skills?sessionId=` — user-invocable skill names for one session.
- `GET /hyperion/telemetry?sessionId=` — tool allow/deny decisions, pending approvals, and sovereignty state folded from session events observed since plugin load.
- `POST /hyperion/chat` — admit one `{ sessionId, message }` prompt to a live agent; returns `{ accepted: true }`.
- `GET /hyperion/turn?sessionId=&since=` — session events after a sequence cursor plus the current `hyperion` envelope (task type, zones, stage, plan, skill, verification).

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

Mount this package in the Web bundle or custom profile over a composition supplying `webServer`. It registers the `/hyperion/*` route family and forwards prompts to live sessions.

Security has one home, the plugin entry: every route asks the composition's `connection` service for a rejection first, and mutating bodies are validated at the wire with a bounded size (`maxBodyBytes`, default 65536).

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The plugin registers HTTP route handlers directly with `ctx.webServer`. `POST /hyperion/chat` dispatches prompts through `ctx.sessionController`. Telemetry and turn status fold from `ctx.session` events.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

<a id="model-experience"></a>
## Model Experience

None, as the host HTTP bridge projects demo state outward; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Cold reads before plugin load are not backfilled into telemetry history.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Route handlers are registered during plugin application and cleaned up on disposal.

</details>

**Runtime invariant:** No invariant companion is published because this pure consumer owns no mutable cross-plugin state to validate. Route registrations are effect-owned and disposed with the plugin.
