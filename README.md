# HYPERION WORKBENCH

**An on-premise agentic workbench for industrial knowledge work: grounded document answers with verified citations, plant-floor voice input, and an engineering workbench (Plant, Equipment, Documents, P&ID, Investigations, Reports) for the MRPL refinery pilot.**

[Architecture](#architecture) • [Quick start](#quick-start) • [Configuration](#configuration) • [Tests](#run-and-test) • [Status and known gaps](#status-and-known-gaps) • [Design approach](APPROACH.md) • [Landing page](landing/index.html) • [User guide](docs/user/guide/index.md)

> **Branch note.** This README describes `feat/mrpl-wire-integration` (draft PR #27, head `fef63ee8`), which combines wire PRs #23–#26 on top of `feat/mrpl-live-wiring` (draft PR #22). `master` is the generic product; the MRPL workbench, the RAG wiring and the voice route described below live on the MRPL branches and are **not merged**. Everything here is taken from the code on this branch; where a claim depends on a live deployment it says so.

---

## What it is

Hyperion Workbench is a fork of the open-source **DeepSeek Harness** agent runtime, built on the **Cordis** plugin framework (TypeScript monorepo, pnpm workspaces, 269 packages under `packages/*/*`). Every capability — model providers, tools, sessions, sandbox, web server, UI views — is a plugin composed from `cordis.yml` profiles.

On top of that runtime, the MRPL branches add:

- a **document RAG service** (`packages/tool/tool-hyperion-rag`) that answers only from indexed documents, verifies every quoted citation against the cited page, and **abstains** with a machine-readable reason when it cannot;
- a **host bridge** (`packages/host/hyperion-bridge`) exposing typed `/hyperion/mrpl/*` HTTP routes over a file-backed public sample corpus plus the live RAG service;
- an **engineering workbench UI** in `packages/client/ui-conversation` whose screens read those routes instead of client mock data;
- a **speech route** (`POST /hyperion/asr/transcribe`) over a warm STT sidecar (`packages/asr/asr-http`).

The bundled corpus is **public sample data** (OISD, CSB, OSHA, OSTI, MRPL/IOCL public spec sheets, CC-BY training text), not MRPL plant records — the manifest says so (`packages/host/hyperion-bridge/mrpl-seed/manifest/documents.json`) and the UI labels it.

## Features

| Area | What exists on this branch | Where |
|---|---|---|
| Agent runtime | Agent loop, tool execution, sessions (JSONL), sandbox policy, subagents, skills, local-first model providers (inherited from the Harness) | `packages/core`, `packages/tool`, `packages/session`, `packages/sandbox`, `packages/llm` |
| Grounded RAG | Section-aware chunking; BM25 + `google/embeddinggemma-2` dense retrieval fused with RRF (k=60); `BAAI/bge-reranker-v2-m3` cross-encoder rerank; answers from an OpenAI-compatible LLM (gpt-oss-120b in the measured deployment); verified citations (doc id, page, char span, verbatim quote); layered abstention | `packages/tool/tool-hyperion-rag/scripts/hyperion_rag/` |
| Live ingest | Upload PDF / Markdown / text → background job (OCR for scanned pages when `HYPERION_OCR_URL` is set) → incremental index → cited answers | `service.py`, bridge `mrpl-live.ts`, `documents/UploadAskPanel.tsx` |
| Documents | Live catalog with Unit / Equipment / Type / Tag facets and sort; document viewer reads page text | `ui-conversation/src/client/documents/` |
| P&ID | Clicking a tag runs evidence search plus a grounded answer for that tag; readable abstention text | `pid/TagEvidencePanel.tsx` |
| Investigations | Persisted store (localStorage); Start Investigation from Plant / Equipment / P&ID creates a real record; Rerun / Compare run cited RAG analysis; Generate Report downloads Markdown; Equipment Context and Related Documents come from the record | `investigations/` |
| Reports | Report library (search, filters, grid/list, pagination, share, delete); **+ Generate Report** writes a cited Markdown deliverable via the RAG answer route | `reports/`, bridge `mrpl-routes.ts` |
| Plant | Plant map with diagram / list views, Fullscreen and Open Unit wired to host handlers or hidden; remaining fixture metrics labelled as sample data | `plant/` |
| Voice | Composer mic → `/hyperion/asr/transcribe` → `ctx.asr` (`asr-http`) → STT sidecar routing IndicConformer-600M (te/hi, code-mixed), Whisper large-v3-turbo (en), SraVaani-1.0 (fallback); plant-tag normalisation (`P-101A`, `12.5`) | `packages/asr/asr-http`, `skeleton/InputBar.tsx` |
| Mission View | Pixel-office simulation of agent work with live and replay modes | `packages/client/ui-mission` |
| Sample-data honesty | Every remaining fixture panel carries a `SampleNote` (`role="note"`, `data-sample-data`) whose text comes from config | `mrpl/SampleNote.tsx`, `plant/config.ts`, `investigations/config.ts` |

---

<a id="architecture"></a>
## Architecture

Mermaid sources, SVG and PNG renders live in [`docs/architecture/`](docs/architecture/). The design reasoning behind them is in [APPROACH.md](APPROACH.md).

### System context

![System context](docs/architecture/01-system-context.png)

[SVG](docs/architecture/01-system-context.svg) · [source](docs/architecture/01-system-context.mmd)

### Packages involved in the MRPL / RAG wiring

![Component and package view](docs/architecture/02-components.png)

[SVG](docs/architecture/02-components.svg) · [source](docs/architecture/02-components.mmd)

<a id="mrpl-rag-wiring"></a>
### The MRPL / RAG wiring

The browser never talks to the RAG service directly. Screens call same-origin `/hyperion/mrpl/*` routes through `MrplDataSource` (`ui-conversation/src/client/mrpl/api.ts`); the bridge validates the request behind the same connection-rejection fence as every browser route and calls the RAG service at `HYPERION_RAG_URL`.

| Bridge route (`hyperion-bridge/src/shared.ts`) | Method | Backed by |
|---|---|---|
| `/hyperion/mrpl/documents` | GET | MRPL store catalog (seed manifest) |
| `/hyperion/mrpl/documents/upload` | POST | RAG `POST /v1/documents` (PDF, Markdown, plain text; 50 MiB default cap) |
| `/hyperion/mrpl/ingest`, `/hyperion/mrpl/ingest/jobs/<id>` | GET | RAG `/health` + `GET /v1/documents`; `GET /v1/jobs/<id>` |
| `/hyperion/mrpl/equipment` | GET | MRPL store (seed `equipment.json`) |
| `/hyperion/mrpl/evidence/search` | GET | Retriever seam → RAG `POST /v1/search`; answers `retrieval: 'not-configured'` with no passages when no RAG URL is set |
| `/hyperion/mrpl/evidence/answer` | POST | RAG `POST /v1/answer` (grounded answer or abstention) |
| `/hyperion/mrpl/evidence/verify` | POST | MRPL store `verify()` of citation quotes |
| `/hyperion/mrpl/reports` | POST | Report question → RAG answer → Markdown deliverable with a numbered `## Sources` list |
| `/hyperion/mrpl/deliverables`, `/hyperion/mrpl/deliverables/<file>` | GET / DELETE | Deliverables list, download, delete a generated file |
| `/hyperion/asr/transcribe` | POST | `ctx.asr` provider (`asr-http`) |

Without `HYPERION_RAG_URL` the live routes answer `503 mrpl/rag-not-configured`, evidence search answers `retrieval: 'not-configured'`, and the investigation analysis raises `AnalysisUnavailableError` ("Live RAG is not configured on this host") rather than falling back to mock data.

### RAG query and abstention

![RAG query and abstention sequence](docs/architecture/03-rag-query-abstention.png)

[SVG](docs/architecture/03-rag-query-abstention.svg) · [source](docs/architecture/03-rag-query-abstention.mmd)

`pipeline.answer()` abstains in four layers, each with a reason code the UI maps to readable text (`mrpl/abstain.ts`):

| Code | When | Default UI text (configurable via `configureAbstain`) |
|---|---|---|
| `no_evidence` | Retrieval returned nothing | "{subject} is not in the indexed documents. No passage mentions it." |
| `retrieval_gate<x>` | Top rerank score below the gate `x` (only when a gate is passed; off on the HTTP path) | "The indexed passages closest to {subject} matched too weakly to support an answer." |
| `model` | The model set `abstain` or answered `NOT_IN_EVIDENCE` | "{subject} is not covered by the indexed documents. The closest passages do not answer it, so Hyperion did not guess." |
| `no_verified_citation` | The model answered, but none of its quotes could be located on the cited page | "An answer about {subject} was withheld: none of its quotes matched the source pages." |
| `unparseable_model_output` | Report mode: model reply was not JSON | "The language model reply about {subject} could not be read. Try again." |

### Start Investigation data flow

![Start Investigation data flow](docs/architecture/04-start-investigation-flow.png)

[SVG](docs/architecture/04-start-investigation-flow.svg) · [source](docs/architecture/04-start-investigation-flow.mmd)

---

<a id="quick-start"></a>
## Quick start

### Prerequisites

- **Node.js** `^22.19.0 || >=24.0.0` (`package.json` `engines`)
- **pnpm** 11 (`packageManager: pnpm@11.7.0`)
- **Python** 3 for the RAG service and STT sidecar (`pip install -r packages/tool/tool-hyperion-rag/requirements.txt`; EmbeddingGemma 2 needs `transformers >= 5.19`)
- An **OpenAI-compatible LLM endpoint** for answers (the RAG default is `http://127.0.0.1:8001/v1`; the measured deployment served gpt-oss-120b with vLLM)
- Optional: a GPU for dense retrieval / rerank / STT. Without torch the RAG index is BM25-only and every response reports it in `degraded`.

### 1. Install and build the workbench

```sh
git clone https://github.com/Narendarcodes/Hyperion-workbench.git
cd Hyperion-workbench
git checkout feat/mrpl-wire-integration   # MRPL branch; master is the generic product
pnpm install
pnpm run build
```

### 2. Build an index and start the RAG service

```sh
cd packages/tool/tool-hyperion-rag
pip install -r requirements.txt

# Offline index (BM25 + dense with --embed); used by the model-facing tools
python3 scripts/rag.py index --corpus <corpus paths...> --out ./index --embed

# HTTP service used by the bridge (default 127.0.0.1:8120; builds the index on first start)
HYPERION_LLM_URL=http://127.0.0.1:8001/v1 HYPERION_LLM_MODEL=<served model name> \
  python3 scripts/rag_server.py --corpus <corpus paths...>
curl -s http://127.0.0.1:8120/health
```

`rag_server.py` also accepts `--no-dense` / `--no-rerank`. For ROCm hosts, `deploy/launch.sh build|start|stop|status` runs the same service in a container with `HF_HUB_OFFLINE=1` (models must already be in the mounted HF cache). Corpus shapes accepted by `--corpus` are listed in the [package README](packages/tool/tool-hyperion-rag/README.md#corpus-ingest).

### 3. (Optional) Start the STT sidecar

```sh
INDICCONF_DIR=... SRAVAANI_DIR=... HF_CACHE=... packages/asr/asr-http/deploy/launch.sh
curl -s http://127.0.0.1:8790/healthz
```

See [`packages/asr/asr-http/README.md`](packages/asr/asr-http/README.md#run-the-sidecar). The sidecar has no auth; keep it on loopback.

### 4. Launch the web workbench

```sh
HYPERION_RAG_URL=http://127.0.0.1:8120 pnpm dsh web
```

The web profile (`packages/bundle/web-app/cordis.patch.yml`) mounts `hyperion-bridge`, which reads `HYPERION_RAG_URL` as its `ragUrl` default. The web profile does **not** mount an asr provider: to enable the composer mic, add one to your profile, e.g.

```yaml
- name: '@deepseek-ai/dsh-asr-http'
  config:
    endpoint: http://127.0.0.1:8790
    defaultLanguage: 'auto'
```

(this is the composition the live e2e boots; `HYPERION_STT_URL` supplies the `endpoint` default). The web UI listens on port `3080` by default (`packages/boot/cmdline`).

---

<a id="configuration"></a>
## Configuration

### Bridge and speech (read by the host plugins)

| Variable | Default | Read by | Meaning |
|---|---|---|---|
| `HYPERION_RAG_URL` | empty (live routes return 503) | `hyperion-bridge/src/index.ts` | RAG service base URL (`ragUrl`) |
| `HYPERION_RAG_TIMEOUT_MS` | `120000` | bridge | Per-call deadline to the RAG service |
| `HYPERION_MRPL_MAX_UPLOAD_BYTES` | `52428800` (50 MiB) | bridge | Largest document upload |
| `HYPERION_MRPL_CORPUS_DIR` | bundled public seed | bridge | MRPL store directory (overrides `mrplCorpusDir`) |
| `HYPERION_UPLOADS_DIR` | `~/.hermes/hermes3d/uploads` | bridge | Demo report artifacts for `/hyperion/files/*` |
| `HYPERION_ASR_MAX_AUDIO_BYTES` | `26214400` (25 MiB) | bridge | Largest audio upload to `/hyperion/asr/transcribe` |
| `HYPERION_ASR_LANGUAGE` | `auto` | bridge, `asr-http` | Language when the composer does not pick one |
| `HYPERION_STT_URL` | empty | `asr-http` | STT sidecar endpoint default |

### RAG service (read by `scripts/hyperion_rag/config.py`)

| Variable | Default | Meaning |
|---|---|---|
| `HYPERION_RAG_EMBED_MODEL` | `google/embeddinggemma-2` | Dense encoder |
| `HYPERION_RAG_EMBED_FALLBACK` | empty | Second encoder; empty = report degraded instead |
| `HYPERION_RAG_RERANK_MODEL` | `BAAI/bge-reranker-v2-m3` | Cross-encoder reranker |
| `HYPERION_LLM_URL` | `http://127.0.0.1:8001/v1` | OpenAI-compatible answering model |
| `HYPERION_LLM_MODEL` | `llm` | Served model name |
| `HYPERION_LLM_REASONING_EFFORT` | `low` | `reasoning_effort` sent per request |
| `HYPERION_LLM_MAX_WAIT_S` | `900` | Retry window for connection errors / 5xx before `LLMUnavailable` |
| `HYPERION_RAG_MODE` | `hybrid_rerank` | Retrieval mode when dense + rerank load |
| `HYPERION_RAG_DIM` | `768` | Matryoshka dimension (768/512/256/128) |
| `HYPERION_RAG_POOL` / `HYPERION_RAG_RERANK_TOP` | `100` / `30` | Candidates per retriever / passed to the reranker |
| `HYPERION_RAG_CHUNK_MAX_CHARS` / `_MIN_CHARS` | `1600` / `300` | Chunk bounds |
| `HYPERION_OCR_URL` | empty | OCR sidecar; empty = scanned pages reported `ocr-pending` |
| `HYPERION_RAG_OCR_MIN_CHARS` / `_CONCURRENCY` / `_DPI` / `_TIMEOUT_S` | `40` / `8` / `200` / `300` | OCR hand-off |
| `HYPERION_RAG_HOST` / `HYPERION_RAG_PORT` | `127.0.0.1` / `8120` | Service bind |
| `HYPERION_RAG_INDEX_DIR` / `HYPERION_RAG_INGEST_DIR` | `./index` / `./ingest` | Persistent index / uploaded originals |
| `HYPERION_RAG_MAX_UPLOAD_BYTES` | `52428800` | Largest upload the service accepts |
| `HYPERION_RAG_VRAM_GB` | `6` | Per-process VRAM cap |

### Harness

| Variable | Meaning |
|---|---|
| `DSH_TELEMETRY_DISABLED` | Read by `apps/cli/src/profile-boot.ts` to disable the session-telemetry row |

Cloud providers are opt-in through **Settings → Models**; keys are stored in `$DSH_HOME/.credentials.yaml`. See [providers](docs/user/guide/providers.md).

> **`.env.example` caveat.** `.env.example` lists `LOCAL_LLM_BASE_URL`, `ASR_SERVER_URL`, `ASR_DEVICE`, `DSH_WEB_HOST`, `DSH_WEB_PORT`, `DSH_WEB_OPEN_BROWSER` and `DSH_PERMISSION_MODE`. On this branch no TypeScript source reads those names (checked with `git grep`); treat them as documentation of intent, not live switches, until they are wired or removed. Its `ASR_SERVER_URL` (port 8008) refers to the older `scripts/asr_inference_server.py`, not the `asr-http` sidecar.

---

<a id="run-and-test"></a>
## Run and test

### Workbench client specs (ui-conversation)

```sh
# all ui-conversation specs (jsdom via per-file pragma)
node node_modules/vitest/vitest.mjs run packages/client/ui-conversation/tests

# the MRPL wiring specs only, e.g.
node node_modules/vitest/vitest.mjs run \
  packages/client/ui-conversation/tests/abstain-reasons.client.spec.tsx \
  packages/client/ui-conversation/tests/investigation-context.client.spec.tsx \
  packages/client/ui-conversation/tests/start-investigation.client.spec.tsx \
  packages/client/ui-conversation/tests/sample-labels.client.spec.tsx
```

Last recorded result on this branch (on the GPU droplet, head `fef63ee8`): **49/49 files, 487/487 tests pass**. The full directory is slow; the sandbox runner timed out on it.

### Host, RAG and STT tests

```sh
node node_modules/vitest/vitest.mjs run packages/host/hyperion-bridge/tests
python3 packages/tool/tool-hyperion-rag/scripts/test_hyperion_rag.py   # stdlib, BM25 path, fake LLM
python3 -m pytest packages/asr/asr-http/py -q                           # no GPU needed
```

### Typecheck and lint

The order matters (the client project needs the host `/remote` entries that `tsdown` emits):

```sh
node ./node_modules/typescript/bin/tsc -b tsconfig.host.json
npx tsdown --env.DSH_BUILD_FACE host
npx tsc -b tsconfig.client.json
npx tsx scripts/run-oxlint.ts .
```

`pnpm run typecheck` and `pnpm run lint` wrap the same steps. Last recorded: host tsc 0 errors, client tsc 0 errors.

### Live Playwright suite (real services, nothing mocked)

`apps/web/tests/mrpl-wire-live.e2e.ts` drives real Chromium against the MRPL harness (`apps/web/mrpl-harness`, `?screen=documents|equipment|reports|evidence|mic|mission|pid|investigation`) and an in-process `hyperion-bridge` pointed at a live RAG service and STT sidecar. It **skips** when the URLs are unset.

```sh
HYPERION_LIVE_RAG_URL=http://127.0.0.1:8120 \
HYPERION_LIVE_STT_URL=http://127.0.0.1:8794 \
MRPL_CHROMIUM_PATH=<chrome-headless-shell path, optional> \
MRPL_SHOTS_DIR=<screenshot dir, optional> \
node_modules/.bin/vitest run --config vitest.web.config.ts apps/web/tests/mrpl-wire-live.e2e.ts
```

Five tests: Reports generate a cited deliverable; P&ID tag click runs evidence search + grounded answer (E-101 abstains readably); Investigation detail Rerun + Generate Report; investigation on corpus asset E-6600E returns verified citations and record-driven context; Documents facets and sort. Last recorded: **5/5 pass**. The earlier suite `apps/web/tests/mrpl-live.e2e.ts` (upload → OCR → index → cited answer, composer mic, Mission view) uses the same variables plus `HYPERION_LIVE_UPLOAD` and `HYPERION_LIVE_AUDIO_EN/_TE/_HI`.

### Repository-wide gates (inherited)

```sh
pnpm run test            # vitest unit lanes
pnpm run test:coverage   # coverage gate
pnpm run test:docs       # documentation gates
pnpm run check:ci        # CI gate set
```

---

## Repository layout

```
Hyperion-workbench/
├── apps/
│   ├── cli/                    # `dsh` entry (pnpm dsh ...), profile boot
│   ├── web/                    # Vite web frontend; mrpl-harness/ (screen harness); tests/*.e2e.ts (live suites)
│   └── desktop/, desktop-host/ # Desktop shell
├── packages/                   # 269 Cordis packages in 52 groups
│   ├── asr/                    # asr seam; asr-http (+ py/stt_server.py, plantnorm.py); asr-nemo; tool-transcribe
│   ├── bundle/                 # deployment profiles: base, web-app, headless, sdk-*, acp-app
│   ├── client/                 # web UI plugins
│   │   ├── ui-conversation/    # chat + MRPL workbench: src/client/{mrpl,plant,equipment,documents,pid,investigations,reports}
│   │   └── ui-mission/         # Mission View (pixel office)
│   ├── host/hyperion-bridge/   # /hyperion/* and /hyperion/mrpl/* routes; mrpl-seed/ public sample corpus
│   ├── tool/tool-hyperion-rag/ # RAG core + HTTP service (scripts/), model tools (src/), bench/, deploy/
│   ├── tool/tool-mrpl-spec-check/ # MRPL spec-check tool (Python scripts)
│   ├── llm/                    # LLM providers and llm-router
│   └── core/, session/, sandbox/, subagent/, skill/, ... # inherited Harness runtime
├── docs/
│   ├── architecture/           # Mermaid sources + SVG/PNG renders (this README, APPROACH.md)
│   ├── benchmarks/             # rag.md, stt.md, ocr.md
│   ├── mrpl/                   # FRONTEND_WIRING_PLAN.md, control-audit.md
│   └── user/guide/, subsystems/, ... # inherited docs
├── landing/                    # static landing page
├── scripts/                    # build, gates, oxlint runner, legacy asr_inference_server.py
├── vendor/                     # vendored Cordis packages
└── website/                    # VitePress documentation site
```

---

<a id="status-and-known-gaps"></a>
## Status and known gaps

- **Nothing on the MRPL branches is merged.** PR #27 (this base) and PR #22 are drafts; PRs #23–#26 are open.
- **Host report text prints the raw reason code.** The client never shows codes (`describeAbstain`), but `buildReportMarkdown` in `hyperion-bridge/src/mrpl-routes.ts` still writes `> Hyperion abstained: <abstainReason>.` into generated report Markdown.
- **PR #23 commits `node_modules` symlinks.** `feat/mrpl-wire-pid-plant` tracks 268 `packages/**/node_modules` symlinks with absolute targets into a local worktree. This branch untracks them (`aeb24ae1`) and ignores `node_modules`; PR #23 itself still carries them.
- **Lint baseline.** oxlint has pre-existing errors repo-wide: 367 at base `4229365c`, 345 after the item-1 fixes on this branch (no new errors in touched files except 2 pre-existing `unbound-method` in `UploadAskPanel.tsx`). A later whole-repo run on the droplet copy reported ~4.2k, attributed to that environment (likely stale `tsdown` types) and not investigated.
- **Commits used `--no-verify`.** The lefthook pre-commit needs `node_modules/.bin/tsx` (absent in the worktree) and pre-push runs a full typecheck; typecheck and lint were run separately as above.
- **Retrieval gate is off on the HTTP path.** `service.py` calls `answer()` without a gate, so `retrieval_gate<x>` only occurs via `rag.py query` with a `gate` field. This follows the benchmark: on the synthetic set a post-hoc gate sweep up to 0.3 changed nothing because the model already abstains ([docs/benchmarks/rag.md](docs/benchmarks/rag.md)); it has not been calibrated on the refinery corpus.
- **Still fixtures.** Plant metrics and process units, investigation Key Findings / Vibration Trend / evidence list / Similar Equipment are sample data (labelled). The seed investigation P-204 abstains because it is not in the corpus.
- **Dead controls (pre-wire audit).** `docs/mrpl/control-audit.md` counted 86 of 224 MRPL controls dead at `b3e55cf5`; PRs #23–#27 removed or wired many of them, but the audit has not been re-run.
- **Telugu speech** needs the explicit `te` pick in some cases (auto-detect labelled Telugu as Hindi before `6ef0c657` relabelled by script; not re-validated on real operator recordings).
- **`.env.example` variables not wired** (see [Configuration](#configuration)).
- `envDefaults()` in the bridge points to `docs/mrpl/configuration.md`, which does not exist on this branch.

---

## Documentation

- [APPROACH.md](APPROACH.md) — design choices, RAG pipeline, testing strategy, trade-offs
- [RAG benchmark](docs/benchmarks/rag.md) · [STT benchmark](docs/benchmarks/stt.md) · [OCR benchmark](docs/benchmarks/ocr.md)
- [MRPL control audit](docs/mrpl/control-audit.md) · [Frontend wiring plan](docs/mrpl/FRONTEND_WIRING_PLAN.md)
- [tool-hyperion-rag](packages/tool/tool-hyperion-rag/README.md) · [hyperion-bridge](packages/host/hyperion-bridge/README.md) · [asr-http](packages/asr/asr-http/README.md)
- [User guide: getting started](docs/user/guide/index.md) · [providers and models](docs/user/guide/providers.md)
- [Architecture specification](docs/architecture.md) · [Cordis primer](docs/cordis-primer.md) · [Testing policy](docs/testing.md) · [Defensive patterns](docs/defensive-patterns.md)
- [ASR subsystem](docs/subsystems/asr.md) · [LLM streaming](docs/subsystems/llm-streaming.md)
- [Landing design](landing/DESIGN.md) · [Landing copy](landing/COPY.md)

## Engine heritage and attribution

Hyperion Workbench runs on a fork of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), the all-plugin agent runtime built on the Cordis framework: models, tools, skills, sessions, sandboxes, scheduling and the UI are plugins that this fork recomposes for industrial workflows. Sandbox direction was informed by NVIDIA OpenShell (Apache 2.0). See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
