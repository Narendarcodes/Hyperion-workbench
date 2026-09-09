# Design System: HYPERION Landing

## 1. Visual Theme & Atmosphere
A controlled industrial instrument, not a consumer-AI marketing page. Dark navy surfaces create quiet depth; the cream emblem and signal color are used only for identity, decisions, progress, and focus. Density is balanced: expansive first view, then evidence-dense product panels. Motion is precise and causal: a state progresses because the visitor scrolls or points, never as decoration.

## 2. Color Palette & Roles
- **Hyperion Navy** (`#0B1220`) — primary canvas.
- **Deep Navy** (`#070C16`) — hero depth and page field.
- **Surface Navy** (`#111827`) — contained product surfaces.
- **Raised Surface** (`#172033`) — selected/elevated states.
- **Hyperion Cream** (`#FDDA98`) — the single brand accent: CTA, active path, focus, critical emphasis.
- **Primary Text** (`#F5F7FA`) — headings and critical facts.
- **Secondary Text** (`#AAB4C3`) — explanatory copy.
- **Muted Text** (`#748196`) — metadata.
- **Structural Border** (`#263247`) — rules and contained panels.
- **Success** (`#3FB27F`), **Warning** (`#D9A441`), **Info** (`#6FA8DC`) — status only.

## 3. Typography Rules
- **Display:** Archivo, variable 500–650; tight tracking, no all-caps body headlines.
- **Body/UI:** IBM Plex Sans, 400–600; explanation measure ≤ 62ch.
- **Trace:** IBM Plex Mono, 400–500; uppercase labels with measured tracking.
- Do not use Inter, Geist, or Space Grotesk. Hierarchy comes from scale and space, not excessive weight.

## 4. Components
- **Buttons:** 4px radius, no pill form, no glow. Cream is reserved for the primary action; secondary actions are bordered.
- **Panels:** 1px rules, 2–8px radius only. Flat navy fills; no translucent glass card pile-up.
- **Status rows:** mono labels, semantic state dot/color only where a real system state is represented.
- **Lines:** thin structural dividers, cream only for a selected route or progress.

## 5. Layout & Responsive Rules
12-column desktop grid in a 1360px container. Hero is asymmetric: content left, instrument field right. At 820px all multi-column content becomes one column; pinning is disabled. All targets are at least 44px high. No horizontal overflow.

## 6. Motion
GSAP + Lenis choreograph reveals and a single pinned operating-model section. Motion uses transform and opacity, 500–900ms ease-out. The hero hex field is a custom Canvas instrument: low-DPR, paused while hidden, static under reduced motion. Every animation has a visible static state.

## 7. Banned
No fabricated metrics, customer logos, marquee tickers, emoji, gradient text, glowing blobs, decorative live indicators, glassmorphism stacks, generic AI claims, generic 3-equal-card feature rows, invented latency/uptime figures, or claims of being air-gapped.