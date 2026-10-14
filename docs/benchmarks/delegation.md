# Delegation benchmark: per-agent model routing

Status labels: **verified** = measured in this repo or on the droplet on 2026-10-14; **proposed** = a design choice or assumption, not measured; **unresolved** = open.

## What is measured

The harness (`packages/llm/llm-router/src/delegation-harness.ts`) runs delegation trees through `AgentModelPolicy` and scores **every node**:

| Metric | Definition |
|---|---|
| Correct model per node | routed `provider/model` equals the node's expected route |
| Task completion | the node's deterministic check passes on its own output (exact numbers in the reply) |
| Scenario success | every node completed, routed correctly, and did not error |
| Tokens | `prompt_tokens + completion_tokens` from the provider (gpt-oss reasoning tokens count as completion) |
| Latency | wall time of each node's LLM call; p50/p95 over nodes; mean wall time per scenario |
| Cost | `estimateCostUSD` on the droplet's amortised per-token price (**proposed** figure, not a bill) |

Each node also emits Mission View lifecycle events (`spawn`, `model`, `tool`, `handoff`, `done`, `error`). The live run writes them as JSONL, so the same run can be replayed in the pixel office.

### Scenarios (synthetic, seeded, answer-checkable)

| Kind | Shape | Nodes | What it exercises |
|---|---|---|---|
| sequential | planner → extract (`fast`) → compute with `calc.sum` tool (`code`) → report (`worker`) | 4 | output chaining, tool events, role routing |
| parallel | planner fans out 4 unit-conversion workers (`fast` / `worker`) at once, then aggregates | 5 | concurrent fan-out, aggregation |
| tree | planner → 2 section leads (`planner`) → 2 leaves each (`vision` reader + `code` calc) | 7 (3 levels) | depth, role fallback, one **explicit-override** leaf, tool on the other |

## Routing policy under test

Precedence: `explicit` > `agent-override` (by id or label) > `role` (primary, then ordered fallbacks) > `content` (Laya router, only for `role: auto`) > `depth` default > `parent` route > policy `default` and global `fallbacks`. A candidate that is unavailable (registered but disabled) is skipped, recorded in `tried`, and the decision is marked `fallback`.

Droplet registrations (`DROPLET_MODELS`):

| id | provider | state |
|---|---|---|
| `llm` | droplet | **live** – gpt-oss-120b, vLLM, `127.0.0.1:8001/v1` inside the droplet, reached through an SSH forward |
| `llm-fast` | droplet | placeholder, disabled |
| `llm-vision` | droplet | placeholder, disabled |
| `llm-code` | droplet | placeholder, disabled |

`DROPLET_ROLE_POLICY` maps planner/worker/reviewer to `llm`, and fast/vision/code to their specialist first with `llm` as the fallback.

## Results

### Deterministic unit suite (mocked providers): verified

`npx vitest run packages/llm/llm-router`: **3 files, 57 tests, all pass.** A rule-based solver model stands in for the provider. The suite covers:

- sequential, parallel and 3-level tree scenarios
- specialist routing when the placeholders are enabled, and fallback to `llm` when they are not
- a routing miss being scored as a miss
- a provider 503 on one parallel child: recorded as an error, and the siblings keep going
- a garbled leaf propagating to a failed root
- a policy that cannot route anything
- a mixed batch of 18 scenarios (96 nodes) at bounded concurrency, with 100% success and peak in-flight above 1

`packages/subagent/subagent/tests/child-routing.spec.ts`: **7 tests, all pass.** It covers the subagent seam (`resolveRoutedChildAgentOptions`).

### Live suite: gpt-oss-120b on the droplet (verified, 2026-10-14)

**Dataset:** 40 seeded variants per kind = **120 scenarios / 640 nodes / 640 LLM calls per run**. Settings: `reasoning_effort=low`, `temperature=0`, `max_tokens=768`. Command: `scripts/delegation-live.ts`.

