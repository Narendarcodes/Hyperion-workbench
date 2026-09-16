# Agent Note: ChatGPT-style voice pill takeover in the composer

Status: implemented

English

## Problem

The voice row iteration still showed the draft and toolbar around the strip and carried timer/red-dot extras the ChatGPT dictation reference has no equivalent for. The toolbar mic button also kept recording/transcribing visual states for a surface that no longer exists once the takeover mounts, and the waveform sat in the blue info fill instead of the reference's neutral tertiary tone.

## Decision

Recording or transcribing now swaps the composer content area for a single voice pill: ghost X (discard, recording-only) left, the neutral scrolling history strip in the middle, outlined square stop plus the blue info-fill send arrow right. The draft scrollport and the whole toolbar — including the Workspace-write chip — unmount underneath, so overlap is impossible by construction rather than by flex tuning. Stop and send both end capture and transcribe; the transcript pastes into the draft as editable text and the composer returns for a manual send, preserving edit-before-send. The toolbar mic is now idle-only (plain mic glyph, `voice.idle` tooltip); the timer, its interval, `formatElapsed`, and the `voice.elapsed` key are deleted, as are the `voice.recording`/`voice.transcribing` strings and the `micRecording`/`micTranscribing` classes. The waveform keeps its history-ring behavior in tertiary tone (`#81858c` test fallback).

## Alternatives considered

- **Keep the strip as a row above the visible toolbar** — rejected. Any co-visible toolbar keeps a flex neighbor for the strip to collide with at some width and keeps two competing motion sources; the takeover removes the class.
- **Keep the timer and red dot as extras** — rejected per the exact-chrome decision. Duration is implicit in strip length, as in the reference; the extras were ours, not ChatGPT's.
- **Auto-send on blue arrow** — rejected per the stop-paste-manual-send decision. Dictation's point is reviewable text; an unreviewed send burns the transcription's only advantage.
- **Keep recording/transcribing mic button states** — rejected. Dead states for an unmounted button; the pill's own stop/send/discard carry the semantics.

## Consequences

What this buys: pixel-level ChatGPT dictation parity (X, strip, stop, blue send), zero overlap states to test, and less code (timer machinery, dead button states, and three locale keys gone). What it costs: the draft is unreachable mid-take — an intentional tradeoff the reference also makes — and transcription failure returns to an empty draft with only a toast (retry stays deferred). Seven `voice pill` tests pin the takeover (idle chrome, hover label, missing/denied toasts, X/stop/send presence with draft unmounted, wait with all pill controls disabled, discard skips fetch). The two `no-unnecessary-condition` lint hits on the `navigator.mediaDevices` guard predate this work.
