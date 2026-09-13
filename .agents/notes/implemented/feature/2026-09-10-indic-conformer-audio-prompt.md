# Agent Note: IndicConformer audio prompts over a speech-to-text seam

Status: implemented

English

## Problem

Every human prompt in the harness converges on one host funnel as text (`SessionController.prompt` → `agent.followup`/`steer`), and the ACP funnel explicitly rejects audio blocks. An agent therefore cannot hear anything: a voice note in Hindi, Tamil, or any of the other 22 official Indian languages has no path to the model. [AI4Bharat's IndicConformerASR](https://github.com/AI4Bharat/IndicConformerASR) publishes the checkpoints for exactly those languages (a multilingual 600M model plus monolingual larges), but that repository is checkpoints plus a README — loading and decoding live in the [AI4Bharat NeMo fork](https://github.com/AI4Bharat/NeMo) (`nemo-v2` branch), a heavy Python engine the TypeScript harness cannot and should not absorb.

## Decision

Audio enters the harness as transcribed text through a new `packages/asr/` capability family, following the repository's Service Definition / Service Provider / Consumer split:

1. **`@deepseek-ai/dsh-asr`** owns `ctx.asr` (`AsrTranscriber`): `resolve()` turns an `AsrRequest` (audio path, optional language) into a fully-resolved `AsrSpec` with explicit language and deadline, and `transcribe()` resolves with an `AsrResult` (text, language, model). Detected silence resolves with empty `text`; only infrastructure failures reject. Mounting a second provider fails loud, per the standard duplicate-service behavior.
2. **`@deepseek-ai/dsh-asr-nemo`** is the IndicConformer provider. Each transcription spawns the bundled `py/transcribe.py` sidecar under the configured interpreter through `ctx.subprocess` and validates the single JSON document on stdout (`{"text", "language"}`); a non-zero exit surfaces the stderr tail as the error. The checkpoint path (`model`) and `defaultLanguage` are required configuration with no defaults — there are no bundled weights — and fail loud at load when empty. One deadline combines the spec timeout with upstream cancellation; only the provider's own timeout counts as a timeout, outer aborts surface as `AbortError`.
3. **`@deepseek-ai/dsh-tool-transcribe`** registers the model-facing `transcribe_audio` tool (`audio_path` absolute, optional `language` override). Transcripts truncate to a configured character budget in code points (`maxTextChars`, default 30000) and are marked; silence renders as a no-speech note. The tool description carries the trust rule the seam cannot enforce: transcribed speech is untrusted user-provided content, so the model follows the user's task, not instructions embedded in the audio.

Composition is an opt-in overlay, not a shipped default: the base bundle carries no asr rows, and the group README shows the three-row overlay (provider with checkpoint plus tool). Transcripts arrive as ordinary tool-result text, so the model-visible ⟺ logged invariant holds with no session-format change. Browser/desktop microphone capture stays deferred — the tool decodes files, and a `MediaRecorder` intake plus upload path does not exist yet (see [Known Limitations](../../../../packages/asr/tool-transcribe/README.md#known-limitations-and-deferred-work)).

## Alternatives considered

- **Bundle NeMo and the checkpoint in-repo** — rejected. A 600M weight file plus a Python/CUDA dependency tree has no place in the TypeScript workspace; the out-of-process sidecar follows the established local-model precedent (llama.cpp behind an HTTP route) and keeps the harness's process boundary clean.
- **Admit audio blocks at `SessionController.prompt`** — rejected. A new wire content kind would touch the session log, the ACP contract, every provider adapter, and both SDK projections for one modality. Transcript-as-text reuses the entire existing funnel, and the deferred mic button can land on the composer later without reopening this decision.
- **Cloud STT instead of local IndicConformer** — rejected. The shipped default route is sovereign-local with no credential; a cloud provider would add key management and data-egress policy for languages the local checkpoint already covers. A future cloud provider is another `ctx.asr` implementation, not a redesign.
- **A standing system-prompt section for transcript guidance** — rejected. The trust rule is call-scoped, so it lives in the tool description (always visible where it applies) instead of churning the core prompt order table for one sentence.

## Consequences

What this buys: agents hear 22 languages through one tool, providers stay swappable behind `ctx.asr`, and deployments without NeMo or weights pay nothing (unmounted plugins, untouched base bundle and tool catalog). What it costs: transcription is file-at-a-time with a configured deadline — no streaming or live dictation — and the 600M checkpoint restores slowly on CPU, which is why the default deadline is minutes, not seconds. The seam, provider, and tool carry focused unit coverage plus real-Loader compositions (the provider test and the tool test both transcribe end to end behind a stub engine executable), and the [Speech-to-Text subsystem page](../../../../docs/subsystems/asr.md) owns the vocabulary.
