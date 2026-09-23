# Agent Note: Model Hub UX audit, runtime connection configuration, and library discovery

Status: implemented

English

## Problem

The previous Model Hub implementation contained critical usability and architectural flaws:
1. **Hardcoded Port Assumptions**: llama.cpp was assumed fixed to port `8080`, and the provider configuration logic in `store.ts` repeatedly overwrote any custom port settings in `settings.yaml` with `http://127.0.0.1:8080/v1` upon model sync.
2. **Missing Model Autocomplete & Raw Errors**: The Add Model dialog required users to memorize exact registry model strings. Any typo or partial name (e.g. `gpt`, `qwen`) failed with an unhelpful `Pull failed: Bad Request` error.
3. **Hardcoded Hardware & Fake Fallback Telemetry**: Recommendation copy hardcoded `RTX 2050 (4GB/8GB VRAM)`. In addition, telemetry fallbacks returned a fabricated RTX 2050 with fake VRAM and clock stats when the host daemon was unreachable.
4. **Contrast & Layout Degradation**: Active tab pills rendered low-contrast white-on-blue count badges. Expanding the left navigation sidebar triggered horizontal overflow clipping without container-level scrollbars. Delete confirmation dialogs used light `#ffffff` panels that violated the dark theme.

## Decision

We performed an audit across the Model Hub package (`@deepseek-ai/dsh-client-ui-model-hub`) and implemented the following improvements:

1. **Configurable Runtime Endpoints**: Added `RuntimeConfig` and `EndpointConfig` to `store.ts` with `localStorage` persistence (`hyperion_runtime_config`). Added dynamic endpoint configuration methods to `LlamaService` and `OllamaClient`, and built `RuntimeConfigDialog` featuring live connection testing with health diagnostics.
2. **Ollama Library Discovery & Pre-Pull Validation**: Integrated a curated catalog of online Ollama models with tags, parameters, and capabilities. Built debounced combobox autocomplete with keyboard navigation (ArrowDown, ArrowUp, Enter, Escape). Added pre-pull validation with explicit fallback options and actionable error translation with expandable technical details.
3. **Responsive Container Architecture & Contrast Tokens**: Applied `min-width: 0;` across overlays, main content, and table wrappers with horizontal scrollbars for tables on narrow viewports. Restored active tab badge contrast (`background: rgba(0, 0, 0, 0.28); color: #ffffff; font-weight: 700;`) and consistent alert banners.
4. **Clean Dark-Themed Confirmation & Empty States**: Implemented `.deleteDialog` in CSS modules for destructive model deletion with explicit irreversibility warnings, and replaced empty states with actionable SVGs and guidance.

## Alternatives considered

- **Hardcoded port switcher (8080 vs 8081)** — rejected. Users run local runtimes on arbitrary host interfaces and port bindings; full Host, Port, Protocol, and Base URL configuration is required.
- **Scraping the remote Ollama library HTML directly in browser** — rejected due to CORS constraints and air-gapped environments. A curated, local offline catalog with capability tags provides instant, reliable zero-latency discovery.

## Consequences

Model Hub is robust across custom local inference setups, supports keyboard accessibility and WCAG contrast, handles responsive viewport changes cleanly, and provides informative discovery.
