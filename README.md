# HYPERION WORKBENCH

<div align="center">

[![Platform: On-Premise](https://img.shields.io/badge/Deployment-100%25%20On--Premise-emerald.svg)](#key-capabilities) [![AI Architecture: Sovereign](https://img.shields.io/badge/Architecture-Sovereign%20%26%20Air--Gapped-orange.svg)](#architecture) [![SIH: 2026](https://img.shields.io/badge/Smart%20India%20Hackathon-SIH26117-red.svg)](#overview) [![Voice: Indic Conformer](https://img.shields.io/badge/Voice%20ASR-Indic%20Conformer%20(22%20Langs)-purple.svg)](#1-indic-conformer-asr-voice-to-prompt)

**Sovereign Intelligence for Industrial Knowledge Work — Intelligence That Never Leaves Your Network.**

[Explore Architecture](#architecture) • [Quick Start](#quick-start) • [Capabilities](#key-capabilities) • [Landing Page](landing/index.html) • [Documentation](docs/user/guide/index.md)

</div>

---

## Overview

**Hyperion Workbench** is a sovereign, on-premise agentic AI operating environment built specifically for confidential industrial operations, critical infrastructure, and defense knowledge work (**SIH 2026 Problem SIH26117**).

Modern enterprises face a severe dilemma: proprietary CAD blueprints, operational logs, and classified technical manuals cannot be sent to third-party cloud LLM APIs due to strict data sovereignty and compliance laws. Generic local agents often hallucinate, lack domain auditing, and operate as unverified "black boxes."

**Hyperion solves this through 4 foundational pillars:**

1. **100% Air-Gapped Local Inference**: Native integration with on-premise LLMs (Qwen, LLaMA, DeepSeek via Ollama / llama.cpp / vLLM / LM Studio) with zero cloud telemetry.
2. **Indic Conformer Multilingual Voice ASR**: Built-in, low-latency automatic speech recognition supporting 22 Indian languages (Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Odia, Punjabi, Assamese, Urdu, and more) for plant-floor voice prompting.
3. **NN/g Explainable AI & Verifiable Trajectory**: Every agent conclusion is anchored with exact source-file citations, tool execution diffs, and inspectable network endpoints — a 9-stage evidence trail from capture to archive.
4. **Cordis Micro-Plugin Substrate**: Modular spatiotemporal plugin architecture where tools, models, UI views, and security guardrails are dynamic, composable micro-services.

---

## Architecture

Hyperion Workbench uses a layered, reactive micro-kernel powered by the Cordis plugin framework:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      HYPERION WORKBENCH UI (Port 3080)                  │
│   Chat Stream  •  Voice Mic (ASR)  •  Trajectory Panel  •  Workspace    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ RPC / SSE Transport
┌────────────────────────────────────▼────────────────────────────────────┐
│                    CORDIS REACTIVE PLUGIN SUBSTRATE                     │
│  ┌───────────────────────┐ ┌──────────────────┐ ┌────────────────────┐  │
│  │   LLM Adapter Layer   │ │  Tool Execution  │ │  Session & Memory  │  │
│  │ (llama.cpp / Ollama)  │ │ (FS / Terminal)  │ │ (SQLite / History) │  │
│  └───────────────────────┘ └──────────────────┘ └────────────────────┘  │
│  ┌───────────────────────┐ ┌──────────────────┐ ┌────────────────────┐  │
│  │ Indic Conformer ASR   │ │ Guardrails & ACL │ │ Explainability Eng │  │
│  │ (Python FastAPI 8008) │ │ (Host Isolation) │ │ (Citations / Diff) │  │
│  └───────────────────────┘ └──────────────────┘ └────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                  SOVEREIGN ON-PREMISE HARDWARE STACK                    │
│        Local NVIDIA GPU / Workstation  •  No External Internet Required │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Capabilities

### 1. Indic Conformer ASR (Voice-to-Prompt)
- Plant engineers and operators can dictate technical queries directly via microphone.
- Integrated Python inference server running NVIDIA NeMo / IndicConformer / Whisper checkpoints via a sidecar process.
- Supports 22 scheduled Indian languages with auto-punctuation and transcription paste into the composer bar.
- Voice pill UI with ChatGPT-style takeover: discard (ghost X), live scrolling transcript, stop (outlined square), send (blue arrow).

### 2. NN/g Explainable AI Trajectory (9-Stage Evidence Trail)
- Replaces black-box generation with step-by-step observable decision trajectories.
- Inline citation badges `[1]`, `[2]` linking directly to verified file offsets and tool observations.
- Real-time display of provider, model, latency, tokens consumed, and target execution endpoint.
- **9 stages**: Capture → Understand → Ground → Analyze → Verify → Decide → Deliver → Review → Archive.
- High-risk claims grouped for human confirmation regardless of model confidence.

### 3. Bounded Sandboxed Tool Runtime
- Deterministic tools for filesystem reading/editing (`read_pdf`, `ast_edit`, `edit`, `read`, `write`, `read_image`).
- Persistent terminal execution with process-tree isolation and cancellation tokens.
- Prevents runaway tool execution through strict per-call timeout policies.
- Small-model binary-file guidance: automatic per-extension hints on `FS_NOT_TEXT` (pdf, docx, xlsx, images).

### 4. Hyperion Mission View — Living Office Simulation
- Dynamic agents with dedicated personal cabins (desk, monitor, chair, status indicator).
- Shared collaborative work areas (Documents, Knowledge Base, Analysis, Tools/Code, Testing, Verification, Report/Delivery, Orchestrator) with deterministic seat allocation.
- Multi-step real-execution workflows: Cabin → Knowledge Base → Code → Testing → Verification → Orchestrator → Cabin.
- RAF movement interpolation along safe floor corridors; cold replay and incremental live streams produce byte-identical snapshots.
- Speech bubbles, verification checkpoints, and deliverable visualization.

### 5. Sovereignty Monitor — Visible Proof, Not Promises
- Live dashboard: External Network (blocked), Model Inference (on-premise), Knowledge (local corpus), Sandbox (active/resource-limited), Tool Gateway (allowlist), Audit Trace (recording).
- Gateway decision feed showing every allow/deny with justification.
- Zero uncontrolled egress routes counter.
- Status labels describe deployment policy; validate configuration before claiming air-gap.

### 6. Real Deliverables with Trace Metadata
- DOCX approval notes, XLSX calculations, PPTX reports, and working code generated with full evidence trail attached.
- Deterministic office generation: preserves document formatting, tables, charts, and annotations.
- Manager review UI: summary, key findings, high-risk claims, evidence, engineer verification status — Approve, Reject, or Request Changes per claim.
### 7. Multimodal Intake & Industrial Vision
- Local OCR and vision (pymupdf, pypdf, python-docx, pandas/openpyxl) turn scans, photos, handwritten notes, drawings, P&IDs, and schematics into inspectable text, tables, regions, and structured data.
- Industrial image analysis: defect detection, bounding boxes, tag extraction, and visual verification against standards.
- Local knowledge base with version, authority, and effective-date metadata — every claim links to document, page, and section.

### 8. Local Industrial RAG & Evidence Fusion
- Ingestion pipeline: PDF → page extraction → OCR fallback → chunking → embeddings → vector store → retrieval → grounded prompt → citations.
- Qdrant/ChromaDB support for semantic search with relevance filtering and source citations.
- Evidence fusion: combines PDF, OCR, images, Excel, SOPs, page citations, and sandboxed calculations into unified decisions.
- Human-in-the-loop approval workflow with claim-level verification and trace metadata.

### 9. Model Router — Local-First, Capability-Aware
Open-weight models registered with capability, modality, and compute profile. Tasks route to the smallest model that can do the job — locally. Supports: llama.cpp, Ollama, vLLM, LM Studio, and custom OpenAI-compatible gateways. Cloud providers (DeepSeek, OpenAI, Anthropic, etc.) available as opt-in via Settings → Models.

---

<a id="run"></a>
## Quick Start

### Prerequisites
- **Node.js**: `^22.19` or `>=24`
- **pnpm**: `^10.0` or `^11.0`
- **Python**: `>=3.10` (for Indic ASR inference server)
- **Local LLM Server**: [llama.cpp](https://github.com/ggerganov/llama.cpp) or [Ollama](https://ollama.ai/) running locally (e.g. `http://127.0.0.1:11434` or `http://127.0.0.1:8080/v1`)

> **No API key required to start.** The default provider is `local` (Ollama at `http://127.0.0.1:11434/v1`) with model `qwen3.5:4b`. Copy `.env.example` to `.env` and customize if needed.

### Installation & Launch

```sh
# 1. Clone the repository
git clone https://github.com/Narendarcodes/Hyperion-workbench.git
cd Hyperion-workbench

# 2. Install workspace dependencies
pnpm install

# 3. Build host and client packages
pnpm run build

# 4. Launch the Hyperion Workbench Web Interface
pnpm dsh web
```

The Workbench will start on **`http://127.0.0.1:3080`** and open automatically in your default browser.

<a id="run-from-source"></a>
### Run from Source (Development)
```sh
# With tsx ESM hook (hot reload for source changes)
pnpm dsh --profile web "your task"
```

### (Optional) Start the Indic ASR Voice Server

```sh
# In a separate terminal
python scripts/asr_inference_server.py --port 8008 --device cuda
```

---

## Configuration

The workbench runs **local-first** by default. See [`.env.example`](.env.example) for all options.

| Variable | Default | Description |
|----------|---------|-------------|
| `DEEPSEEK_API_KEY` | — | Cloud DeepSeek API key (optional, for cloud provider) |
| `OPENAI_API_KEY` | — | OpenAI API key (optional) |
| `ANTHROPIC_API_KEY` | — | Anthropic API key (optional) |
| `LOCAL_LLM_BASE_URL` | `http://127.0.0.1:11434/v1` | Local llama.cpp/Ollama/vLLM endpoint |
| `ASR_SERVER_URL` | `http://127.0.0.1:8008` | Indic ASR FastAPI server |
| `DSH_WEB_PORT` | `3080` | Web UI port |
| `DSH_PERMISSION_MODE` | `workspace-write` | Sandbox: `read-only` \| `workspace-write` \| `danger-full-access` |
| `DSH_TELEMETRY_DISABLED` | `1` | Set empty to enable OTel export |

**Add cloud providers in Settings → Models** — keys are stored in `$DSH_HOME/.credentials.yaml` (never in process env).

---

## Benchmark Comparison

| Metric / Dimension | Cloud AI Assistants (Copilot/Claude) | Generic Local Agents | **Hyperion Workbench** |
| :--- | :--- | :--- | :--- |
| **Data Privacy** | Cloud transmission (High risk) | Local (Variable) | **100% Air-Gapped On-Premise** |
| **Regional Language Voice** | English-centric / Cloud ASR | None | **Indic Conformer (22 Indian Langs)** |
| **Explainability** | Black-box output | Raw terminal logs | **NN/g Visual Trajectory & Citations** |
| **Architecture** | Proprietary monolith | Script-based | **Cordis Extensible Micro-Plugin OS** |
| **Hardware Efficiency** | Requires cloud API | Unbounded memory | **Optimized for RTX 3080/4090 / Local vLLM** |
| **Sandboxing** | None | Ad-hoc | **Process-tree isolation, deny-by-default** |
| **RAG Depth** | Cloud knowledge only | Basic local retrieval | **PDF → OCR → embeddings → citations → evidence fusion** |
| **Deliverable Formats** | None | Limited | **DOCX, XLSX, PPTX with trace metadata** |
| **Audit Trail** | None | Manual | **Complete event log + sovereignty monitor** |

---

## Repository Structure

```
Hyperion-workbench/
├── .env.example              # Environment template (local-first, no keys required)
├── landing/                  # Industrial interactive landing page (HTML/CSS/GSAP)
│   ├── index.html            # Hero, workflow, capabilities, sovereignty, roles, run
│   ├── COPY.md               # Landing copy sourced from PRD/BRAND
│   ├── DESIGN.md             # Design system: navy/cream, Archivo/IBM Plex, GSAP
│   ├── js/                   # Gallery tunnel, hex comb, main entry
│   ├── css/                  # Style, tokens
│   ├── assets/               # SVG, fonts (self-hosted Archivo, IBM Plex, Satoshi)
│   └── research/             # Competitor analysis: sarvam.ai, gnani.ai, originkit
├── packages/                 # Core Cordis workspace packages (70+)
│   ├── asr/                  # Indic Conformer ASR capability seam
│   │   ├── asr/              # Service definition: AsrTranscriber (resolve/transcribe)
│   │   ├── asr-nemo/         # NeMo sidecar provider (py/transcribe.py)
│   │   └── tool-transcribe/  # Model tool: transcribe_audio (file → text)
│   ├── bundle/               # Deployment profiles
│   │   ├── base/             # Shared core: local provider, sandbox, session, tools
│   │   ├── web-app/          # Browser surface: webserver, HMR, client plugins
│   │   ├── headless/         # One-shot CLI runner
│   │   ├── sdk-minimal/      # Minimal SDK server
│   │   └── acp-app/          # ACP protocol server
│   ├── client/               # Web UI plugins (30+)
│   │   ├── ui-mission/       # Mission View: living office, phases, verification
│   │   ├── ui-conversation/  # Chat stream, trajectory inspector, composer
│   │   ├── ui-settings-models/  # Provider/model management UI
│   │   └── ...               # Layout, sidebar, theme, workspace, approvals, etc.
│   ├── core/                 # Agent loop, session, system-prompt, agent-default-model
│   ├── credentials/          # Credential seam + local file/env provider
│   ├── fs/                   # Sandboxed filesystem, PDF tools, search
│   ├── llm/                  # LLM capability: llm-deepseek, llm-pi-ai, token-meter
│   ├── shell/                # Bash/PowerShell persistent sessions
│   ├── subprocess/           # Process tree + Win32 library
│   ├── terminal/             # Persistent terminal sessions
│   ├── lsp/                  # Language server capability
│   ├── skill/                # Skill provider registry + local + catalog loader
│   ├── web/                  # Web search (DeepSeek/Exa/Perplexity) + fetch
│   ├── workflow/             # Worker-thread workflow engine
│   ├── session/              # JSONL persistence, projection, titles, telemetry
│   ├── sandbox/              # Policy + local provider + Win32 ACL
│   ├── subagent/             # Subagent capability + spawn/fork/in-process/codex/claude-code
│   ├── preset/               # Per-session agent composition from cordis.yml
│   ├── hooks/                # Claude Code / Codex hook bridges
│   └── ...                   # interaction, plan, todo, guard, identity, etc.
├── scripts/                  # ASR inference server, gate verification, build
├── docs/                     # Architecture, subsystems, user guide, cookbook
│   ├── architecture.md       # System architecture specification
│   ├── subsystems/           # ASR, LLM streaming
│   └── user/guide/           # Providers, models, configuration
└── website/                  # VitePress documentation site
```

---

## Models & Integrations

### Local Providers (Sovereign Default)
- **Ollama** — `http://127.0.0.1:11434/v1` — Qwen, LLaMA, DeepSeek-Coder, Phi, Gemma
- **llama.cpp** — `llama-server` OpenAI-compatible endpoint
- **vLLM** — High-throughput OpenAI-compatible server
- **LM Studio** — Local GUI with API server toggle

### Cloud Providers (Opt-In via Settings → Models)
- **DeepSeek Official** — `deepseek-v4-flash`, `deepseek-v4-pro`, `deepseek-v4-flash-vision-exp` (reasoning: off/low/high/max)
- **OpenAI** — GPT-4o, GPT-4o-mini, o1 series
- **Anthropic** — Claude Sonnet 4.5, Opus 4, Haiku 3.5
- **MoonshotAI (Kimi)** — K2, K1.5
- **Z.ai (GLM)** — GLM-4.5
- **Custom Gateway** — Any OpenAI-compatible / Anthropic-compatible endpoint

### Reasoning Controls
- DeepSeek native: `reasoningEffort: off | low | high | max`
- Custom gateways: `compat.thinkingFormat: deepseek` + `reasoningEfforts` per model

---

## Research & Competitor Analysis

Our landing page and architecture draw from deep analysis of leading sovereign AI platforms:

| Reference | Key Insights Applied |
|-----------|---------------------|
| **sarvam.ai** | Sovereignty as product principle (not afterthought); platform layers as capability groups; strong type hierarchy; contained WebGL instrument |
| **gnani.ai** | Editorial display face + understated UI face; clear capability taxonomy early; product interaction as evidence; ScrollTrigger section choreography |
| **Originkit** | Component inventory for design system extraction; dark navy mandate preserved |

**We borrowed narrative clarity and editorial hierarchy — not palette, fonts, or proof strategy.** Our design system mandates dark navy (`#0B1220`), Archivo display, IBM Plex Sans UI, and a single cream accent (`#FDDA98`).

---

## Documentation

- [User Guide: Providers & Models](docs/user/guide/providers.md)
- [User Guide: Getting Started](docs/user/guide/index.md)
- [Architecture Specification](docs/architecture.md)
- [ASR Subsystem](docs/subsystems/asr.md)
- [LLM Streaming Subsystem](docs/subsystems/llm-streaming.md)
- [Cordis Primer](docs/cordis-primer.md)
- [Defensive Patterns](docs/defensive-patterns.md)
- [Testing Policy](docs/testing.md)
- [Landing Page Design](landing/DESIGN.md)
- [Landing Copy](landing/COPY.md)
---

## Test & Verification

All tests run locally without requiring API keys.

### Test Coverage

- **Integration tests**: Model routing accuracy, multimodal extraction, sandbox execution, API contract validation
- **E2E workflows**: Complete task lifecycle from capture to deliverable generation
- **Sandbox verification**: Process-tree isolation, timeout enforcement, resource limits
- **Model routing tests**: Dynamic provider selection, hardware-aware routing, fallback behavior
- **Document verification**: DOCX/XLSX/PPTX generation with trace metadata, citation validation

### Verification Evidence

| Test Type | Coverage | Notes |
|-----------|----------|-------|
| Model routing | 24 tests | Includes dynamic provider selection, hardware presets, fallback paths |
| Multimodal extraction | 7 tests | PDF, image, P&ID parsing, multi-source fusion |
| Sandbox execution | 18 tests | Timeout enforcement, process isolation, resource limits |
| Deliverable generation | 6 tests | DOCX/XLSX/PPTX with citations and metadata |
| Egress verification | 3 tests | Network policy checks, air-gap proof |

### Running Tests

```sh
# Unit tests (keyless, runs on fork PRs)
pnpm run test

# Coverage gate (CI requirement: per-file 100% on packages/*/*/src)
pnpm run test:coverage

# Documentation gates
pnpm run test:docs

# Full CI checks
pnpm run check:ci
```


---

## Development

```sh
# Type-check everything
pnpm run typecheck

# Lint
pnpm run lint

# Unit tests (keyless)
pnpm run test

# Coverage gate (CI: per-file 100% on packages/*/*/src)
pnpm run test:coverage

# Documentation gates
pnpm run test:docs

# Build all
pnpm run build

# Full hygiene + publish checks
pnpm run hygiene
```

---

## Engine Heritage

Hyperion Workbench runs on our fork of **DeepSeek Harness** — the open-source all-plugin agent runtime built on the Cordis framework.

We chose it because the harness — not the model — decides how much of a model's capability becomes completed, reliable work. DeepSeek's published benchmarks (Terminal-Bench 87.9, Cybergym 83.3, Toolathlon 74.1, all via Harness minimal mode with fixed sampling and maximal reasoning effort) demonstrate that the runtime architecture is the force multiplier.

Same model weights, different harness: an independent rerun of V4-Flash on a third-party harness swung Terminal-Bench by twenty tasks. That swing is exactly why our workbench fork is the investment: every capability — models, tools, skills, sessions, sandboxes, scheduling, even the UI — is a plugin we recompose for MRPL's workflow.

**Upstream:** [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) **Sandbox direction informed by:** NVIDIA OpenShell (Apache 2.0) **Requirements per:** SIH26117 Product Requirements Document

---

## Attribution

Hyperion Workbench builds upon the open-source Cordis plugin framework and foundational runtime primitives from DeepSeek Harness, extending them into a fully sovereign, voice-enabled, and explainable industrial AI workstation.

**Engine:** Our fork of DeepSeek Harness (open-source, all-plugin Cordis runtime) **Sandbox policy direction:** NVIDIA OpenShell (Apache 2.0) **Workflow, roles, sovereignty requirements:** SIH26117 PRD