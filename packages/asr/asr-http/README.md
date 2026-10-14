---
description: "The HTTP speech-to-text provider for deployments that run a persistent STT sidecar with per-language engine routing (IndicConformer for Telugu/Hindi, Whisper turbo for English, SraVaani fallback) over the asr seam."
kind: "package-reference"
---

# @deepseek-ai/dsh-asr-http

English

## Summary

`dsh-asr-http` registers `ctx.asr` and sends each transcription as one POST to a long-lived STT sidecar (the bundled `py/stt_server.py`). The sidecar keeps its engines warm on the GPU, routes each language to an engine, and folds spelled-out plant equipment tags and English number words back into canonical form (`పీ వన్ జీరో వన్ ఏ` → `P-101A`, `twelve point five` → `12.5`). Unlike `dsh-asr-nemo`, which restores a checkpoint on every call, a warm sidecar answers a short plant-floor prompt in about 0.4 s (measured p50 round-trip). The default routing (IndicConformer-600M for `te`/`hi` and code-mixed speech, Whisper large-v3-turbo for `en`, SraVaani-1.0 as the fallback) comes from the Hyperion STT benchmark ([docs/benchmarks/stt.md](../../../docs/benchmarks/stt.md)). The engines and their weights are deployment prerequisites, as they are for every asr provider.

## Table of Contents

- [Use this package](#use-this-package)
- [Run the sidecar](#run-the-sidecar)
- [Understand the implementation](#understand-the-implementation)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount exactly one asr provider. To switch from IndicConformer to the sidecar, swap the provider row; `dsh-tool-transcribe` works unchanged.

```yaml
- name: '@deepseek-ai/dsh-asr-http'
  config:
    endpoint: http://127.0.0.1:8790
    defaultLanguage: te
    # optional: override the sidecar's own --route table per language ('*' = every other language)
    engines:
      en: whisper-turbo
- name: '@deepseek-ai/dsh-tool-transcribe'
```

| Field | Default | Meaning |
|---|---|---|
| `endpoint` | (required) | Sidecar base URL (`http://` or `https://`) |
| `defaultLanguage` | (required) | Language code decoded with when a request carries none (`te`, `hi`, `en`, …) |
| `engines` | none | Per-language engine override sent with each request; omitted languages use the sidecar's routes |
| `normalize` | `plant` | `plant` folds tags and number words; `none` returns the engine's raw transcript |
| `transport` | `upload` | `upload` sends the audio bytes (base64); `path` sends the absolute path, for a sidecar on a shared filesystem |
| `timeoutMs` | `60,000` | Default transcription deadline |
| `maxTimeoutMs` | `600,000` | Upper bound for per-call deadline overrides |
| `maxAudioBytes` | `33,554,432` | Largest audio file accepted for upload |

The settings provider (when composed) layers an `asr` section over this entry with the same schema, so the endpoint, routes, and budgets can change at runtime. A stored section is re-validated where it is written.

<a id="run-the-sidecar"></a>
## Run the sidecar

`deploy/launch.sh` builds `deploy/Dockerfile` (a ROCm PyTorch base) and starts the sidecar bound to `127.0.0.1:8790`:

```sh
INDICCONF_DIR=/root/speech_r2/gated_indicconf SRAVAANI_DIR=/root/speech_r2/gated_sravaani HF_CACHE=/root/hfcache \
  packages/asr/asr-http/deploy/launch.sh
curl -s http://127.0.0.1:8790/healthz
```

The image's default command routes `te` and `hi` to IndicConformer-600M (ai4bharat, MIT, gated on Hugging Face; ONNX on CPU), `en` to `openai/whisper-large-v3-turbo` (MIT; 1.75 GB VRAM), and every other language to SraVaani-1.0 (ARTPARK-IISc, MIT, gated; 2.26 GB VRAM). Total VRAM is about 4 GB, inside the 12 GB STT budget on the shared MI300X. To use other routes, pass your own `--engine name=kind:source` and `--route lang=name` flags after the script (`kind` is `sravaani`, `whisper`, or `indicconformer`). Keep the port on loopback and reach it through a tunnel or an authenticating proxy; the sidecar itself has no auth.

<a id="understand-the-implementation"></a>
## Understand the implementation

- **Protocol**: `POST /v1/transcribe` with `{"language", "audio_b64" | "audio_path", "engine"?, "normalize"?}` returns `{"text", "raw", "language", "engine", "model", "seconds"}`. Errors return 4xx/5xx with `{"error"}`, and the provider puts that message in its rejection. `GET /healthz` lists the routes and which engines are loaded.
- **Deadlines**: one deadline combines the spec timeout and the caller's cancellation. Only this provider's timeout counts as a timeout; an outer abort surfaces as `AbortError`. An unreachable sidecar, a non-2xx status, and a malformed body are infrastructure failures. Detected silence (empty `text`) is a normal result.
- **Attribution**: `AsrResult.model` is `engine:model` as reported by the sidecar (for example `indicconformer:/models/indicconformer`).
- **Normalisation** (`py/plantnorm.py`): a deterministic, text-preserving fold covering Telugu, Devanagari, and Latin spellings of letter names, English digit/number words, and native digit names. It only rewrites spans that form a tag (1–4 letters, 2–5 digits, optional suffix letter) or a multi-word number, so ordinary words keep the engine's spelling.

<a id="known-limitations-and-deferred-work"></a>
## Known Limitations and Deferred Work

- **No auth on the sidecar.** It is meant for loopback or a private network.
- **One request per engine at a time.** The sidecar serialises GPU work per engine, with no batching yet.
- **Native-script number words** (`పదిహేను`, `पचास`) are not converted to digits; only English number words and native digit names are.
- **IndicConformer runs on CPU** (ONNX) in the sidecar, with p50 about 0.45 s per clip on 20 vCPU. GPU ONNX (onnxruntime-rocm) has not been tried.
- **Benchmark caveat**: the domain test set is synthetic (gpt-oss-120b prompts, svara-tts speech, procedural factory noise). Validate on real operator recordings before relying on the routing.

<a id="dev-note"></a>
## Dev Note

Python tests: `python3 -m pytest packages/asr/asr-http/py -q` (no GPU or torch needed). Benchmark harness: [`bench/`](bench/README.md).
