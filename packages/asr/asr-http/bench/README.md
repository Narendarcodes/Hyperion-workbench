---
description: "Reproduction harness for the Hyperion STT benchmark (test-set build, model runs, scoring) behind docs/benchmarks/stt.md."
kind: "package-reference"
---

# STT benchmark harness

English

## Summary

These are the scripts behind [docs/benchmarks/stt.md](../../../../docs/benchmarks/stt.md). They run on the MI300X droplet inside a `rocm:latest`-derived container (`hx-stt`) with the Hugging Face cache mounted. Audio is never committed. The scripts rebuild it from public sources and synthesis.

| Step | Script | Output |
|---|---|---|
| 1. Prompts | `gen_prompts.py` (gpt-oss-120b at `127.0.0.1:8001`) | `prompts_raw.json` (committed) |
| 2. Romanised Telugu words → Telugu script | `translit.py` | `te_translit.json` (committed) |
| 3. Test set | `build_set.py` | `data/manifest.json` + `data/wav16/*.wav` (300 clips) |
| 4. Model runs | `bench_run.py <model-key>…` | `results/<key>.json` (one hypothesis + latency per clip) |
| 5. Scores | `score.py <dir>` | `scores.json` |

`validate_prompts.py` (an LLM rewrite pass for the spoken form) was tried and then dropped. It introduced number errors (78 became "eighty-eight"). The spoken form is now derived deterministically by `../py/plantnorm.py verbalize`, and every reference round-trips its tags and numbers through `canonicalize` (checked: 60/60).

## Test set (300 utterances)

- **FLEURS test** (CC-BY-4.0): 20 clips each for `te_in`, `hi_in`, and `en_us`. Read speech; the reference is the FLEURS raw transcription.
- **Synthetic plant-floor prompts**: 12 each of `te`, `hi`, `en`, `te-en` (Tenglish), and `hi-en` (Hinglish), every one carrying at least one ISA-style tag and one number with a unit. Speech comes from `kenpath/svara-tts-v1` (Apache-2.0), alternating male and female speaker identities. Each clip appears clean and mixed with procedural factory noise at 20, 10, and 5 dB SNR: 60 × 4 = 240 clips. The noise is pink noise, 50 Hz mains harmonics, a rotating-machinery whine with amplitude modulation, impulsive clanks, and a steam-hiss burst. It is generated, not recorded, so it carries no licence.

## Metrics

- FLEURS: WER and CER on lowercase, punctuation-stripped NFC text.
- Domain: WER and CER after `canonicalize` on both sides. Tag exact-match is the share of reference tags recovered from the hypothesis; number exact-match is the same for numbers. `utt_all_ok` is the share of clips where every tag and number was recovered.
- Speed: batch 1 on a warm model, with the first clip excluded as warm-up. RTF is decode seconds divided by audio seconds, with p50 and p95 latency per clip. Peak VRAM is `torch.cuda.max_memory_allocated`. IndicConformer runs ONNX on CPU (20 vCPU), as it did in the earlier shoot-out.
