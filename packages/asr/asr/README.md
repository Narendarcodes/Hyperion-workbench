---
description: "The speech-to-text seam for developers and maintainers choosing, composing, or implementing audio transcription over ctx.asr."
kind: "package-reference"
---

# @deepseek-ai/dsh-asr

English

## Summary

`dsh-asr` defines the transcription service (`ctx.asr`) that turns one audio file into transcript text for the harness: callers pass a request and receive a fully-resolved spec with explicit language and deadline before anything runs, then `transcribe` resolves with the transcript and its attribution facts. Every speech-to-text provider in the repository implements this one contract, so model-facing audio tools work unchanged over any of them. Detected silence is a successful outcome — a result with empty `text` — and only infrastructure failures (a missing engine, an unreadable file, a crash, a timeout, an abort) reject. The service itself never renders anything to a model; Consumers own all model-visible output.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Use `ctx.asr` when an agent or an in-process plugin needs transcript text for an audio file. It is the contract every speech-to-text provider and the model-facing `transcribe_audio` tool build on, so code written against it works over any transcription implementation.

### Foreground transcription

Call `transcribe` with a resolved spec to decode one audio file. The promise resolves when the engine finishes: detected silence resolves with empty `text`, never a rejection. `transcribe` rejects only for infrastructure failures such as a missing engine, an unreadable audio file, an engine crash, a timeout kill, or a caller abort.

```text
const result = await ctx.asr.transcribe(ctx.asr.resolve({ audioPath: '/audio/note.wav', language: 'hi' }))
console.log(result.text)
```

### Requests and resolved specs

Every transcription starts from an `AsrRequest` with optional fields; the provider's `resolve()` turns it into a fully-resolved `AsrSpec` with an explicit language and deadline before anything runs. This request/spec split is the repository's template for explicit resolution at package boundaries: callers never rely on hidden defaults inside `transcribe`. `resolve()` fills the language from the provider's configured default, caps per-call timeout overrides, and rejects an empty or relative `audioPath` and an empty `language` up front.

### Choosing and composing a provider

The seam is not an engine: mount exactly one provider per composition, and Consumers work unchanged. `dsh-asr-nemo` runs AI4Bharat IndicConformer checkpoints through the NeMo sidecar and is the only provider today. The smallest composition is the provider alone:

```yaml
- name: '@deepseek-ai/dsh-asr-nemo'
  config:
    model: /models/indicconformer_stt_multi_hybrid_rnnt_600m.nemo
    defaultLanguage: hi
```

<a id="understand-the-implementation"></a>
## Understand the implementation

`ASR_SETTINGS_NAMESPACE` (`asr`) is owned here rather than by any provider because it names the capability, not an implementation: providers share the one namespace without ever registering it twice, and a settings document carried between providers keeps resolving. `AsrTranscriber` extends the Cordis `Service` base with the `asr` key, so mounting a second provider fails loud on the duplicate service registration. There is no background or streaming surface: one call is one file, and long audio is bounded by the provider's configured deadline rather than a job runtime.

<a id="further-exploration"></a>
## Further Exploration

- [asr-nemo](../asr-nemo/README.md) — the IndicConformer provider: engine setup, configuration fields, and the sidecar protocol.
## Model Experience

Indirectly, through `dsh-tool-transcribe`, which turns transcripts into tool results and transcript guidance.

#### KV Cache effect

No direct invalidation; the named consumer owns any request-prefix changes.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **No streaming or partial transcripts** — one call decodes one complete file and resolves once; live dictation needs a streaming provider the seam does not describe.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
