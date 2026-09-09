# Originkit — Component Shortlist

**Observed:** 2026-09-09 from live gallery + downloaded source/posters.

## Catalog evidence
The live gallery lists 442 components and exposes component routes. Downloaded and inspected posters include Hex Comb, Hex Shaft, Light Cables, Scroll Wave Field, Chevron Duct, Helix Shaft, Defense Lines, Network Lines, and others. Module sources were retrieved for `hex-comb` (18KB), `hex-shaft` (14.5KB), and `scroll-wave-field` (31.9KB).

## Selected: Hex Comb
- **Route:** `https://www.originkit.dev/components/hex-comb`
- **Source retrieved:** `research/hex-comb.mjs`
- **Original palette:** `#080A10` background, `#FFCA00` base, `#FFFFFF` accent.
- **Why it fits:** the poster's dominant amber/near-black palette is already close to Hyperion Cream on Deep Navy; the pointer-reactive hexagonal extrusion reads as industrial structure rather than generic AI vapor.
- **Port approach:** preserve the component's shader geometry, pointer lift, hex support math, grain and vignette behavior. Retheme exactly and only at the color uniforms: `#070C16` background, `#263247` base, `#FDDA98` accent. Port as a standalone canvas module, not React/Framer scaffolding.

## Secondary: Scroll Wave Field
- **Route:** `https://www.originkit.dev/components/scroll-wave-field`
- **Source retrieved:** `research/scroll-wave-field.mjs`
- **Use:** optional, low-contrast section background behind the operating model — only if it does not compete with the trace content.

## Explicitly skipped
| Component | Reason |
|---|---|
| Light Cables | Warm-gold poster fits, but source was unavailable (`moduleUrl: undefined`); no eyeballed recreation. |
| Hex Shaft | Readable industrial geometry, but cyan poster requires a larger visual translation than Hex Comb. |
| Light Bloom / Ray Column / Silk Waves | Glow/aurora language conflicts with the project anti-slop ban. |
| Vortex Dust Fall / Accretion Disc | Cinematic but not task/evidence-oriented. |
| ASCII Tunnel | Retro effect would dilute the industrial instrument direction. |

**Verdict:** Hex Comb is the hero visual. It is a faithful source-derived port, recolored only to the brand contract.
