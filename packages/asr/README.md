---
description: "The speech-to-text capability family for deployments and maintainers choosing and composing audio transcription over ctx.asr."
kind: "package-group"
---

# asr/ — speech-to-text capability family

English

## Summary

The asr group turns audio prompts into agent-readable text: one transcription service decodes one audio file per call, the IndicConformer provider runs AI4Bharat checkpoints through a NeMo sidecar, and the model-facing `transcribe_audio` tool sits on top of whichever provider is mounted. Mount exactly one provider per composition; the tool works unchanged. The engine and its weights are deployment prerequisites — the harness ships the seam, the sidecar protocol, and the tool, never the model.

## Table of Contents

- [Packages](#packages)
- [Related documentation](#related-documentation)
- [Dev Note](#dev-note)

-----

<a id="packages"></a>
## Packages

| Package | Role | ctx key |
|---|---|---|
| [`asr`](asr/README.md) | Defines the transcription contract: requests, resolved specs, and results | `ctx.asr` |
| [`asr-nemo`](asr-nemo/README.md) | Runs IndicConformer checkpoints through the NeMo sidecar over `ctx.subprocess` | registers `ctx.asr` |
| [`tool-transcribe`](tool-transcribe/README.md) | Exposes audio transcription to the model as the `transcribe_audio` tool | registers on `ctx.tools` |

A profile layer selects the provider and the model-facing tool it needs:

```yaml
- name: '@deepseek-ai/dsh-asr-nemo'
  config:
    model: /models/indicconformer_stt_multi_hybrid_rnnt_600m.nemo
    defaultLanguage: hi
- name: '@deepseek-ai/dsh-tool-transcribe'
```

Mounting two providers fails loud on the duplicate service registration. The [base bundle](../bundle/base/cordis.patch.yml) carries no asr rows: transcription stays an opt-in overlay until a deployment provides the engine and weights.

-----

<a id="related-documentation"></a>
## Related documentation

- [Speech-to-Text subsystem](../../docs/subsystems/asr.md) — the request/spec vocabulary, the settled-transcript contract, and the NeMo sidecar protocol.
- [IndicConformerASR](https://github.com/AI4Bharat/IndicConformerASR) — the upstream checkpoints and engine setup this provider builds on.

<a id="dev-note"></a>
## Dev Note

None.
