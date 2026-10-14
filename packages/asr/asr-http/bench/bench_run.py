"""Run every STT candidate over data/manifest.json (inside hx-stt; batch=1, warm model).

usage: python bench_run.py <model-key> [...]
writes results/<key>.json : {model, load_s, peak_gb, device, res:[{id, hyp, sec}]}
"""
import gc, json, os, sys, time
import numpy as np, librosa, torch
R = '/root/hx/stt'; dev = 'cuda'
man = json.load(open(f'{R}/data/manifest.json'))
os.makedirs(f'{R}/results', exist_ok=True)


def run(key, model_id, langs, load, tx, device='cuda'):
    out = f'{R}/results/{key}.json'
    if os.path.exists(out):
        print('skip', key); return
    torch.cuda.empty_cache(); torch.cuda.reset_peak_memory_stats()
    t0 = time.time(); M = load(); load_s = time.time() - t0
    items = [m for m in man if m['lang'] in langs]
    tx(M, items[0]['wav16'], items[0]['lang'])  # warm-up, not timed
    res = []
    for m in items:
        if device == 'cuda': torch.cuda.synchronize()
        a = time.time(); h = tx(M, m['wav16'], m['lang'])
        if device == 'cuda': torch.cuda.synchronize()
        res.append(dict(id=m['id'], hyp=h, sec=round(time.time() - a, 4)))
        print(key, m['id'], h[:70], flush=True)
    pk = torch.cuda.max_memory_allocated() / 1e9 if device == 'cuda' else 0.0
    json.dump(dict(model=model_id, key=key, load_s=round(load_s, 1), peak_gb=round(pk, 2), device=device, res=res),
              open(out, 'w'), ensure_ascii=False, indent=1)
    del M; gc.collect(); torch.cuda.empty_cache()


def hf_whisper(repo):
    from transformers import WhisperForConditionalGeneration, WhisperProcessor
    pr = WhisperProcessor.from_pretrained(repo)
    mo = WhisperForConditionalGeneration.from_pretrained(repo, torch_dtype=torch.float16).to(dev).eval()
    mo.generation_config.forced_decoder_ids = None
    return pr, mo


def hf_whisper_tx(M, path, lang):
    pr, mo = M; w, _ = librosa.load(path, sr=16000)
    f = pr(w, sampling_rate=16000, return_tensors='pt').input_features.to(dev, torch.float16)
    tk = pr.tokenizer
    pre = [tk.convert_tokens_to_ids(t) for t in ['<|startoftranscript|>', f'<|{lang}|>', '<|transcribe|>', '<|notimestamps|>']]
    with torch.inference_mode():
        ids = mo.generate(f, decoder_input_ids=torch.tensor([pre], device=dev), max_new_tokens=220, num_beams=1)
    return tk.decode(ids[0], skip_special_tokens=True).strip()


which = sys.argv[1:]
for key, repo, langs in [
    ('whisper-large-v3', 'openai/whisper-large-v3', ['te', 'hi', 'en']),
    ('whisper-large-v3-turbo', 'openai/whisper-large-v3-turbo', ['te', 'hi', 'en']),
    ('vasista-whisper-te', 'vasista22/whisper-telugu-large-v2', ['te']),
    ('vasista-whisper-hi', 'vasista22/whisper-hindi-large-v2', ['hi']),
]:
    if key in which:
        try: run(key, repo, langs, lambda: hf_whisper(repo), hf_whisper_tx)
        except Exception as e:
            import traceback; traceback.print_exc(); print('FAIL', key, flush=True)

if 'sravaani' in which:
    sys.path.insert(0, '/root/speech_r2/gated_sravaani')
    def ld():
        from transformers import AutoModel
        return AutoModel.from_pretrained('/root/speech_r2/gated_sravaani', trust_remote_code=True).to(dev).eval()
    def tx(M, p, l):
        h = M.transcribe([p], return_hypotheses=True)[0]; return getattr(h, 'text', str(h)).strip()
    try: run('sravaani-1.0', 'ARTPARK-IISc/SraVaani-1.0', ['te', 'hi', 'en'], ld, tx)
    except Exception:
        import traceback; traceback.print_exc(); print('FAIL sravaani', flush=True)

if 'indicconformer' in which:
    def ld():
        import huggingface_hub
        _sd = huggingface_hub.snapshot_download
        huggingface_hub.snapshot_download = lambda repo_id=None, **k: repo_id if os.path.isdir(str(repo_id)) else _sd(repo_id=repo_id, **k)
        from transformers import AutoModel
        return AutoModel.from_pretrained('/root/speech_r2/gated_indicconf', trust_remote_code=True)
    def tx(M, p, l):
        w, _ = librosa.load(p, sr=16000); return str(M(torch.from_numpy(w).unsqueeze(0), l, 'rnnt')).strip()
    try: run('indicconformer-600m', 'ai4bharat/indic-conformer-600m-multilingual', ['te', 'hi'], ld, tx, device='cpu')
    except Exception:
        import traceback; traceback.print_exc(); print('FAIL indicconf', flush=True)

if 'faster-whisper-cpu' in which or 'faster-whisper-gpu' in which:
    for k in [x for x in which if x.startswith('faster-whisper')]:
        d = 'cuda' if k.endswith('gpu') else 'cpu'
        def ld():
            from faster_whisper import WhisperModel
            return WhisperModel('large-v3-turbo' if d == 'cuda' else 'large-v3-turbo', device=d,
                                compute_type='float16' if d == 'cuda' else 'int8', cpu_threads=16)
        def tx(M, p, l):
            segs, _ = M.transcribe(p, language=l, beam_size=1, condition_on_previous_text=False, vad_filter=False)
            return ' '.join(s.text.strip() for s in segs).strip()
        try: run(f'{k}-turbo', 'mobiuslabsgmbh/faster-whisper-large-v3-turbo (CTranslate2)', ['te', 'hi', 'en'], ld, tx, device=d)
        except Exception:
            import traceback; traceback.print_exc(); print('FAIL', k, flush=True)
print('BENCHDONE', which, flush=True)
