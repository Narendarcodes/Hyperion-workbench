# Speech-to-Text

English

The speech-to-text seam is split across a Service Definition ([dsh-asr](../../packages/asr/asr), `ctx.asr`), a Service Provider ([dsh-asr-nemo](../../packages/asr/asr-nemo), AI4Bharat IndicConformer checkpoints through a NeMo sidecar), and a Consumer ([dsh-tool-transcribe](../../packages/asr/tool-transcribe), the `transcribe_audio` schema). One call decodes one audio file into transcript text; the transcript enters the agent as ordinary tool-result text, so it stays reconstructable from the session log. Request/spec vocabulary, provider configuration, and tool bounds are on the [package READMEs](../../packages/asr/README.md).

Source: [`packages/asr/asr/src/types.ts`](../../packages/asr/asr/src/types.ts)

## Request vs. spec: the `resolve()` split

The seam separates the **caller-facing request** (an audio path plus optional language and signal, filled from provider configuration) from the **fully-resolved spec** the provider acts on (language and deadline required). The tool layer calls `ctx.asr.resolve(request)` between them (the repo's "explicit > implicit at package boundaries" rule). Detected silence is a successful outcome — a result with empty `text` — and only infrastructure failures (a missing engine, an unreadable file, an engine crash, a timeout kill, an abort kill) reject.

## `AsrResult` — one settled transcript

```ts type-equiv
/**
 * Settled transcription outcome: the transcript plus the facts a caller needs
 * to attribute it.
 */
interface AsrResult {
  /** Transcript text, possibly empty when the engine detected no speech. */
  text: string
  /** Language code the engine decoded with. */
  language: string
  /** Engine model identity (checkpoint path, registry id, or provider name). */
  model: string
}
```

## The NeMo sidecar protocol

The provider owns deadlines and transcript validation; the sidecar owns NeMo imports, checkpoint restore, and decoding. The sidecar prints exactly one JSON object (`{"text", "language"}`) on stdout and exits non-zero with stdout empty on any failure, so the provider never parses a half-written transcript. The engine (AI4Bharat NeMo, `nemo-v2` branch) and the `.nemo` checkpoint are deployment prerequisites that never ship with the harness.
