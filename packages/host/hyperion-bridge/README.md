---
description: "Plain HTTP bridge projecting Hyperion demo state: sessions, models, skills, telemetry, and chat with a hyperion envelope."
kind: "package-reference"
---

# @deepseek-ai/dsh-host-hyperion-bridge

Host-side HTTP bridge for the Hyperion office demo. It mounts plain JSON
routes on the composition's `webServer` so an external Studio can drive and
observe agent work without joining the Typert RPC mesh:

- `GET /hyperion/health` — liveness probe.
- `GET /hyperion/state` — live sessions (id, cwd, preset where known).
- `GET /hyperion/registry` — local model providers and route-policy status.
- `GET /hyperion/skills?sessionId=` — user-invocable skill names for one session.
- `GET /hyperion/telemetry?sessionId=` — tool allow/deny decisions, pending
  approvals, and sovereignty state folded from session events observed since
  plugin load (cold reads before load are not backfilled).
- `POST /hyperion/chat` — admit one `{ sessionId, message }` prompt to a
  live agent; returns `{ accepted: true }`.
- `GET /hyperion/turn?sessionId=&since=` — session events after a sequence
  cursor plus the current `hyperion` envelope (task type, zones, stage, plan,
  skill, verification).

Security has one home, the plugin entry: every route asks the composition's
`connection` service for a rejection first, and mutating bodies are validated
at the wire with a bounded size.
