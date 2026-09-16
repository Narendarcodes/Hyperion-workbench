# Agent Note: WhatsApp-style voice row in the composer

Status: implemented

English

## Problem

The first waveform iteration lived inside the toolbar's `.tools` flex row beside the mic button, sharing space with the Workspace-write chip — at narrow widths the strip crushed into the chip. Its bars also re-rendered the whole width from the live spectrum every frame, so any speech spiked the full field instead of leaving a readable history behind.

## Decision

Voice input owns a dedicated full-width row between the draft scrollport and the toolbar, following the WhatsApp/ChatGPT voice-message pattern: a static red dot, a live `m:ss` timer (one-second interval from capture start, cleared on stop/discard/unmount), a slim 20px scrolling waveform, and a trash discard button while recording that drops the capture without hitting `/transcribe`. The row renders only while `recording || transcribing`, so the toolbar — and the Workspace-write chip — is structurally unreachable by the waveform at any viewport. The mic-button pulse is gone; the waveform is the motion.

The strip behaves like the ChatGPT reference: one loudness sample per animation frame appends to a history ring (capped at 400 bars, older samples scroll off the left), so the past stays visible as a continuous playback-style strip. Sampling is a single whole-buffer RMS per frame rather than per-bar slices — the old per-bar split inflated whatever slice caught energy to full height on every tick, which is the "high-pitch on every word" look. Quiet frames stay quiet; speech forms the rounded humps.

State additions are minimal: `elapsedSecs` plus an interval ref, and a `discardRef` flag the `onstop` path checks before fetching (chunks clear on every stop path now, fixing a stale-chunks leak where a second recording reused the first). Track ownership is unchanged: the stop path releases tracks, the unmount effect additionally clears the timer. New locale keys are `voice.discard`, `voice.recordingNow`, and `voice.elapsed` (`Recording time {time}` for the timer's accessible label).

## Alternatives considered

- **Keep the strip in the toolbar with a smaller flex basis** — rejected. Any in-toolbar placement still shares the flex row with `.modes`; the overlap was structural, not a sizing bug, and only an own-row placement removes the failure class.
- **Keep the static full-width spectrum bars** — rejected. Re-rendering every bar from the live spectrum each frame spikes the whole field on any speech; the history ring keeps the past visible as a playback-style strip, which is the ChatGPT look.
- **Discard via the existing stop button** — rejected. Stop means send-for-transcription in this flow; a distinct trash exit is the WhatsApp affordance and needs its own no-fetch guarantee, pinned by a test asserting `fetch` was not called.
- **Animate the waiting state** — rejected. A frozen last frame plus a running timer already signals liveness with one fewer animation path and zero canvas work after stop.

## Consequences

What this buys: no overlap at any width, a timer proving the capture is alive, and a no-cost discard exit — with eight `voice row` behavior tests (idle hidden, hover label, missing/denied mic toasts, open/close with timer + discard chrome, timer ticks, wait persistence without discard, discard skips fetch). What it costs: one interval while recording and a second exit through `onstop` that the discard test must keep honest. Reduced-motion static frame remains deferred. The two `no-unnecessary-condition` lint hits on the `navigator.mediaDevices` guard predate this work.