Transport: the client reached the droplet through a paramiko SSH forward (`127.0.0.1:18001` → droplet `127.0.0.1:8001`). Other workstreams were using the same GPU at the same time, so throughput figures are lower bounds and vary between runs.

The vLLM server was restarted at about 18:26 IST with an fp8 KV cache and `max-num-seqs 256`. The runner waits for readiness and retries connection errors and 5xx/429 with exponential backoff. Any scenario touched by a transport failure would be excluded from scores; **0 were excluded** in the runs below.

| Run | Scenario concurrency | Peak in-flight calls | Wall (s) | Calls/s | Scenario success | Node completion | Model correct | p50 / p95 node latency (ms) | Tokens | Cost (USD, proposed rate) |
|---|---|---|---|---|---|---|---|---|---|---|
| post-restart, warm | 128 | 280 | 16.0 | **39.9** | 119/120 (99.2%) | 638/640 (99.7%) | 640/640 | 4455 / 6291 | 100,632 | 0.0078 |
| post-restart, warm | 48 | 112 | 28.9 | 22.2 | 118/120 (98.3%) | 636/640 (99.4%) | 640/640 | 2803 / 4417 | 100,817 | 0.0078 |
| post-restart, warm | 8 | 19 | 132.3 | 4.8 | 119/120 (99.2%) | 638/640 (99.7%) | 640/640 | 1669 / 3479 | 100,860 | 0.0078 |
| post-restart, cold (first run after restart) | 128 | 280 | 29.2 | 21.9 | 118/120 (98.3%) | 636/640 (99.4%) | 640/640 | 7710 / 11161 | 100,797 | 0.0078 |
| pre-restart config | 48 | 112 | 13.3 | 48.1 | 120/120 (100%) | 640/640 (100%) | 640/640 | 1344 / 1987 | 100,834 | 0.0078 |

Per kind (warm, concurrency 128): sequential 40/40, parallel 40/40, tree 39/40. Mean scenario wall time was 14.0 s, 11.5 s and 15.1 s respectively.

Route sources on every run: `role` 320, `fallback` 280 (fast/vision/code → `llm`, because the specialists are not served), `explicit` 40.

**Observations**

1. Routing was correct on 100% of nodes in every run (verified). In the live suite this mostly tests the fallback path, because only `llm` is served. The unit suite covers specialist routing and the explicit override to a non-droplet route.
2. Every failure is a real model error, not an infrastructure error. They all happen at the same step: a tree section lead is asked to "reply with just the area" given `[1] L=8 W=5` and `[2] 40`, and it answers `0` (or the wrong leaf), which then propagates to the root (`tree-26`, `tree-27`, `tree-15`, `tree-18`). The same scenario fails across concurrency levels at `temperature=0`. Proposed fix: have section leads read the tool result directly instead of summarising free text, or give that step `reasoning_effort=medium`.
3. Throughput rises with concurrency (4.8 → 22 → 40 calls/s) while per-call latency rises (p50 1.7 s → 4.5 s). That is the expected batching trade-off.
4. Unresolved: whether 40 calls/s is limited by vLLM or by the single-socket Python SSH forward. Peak in-flight calls reached 280, yet a vLLM `/metrics` sample during the C=128 run showed `num_requests_running` at 11. The next step is to run the client on the droplet itself (node is not installed there) and compare.
5. The cold run, which started right after the restart while the server was warming, was about 2× slower than the warm run at the same concurrency. Keep the warm-run numbers as the reference.

## Reproduce

```sh
# unit (mocked)
npx vitest run packages/llm/llm-router packages/subagent/subagent/tests/child-routing.spec.ts
# live (needs the SSH forward to the droplet)
DROPLET_BASE_URL=http://127.0.0.1:8001/v1 N=40 CONCURRENCY=128 \
  npx tsx packages/llm/llm-router/scripts/delegation-live.ts out/
# replay: load out/delegation-live.events.jsonl in Mission View → "Load recording"
```
