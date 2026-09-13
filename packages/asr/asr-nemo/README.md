---
description: "The IndicConformer speech-to-text provider for deployments and maintainers choosing, configuring, or debugging NeMo sidecar transcription over the asr seam."
kind: "package-reference"
---

# @deepseek-ai/dsh-asr-nemo

English

## Summary

`dsh-asr-nemo` is the IndicConformer transcription provider: every call spawns the bundled `py/transcribe.py` sidecar under the configured interpreter, which restores a `.nemo` checkpoint with AI4Bharat NeMo and decodes one audio file. It applies configured budgets — checkpoint, default language, interpreter, deadline, output caps — to each transcription, classifies timeouts and cancellations, and validates the sidecar's JSON before returning the transcript. The engine and the weights live outside the harness: install [AI4Bharat NeMo](https://github.com/AI4Bharat/NeMo) (`nemo-v2` branch) and download a checkpoint from [IndicConformerASR](https://github.com/AI4Bharat/IndicConformerASR) first. The model-facing `transcribe_audio` tool talks to it once it is mounted.

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

Mount this provider when a composition needs speech-to-text over `ctx.asr`. It registers as `ctx.asr`, and the model-facing `transcribe_audio` tool works over it immediately: an agent calls the tool, and the audio file is decoded by the configured checkpoint with the budgets below. Without NeMo or a checkpoint every transcription fails loud with the sidecar's stderr — that is a deployment gap, not a transcript.

### Minimal configuration

Load the provider with the checkpoint and default language it needs; the remaining fields have defaults, and the settings provider (when composed) layers a user section over this entry, so budgets can change at runtime without a reload.

```yaml
- name: '@deepseek-ai/dsh-asr-nemo'
  config:
    model: /models/indicconformer_stt_multi_hybrid_rnnt_600m.nemo
    defaultLanguage: hi
```

| Field | Default | Meaning |
|---|---|---|
| `model` | (required) | Local `.nemo` checkpoint path handed to the sidecar |
| `defaultLanguage` | (required) | Language code decoded with when a request carries none |
| `pythonBin` | `python3` | Interpreter that runs the sidecar |
| `scriptPath` | bundled `py/transcribe.py` | Sidecar entry override |
| `timeoutMs` | `300,000` | Default transcription deadline (checkpoint restore is slow) |
| `maxTimeoutMs` | `1,800,000` | Upper bound for per-call deadline overrides |
| `maxOutputBytes` | `64,000` | Per-stream in-memory output cap |
| `maxSpillBytes` | `67,108,864` | Per-stream spill-file cap |
| `graceMs` | `3,000` | Grace period for kill escalation and post-exit pipe draining |

### Adjusting budgets at runtime

The settings provider (when composed) layers an `asr` section over this entry using the same schema, so `timeoutMs`, `model`, and the other fields can change without a reload. Stored values are re-validated where they are written: an empty `model`, an empty `defaultLanguage`, a non-positive budget, or a `graceMs` above the timer bound is refused at the section instead of failing at the next transcription.

<a id="understand-the-implementation"></a>
## Understand the implementation

The sidecar protocol is one JSON object on stdout — `{"text": "<transcript>", "language": "<code>"}` — with any failure exiting non-zero and leaving stdout empty, so the provider never parses a half-written transcript. One deadline combines the spec timeout and upstream cancellation; only this provider's timeout reason counts as a timeout, outer aborts surface as `AbortError`. Detected silence (an empty `text`) resolves normally. The child runs with `cwd` beside the audio file, its stdin ignored, and both streams collected under the configured caps with spill-file recovery.

<a id="further-exploration"></a>
## Further Exploration

- [asr](../asr/README.md) — the seam contract: requests, resolved specs, and provider semantics.
- [tool-transcribe](../tool-transcribe/README.md) — the model-facing `transcribe_audio` tool and its transcript bounds.

## Model Experience

Indirectly, through `dsh-tool-transcribe`, which turns transcripts into tool results and transcript guidance.

#### KV Cache effect

No direct invalidation; the named consumer owns any request-prefix changes.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **No bundled engine or weights** — NeMo and the `.nemo` checkpoint are deployment prerequisites; a composition without them transcribes nothing.
- **CPU/GPU placement follows the NeMo default** — there is no device-selection field; GPU use depends on the NeMo installation seeing CUDA.
- **Single-file English-sidecar protocol** — the sidecar prints one document per process; batch or streaming decoding needs a different engine entry.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
