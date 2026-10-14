# Hyperion STT benchmark: Telugu, Hindi, English and code-mixed plant-floor speech

English

Run date: 2026-10-14, on the shared AMD Instinct MI300X droplet (ROCm 7.2.3, PyTorch 2.11 ROCm build, transformers 5.15) inside a 12 GB STT VRAM budget. Every model ran at batch 1 on a warm model, one at a time. Harness, manifest, per-clip hypotheses and scores: [`packages/asr/asr-http/bench/`](../../packages/asr/asr-http/bench/README.md).

Status labels: **verified** means measured in this run. **Proposed** means a recommendation drawn from the numbers. **Unresolved** means not established.

## TL;DR

- **Verified:** per-language routing beats every single model on the plant-floor set. The route is **IndicConformer-600M for Telugu, Hindi and code-mixed Tenglish/Hinglish, and Whisper large-v3-turbo for English**. On the 240-clip domain set it gets every tag and number right in **62.1%** of clips, against 58.8% for Whisper turbo alone and 46.3% for SraVaani alone. Mean normalised WER is **0.20** (Whisper turbo alone 0.47; SraVaani alone 0.35).
- **Verified:** SraVaani-1.0 is the most accurate on general Telugu read speech (FLEURS te WER 0.135, against 0.177 for IndicConformer) and the fastest engine overall (p50 0.064 s per clip, 2.26 GB). On spelled equipment tags it trails IndicConformer. It is kept loaded as the sidecar's fallback route.
- **Verified:** Whisper (large-v3 and turbo) is unusable for Telugu. It often answers in Kannada script (FLEURS te WER 1.15 to 1.80). It is the best English engine (FLEURS en WER 0.043 for large-v3, 0.065 for turbo) and recovers numbers best in every language (number EM 0.90 to 0.95).
- **Verified:** the vasista22 Telugu and Hindi Whisper fine-tunes (large-v2) do badly on domain prompts (tag EM 0.12 to 0.21; frequent repetition loops; Telugu p50 4.8 s).
- **Verified:** the integrated sidecar (`py/stt_server.py`, warm engines, plant-tag folding) took 40 smoke requests at a round-trip **p50 of 0.435 s and p95 of 1.16 s**, with all tags recovered in 27 of 30 domain clips. The existing per-call NeMo provider restores a 600M checkpoint on every call (minutes on CPU).
- **Unresolved:** faster-whisper on the GPU. The official CTranslate2 4.8.3 ROCm wheel loads on gfx942 but segfaults inside `transcribe` at both fp16 and fp32. A CPU int8 run is reported instead. vLLM Whisper was not attempted: the GPU was about 94% allocated by other tenants during this run, and the operator asked streams to stay inside their budget.

## Test set (300 utterances)

| Part | Source | Licence | Clips |
|---|---|---|---|
| FLEURS test, te_in / hi_in / en_us | google/fleurs | CC-BY-4.0 | 20 + 20 + 20 |
| Plant-floor prompts, te / hi / en / te-en / hi-en | prompts by gpt-oss-120b (synthetic), spoken with kenpath/svara-tts-v1 | Apache-2.0 (TTS) | 12 × 5 = 60 sentences |
| … with procedural factory noise | pink noise + 50 Hz harmonics + machinery whine + clanks + steam hiss | generated | 60 × {clean, 20, 10, 5 dB} = 240 |

Every domain sentence carries at least one ISA-style tag (`P-101A`, `FV-2203`, `TI-405`, `PSV-118`, `K-1102`, …) and at least one number with a unit (bar, kg/cm², °C, m³/h, %, rpm). The TTS input is produced deterministically: tags are spelled letter-by-letter and digit-by-digit, and numbers are read as English number words in the target script, which is how operators say them. All 60 references round-trip their tags and numbers through the scorer (`plantnorm.verbalize` → `canonicalize`).

Not used: Common Voice (its licence and terms check was not finished in this run) and IndicVoices (gated). The earlier shoot-out's IndicVoices-R clips were left out so the set can be rebuilt from FLEURS plus synthesis alone.

## Metrics

- FLEURS: WER and CER on lowercase, punctuation-stripped NFC text.
- Domain: WER and CER after the same canonicalisation on both sides (spelled tags → `P101A`, English number words and native digit names → digits, unit phrases → unit tokens). **Tag EM** and **number EM** are the shares of reference tags and numbers recovered exactly. **All-ok** is the share of clips with every tag and number right, which is what a downstream plant agent needs.
- The canonicaliser was refined by inspecting clean-clip errors of Whisper turbo, IndicConformer and SraVaani: joined letter names (`ఎఫ్వి`), Telugu postpositions glued to digits (`త్రీలో`), `1,200`, `P101 a`. It was then frozen and applied identically to every model.

