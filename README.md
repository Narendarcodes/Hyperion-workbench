# HYPERION WORKBENCH

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: On-Premise](https://img.shields.io/badge/Deployment-100%25%20On--Premise-emerald.svg)](#key-capabilities)
[![AI Architecture: Sovereign](https://img.shields.io/badge/Architecture-Sovereign%20%26%20Air--Gapped-orange.svg)](#architecture)
[![SIH: 2026](https://img.shields.io/badge/Smart%20India%20Hackathon-SIH26117-red.svg)](#overview)
[![Voice: Indic Conformer](https://img.shields.io/badge/Voice%20ASR-Indic%20Conformer%20(22%20Langs)-purple.svg)](#1-indic-conformer-asr-voice-to-prompt)

**Sovereign Intelligence for Industrial Knowledge Work — Intelligence That Never Leaves Your Network.**

[Explore Architecture](#architecture) • [Quick Start](#quick-start) • [Capabilities](#key-capabilities) • [Landing Page](landing/index.html) • [Contributing](CONTRIBUTING.md)

</div>

---

## Overview

**Hyperion Workbench** is a sovereign, on-premise agentic AI operating environment built specifically for confidential industrial operations, critical infrastructure, and defense knowledge work (**SIH 2026 Problem SIH26117**).

Modern enterprises face a severe dilemma: proprietary CAD blueprints, operational logs, and classified technical manuals cannot be sent to third-party cloud LLM APIs due to strict data sovereignty and compliance laws. Generic local agents often hallucinate, lack domain auditing, and operate as unverified "black boxes."

**Hyperion solves this through 4 foundational pillars:**
1. **100% Air-Gapped Local Inference**: Native integration with on-premise LLMs (Qwen, LLaMA, DeepSeek via Ollama / llama.cpp / vLLM) with zero cloud telemetry.
2. **Indic Conformer Multilingual Voice ASR**: Built-in, low-latency automatic speech recognition supporting Indian languages (Hindi, Bengali, Tamil, Telugu, Marathi, and more) for plant-floor voice prompting.
3. **NN/g Explainable AI & Verifiable Trajectory**: Every agent conclusion is anchored with exact source-file citations, tool execution diffs, and inspectable network endpoints.
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
│  │ Indic Conformer ASR   │ │ Guardrails & ACL │ │ Explainability Engine││
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
- Integrated Python inference engine running NVIDIA NeMo / IndicConformer / Whisper checkpoints.
- Supports 22 scheduled Indian languages with auto-punctuation and transcription paste into the composer bar.

### 2. NN/g Explainable AI Trajectory
- Replaces black-box generation with step-by-step observable decision trajectories.
- Inline citation badges `[1]`, `[2]` linking directly to verified file offsets and tool observations.
- Real-time display of provider, model, latency, tokens consumed, and target execution endpoint.

### 3. Bounded Sandboxed Tool Runtime
- Deterministic tools for filesystem reading/editing (`read_pdf`, `ast_edit`, `edit`, `read`, `write`).
- Persistent terminal execution with process-tree isolation and cancellation tokens.
- Prevents runaway tool execution through strict per-call timeout policies.

---

## Quick Start

### Prerequisites
- **Node.js**: `^22.19` or `>=24`
- **pnpm**: `^10.0` or `^11.0`
- **Python**: `>=3.10` (for Indic ASR inference server)
- **Local LLM Server**: [llama.cpp](https://github.com/ggerganov/llama.cpp) or [Ollama](https://ollama.ai/) running locally (e.g. `http://127.0.0.1:11434` or `http://127.0.0.1:8080/v1`)

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

### (Optional) Start the Indic ASR Voice Server

```sh
# In a separate terminal
python scripts/asr_inference_server.py --port 8008 --device cuda
```

---

## Benchmark Comparison

| Metric / Dimension | Cloud AI Assistants (Copilot/Claude) | Generic Local Agents | **Hyperion Workbench** |
| :--- | :--- | :--- | :--- |
| **Data Privacy** | Cloud transmission (High risk) | Local (Variable) | **100% Air-Gapped On-Premise** |
| **Regional Language Voice** | English-centric / Cloud ASR | None | **Indic Conformer (22 Indian Langs)** |
| **Explainability** | Black-box output | Raw terminal logs | **NN/g Visual Trajectory & Citations** |
| **Architecture** | Proprietary monolith | Script-based | **Cordis Extensible Micro-Plugin OS** |
| **Hardware Efficiency** | Requires cloud API | Unbounded memory | **Optimized for RTX 3080/4090 / Local vLLM** |

---

## Repository Structure

```
Hyperion-workbench/
├── landing/             # Industrial interactive landing page (HTML/CSS/GSAP)
├── packages/            # Core Cordis workspace packages
│   ├── asr/             # Indic Conformer ASR capability seam and tools
│   ├── core/            # Agent loop, session, and prompt runtime
│   ├── client/          # Web UI, chat view, trajectory inspector, and themes
│   ├── fs/              # Sandboxed filesystem and deterministic PDF tools
│   ├── llm/             # Sovereign LLM adapters (llama.cpp, Ollama, local routes)
│   ├── subprocess/      # Bounded persistent process execution
│   └── bundle/          # Configurable deployment profiles
├── scripts/             # ASR inference server and gate verification scripts
└── docs/                # Architecture specifications and subsystem design
```

---

## Contributing

We welcome contributions! Please check out [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on code standards, testing, and PR submissions.

---

## License & Attribution

This project is licensed under the [MIT License](LICENSE) &copy; 2026 Golla Narendar & Hyperion Workbench Contributors.

**Foundational Substrate Attribution:**
Hyperion Workbench builds upon the open-source Cordis plugin framework and foundational runtime primitives from DeepSeek Harness, extending them into a fully sovereign, voice-enabled, and explainable industrial AI workstation.