### FLEURS test (read speech), WER / CER

| Model | te (n=20) | hi (n=20) | en (n=20) |
|---|---|---|---|
| IndicConformer-600M (ONNX, CPU) | 0.177 / 0.049 | 0.088 / 0.035 | — |
| SraVaani-1.0 (GPU) | 0.135 / 0.044 | 0.090 / 0.034 | 0.250 / 0.121 |
| Whisper large-v3 (GPU, fp16) | 1.802 / 0.729 | 0.293 / 0.151 | 0.043 / 0.034 |
| Whisper large-v3-turbo (GPU, fp16) | 1.154 / 0.578 | 0.318 / 0.176 | 0.065 / 0.047 |
| faster-whisper turbo (CTranslate2 int8, CPU) | 0.844 / 0.384 | 0.320 / 0.165 | 0.070 / 0.047 |
| vasista22 whisper-telugu-large-v2 | 0.396 / 0.278 | — | — |
| vasista22 whisper-hindi-large-v2 | — | 0.141 / 0.099 | — |

### Plant-floor domain set (clean + 20/10/5 dB factory noise, n=48 per cell): normalised WER · tag exact-match · number exact-match · all-tags-and-numbers-correct

| Model | te | te-en | hi | hi-en | en |
|---|---|---|---|---|---|
| IndicConformer-600M (ONNX, CPU) | 0.31 · 0.60 · 0.77 · 0.46 | 0.34 · 0.58 · 0.91 · 0.58 | 0.14 · 0.83 · 0.82 · 0.58 | 0.18 · 0.79 · 0.84 · 0.71 | — |
| SraVaani-1.0 (GPU) | 0.50 · 0.52 · 0.65 · 0.31 | 0.40 · 0.56 · 0.94 · 0.52 | 0.22 · 0.75 · 0.76 · 0.52 | 0.35 · 0.56 · 0.77 · 0.44 | 0.27 · 0.67 · 0.98 · 0.52 |
| Whisper large-v3 (GPU, fp16) | 0.81 · 0.67 · 0.82 · 0.50 | 0.73 · 0.48 · 0.93 · 0.44 | 0.35 · 0.68 · 0.88 · 0.62 | 0.30 · 0.54 · 0.95 · 0.52 | 0.06 · 0.89 · 1.00 · 0.85 |
| Whisper large-v3-turbo (GPU, fp16) | 0.81 · 0.56 · 0.79 · 0.42 | 0.77 · 0.62 · 0.90 · 0.54 | 0.35 · 0.77 · 0.93 · 0.71 | 0.39 · 0.52 · 0.94 · 0.50 | 0.04 · 0.83 · 1.00 · 0.77 |
| faster-whisper turbo (CTranslate2 int8, CPU) | 0.84 · 0.54 · 0.81 · 0.48 | 0.76 · 0.50 · 0.93 · 0.48 | 0.39 · 0.75 · 0.90 · 0.67 | 0.40 · 0.56 · 0.93 · 0.52 | 0.03 · 0.83 · 1.00 · 0.77 |
| vasista22 whisper-telugu-large-v2 | 0.65 · 0.21 · 0.77 · 0.17 | 0.54 · 0.19 · 0.66 · 0.06 | — | — | — |
| vasista22 whisper-hindi-large-v2 | — | — | 0.53 · 0.12 · 0.22 · 0.00 | 0.52 · 0.19 · 0.25 · 0.04 | — |

### Noise robustness (domain set, all languages the model covers): tag EM / number EM per SNR

| Model | clean | 20 dB | 10 dB | 5 dB |
|---|---|---|---|---|
| IndicConformer-600M (ONNX, CPU) (n=48/SNR) | 0.92 / 0.89 | 0.84 / 0.86 | 0.53 / 0.80 | 0.55 / 0.80 |
| SraVaani-1.0 (GPU) (n=60/SNR) | 0.85 / 0.87 | 0.70 / 0.84 | 0.55 / 0.81 | 0.39 / 0.78 |
| Whisper large-v3 (GPU, fp16) (n=60/SNR) | 0.85 / 0.97 | 0.81 / 0.92 | 0.57 / 0.87 | 0.45 / 0.93 |
| Whisper large-v3-turbo (GPU, fp16) (n=60/SNR) | 0.85 / 0.96 | 0.81 / 0.94 | 0.52 / 0.90 | 0.52 / 0.87 |
| faster-whisper turbo (CTranslate2 int8, CPU) (n=60/SNR) | 0.81 / 0.94 | 0.73 / 0.93 | 0.55 / 0.92 | 0.52 / 0.89 |
| vasista22 whisper-telugu-large-v2 (n=24/SNR) | 0.25 / 0.65 | 0.29 / 0.68 | 0.17 / 0.85 | 0.08 / 0.68 |
| vasista22 whisper-hindi-large-v2 (n=24/SNR) | 0.22 / 0.36 | 0.22 / 0.18 | 0.00 / 0.10 | 0.15 / 0.31 |

### Speed and memory (batch 1, warm model, all clips the model ran)

| Model | clips | RTF | p50 latency s | p95 latency s | peak VRAM GB |
|---|---|---|---|---|---|
| IndicConformer-600M (ONNX, CPU) | 232 | 0.061 | 0.452 | 1.101 | CPU |
| SraVaani-1.0 (GPU) | 300 | 0.022 | 0.064 | 0.250 | 2.26 |
| Whisper large-v3 (GPU, fp16) | 300 | 0.184 | 1.468 | 3.828 | 3.46 |
| Whisper large-v3-turbo (GPU, fp16) | 300 | 0.042 | 0.283 | 0.991 | 1.75 |
| faster-whisper turbo (CTranslate2 int8, CPU) | 300 | 0.200 | 1.573 | 3.178 | CPU |
| vasista22 whisper-telugu-large-v2 | 116 | 0.625 | 4.843 | 11.082 | 3.21 |
| vasista22 whisper-hindi-large-v2 | 116 | 0.112 | 0.918 | 2.043 | 3.21 |

### Routed systems (domain set, 240 clips, utterance-weighted)

| System | tag EM | number EM | all-ok | mean normalised WER |
|---|---|---|---|---|
| **IndicConformer (te, hi, te-en, hi-en) + Whisper turbo (en)** | **0.728** | 0.868 | **0.621** | **0.204** |
| SraVaani (te, hi, te-en, hi-en) + Whisper turbo (en) | 0.645 | 0.825 | 0.513 | 0.300 |
| Whisper large-v3-turbo only | 0.661 | 0.912 | 0.588 | 0.470 |
| Whisper large-v3 only | 0.652 | 0.915 | 0.588 | 0.448 |
| SraVaani-1.0 only | 0.613 | 0.820 | 0.463 | 0.345 |

## Decision (proposed, implemented as the default)

`@deepseek-ai/dsh-asr-http` plus the `py/stt_server.py` sidecar, routing `te` and `hi` (code-mixed audio is sent with its matrix language) → IndicConformer-600M (ONNX, CPU, 0 GB VRAM), `en` → Whisper large-v3-turbo (1.75 GB), and `*` → SraVaani-1.0 (2.26 GB). Total peak VRAM is about 4 GB, inside the 12 GB budget. The model stays the one the repo already uses for Indic languages. What changes is that it runs warm behind HTTP, with tag folding, instead of being restored on every call.

Why not a single model: IndicConformer has no English, and Whisper cannot do Telugu. SraVaani covers all three but loses about 11 points of all-ok on the domain set.

## Caveats (read before trusting the numbers)

- The domain speech is **synthetic** (one TTS model, 6 speaker identities (male and female for each of te, hi and en), studio-clean before noise), and the noise is procedural rather than recorded. Real operator recordings with radio and handset channels, accents and disfluency will score lower. **Unresolved** until a real-recording set exists.
- Small cells: 20 FLEURS clips per language and 48 domain clips per language/mix cell. Differences under about 5 points are within noise.
- IndicConformer ran ONNX on CPU (20 vCPU, shared). Its latency would drop on GPU, but onnxruntime-rocm was not tried in this run.
- The prompts were LLM-written and reuse a few tag patterns. The tag inventory of a real plant (P&ID tag lists) should be used for the next round.
- Whisper turbo's licence is MIT. SraVaani-1.0 and IndicConformer-600M are MIT but gated on Hugging Face (access is auto-approved). svara-tts-v1 is Apache-2.0 and derives from Llama-3.2-3B, whose community licence terms may also apply to the generated test audio. That is **unresolved** for redistribution, which is why the audio is not committed.

## Next steps (proposed)

1. Record 100 to 200 real Tenglish/Hinglish operator prompts over the actual handset and radio channel and rerun the harness.
2. Feed the plant's real tag list into the normaliser as a lexicon (constrained fold, edit-distance snap to known tags).
3. Fuse numbers from Whisper turbo with words from IndicConformer for te/hi (Whisper's number EM is 5 to 10 points higher).
4. Try IndicConformer on GPU (onnxruntime-rocm) and a CTranslate2 build that matches the droplet's ROCm.
