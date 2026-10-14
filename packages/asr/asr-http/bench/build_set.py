"""Build the Hyperion STT test set (runs inside hx-stt on the droplet).

  * FLEURS test (CC-BY-4.0): 20 te_in + 20 hi_in + 20 en_us utterances (read speech)
  * Synthetic plant-floor prompts: 60 (12 each te, hi, en, te-en, hi-en) written by gpt-oss-120b,
    verbalised deterministically (plantnorm.verbalize), synthesised with kenpath/svara-tts-v1 (Apache-2.0),
    then mixed with procedural factory noise at 20 / 10 / 5 dB SNR -> 60 x 4 = 240 clips.
Total 300 utterances.  Output: /root/hx/stt/data/{manifest.json, wav16/*.wav}
"""
import zlib, csv, glob, json, os, random, re, sys, tarfile
import numpy as np, soundfile as sf, librosa, torch
sys.path.insert(0, '/root/hx/stt')
import plantnorm as pn

R = '/root/hx/stt/data'; W = f'{R}/wav16'; os.makedirs(W, exist_ok=True)
rng = random.Random(7)
man = []

# ---------------------------------------------------------------- FLEURS
def fleurs(lang, d, n=20):
    if not os.path.exists(f'{d}/test.tsv'):
        from huggingface_hub import hf_hub_download
        os.makedirs(d, exist_ok=True)
        for f in ['test.tsv', 'audio/test.tar.gz']:
            p = hf_hub_download('google/fleurs', f'data/en_us/{f}', repo_type='dataset')
            os.system(f'cp -L {p} {d}/{os.path.basename(f)}')
    if not glob.glob(f'{d}/test/*.wav'):
        with tarfile.open(f'{d}/test.tar.gz') as t: t.extractall(d)
    seen = set(); k = 0
    for row in csv.reader(open(f'{d}/test.tsv'), delimiter='\t', quoting=csv.QUOTE_NONE):
        if row[0] in seen: continue
        seen.add(row[0]); p = glob.glob(f'{d}/test/{row[1]}') or glob.glob(f'{d}/**/{row[1]}', recursive=True)
        if not p: continue
        w, _ = librosa.load(p[0], sr=16000); o = f'{W}/fleurs_{lang}_{row[0]}.wav'; sf.write(o, w, 16000)
        man.append(dict(id=f'fleurs_{lang}_{row[0]}', lang=lang, mix=lang, set='fleurs', variant='clean', src='FLEURS test (CC-BY-4.0)',
                        wav16=o, ref=row[2], tags=[], numbers=[], dur=round(len(w) / 16000, 2)))
        k += 1
        if k == n: break

fleurs('te', '/root/speech_r2/clips/fleurs_te_in')
fleurs('hi', '/root/speech_r2/clips/fleurs_hi_in')
fleurs('en', f'{R}/fleurs_en_us')
print('fleurs', len(man), flush=True)

# ---------------------------------------------------------------- domain prompts
raw = json.load(open(f'{R}/prompts_raw.json'))
wmap = json.load(open(f'{R}/te_translit.json'))
picked = []
for mix in ['te', 'hi', 'en', 'te-en', 'hi-en']:
    base = mix.split('-')[0]; n = 0
    for i, x in enumerate(raw[mix]):
        ref = x['ref'].replace('cheyyandi', 'చేయండి')
        if base == 'te': ref = pn.native_ref(ref, wmap)
        ref = re.sub(r'\s+', ' ', ref).strip()
        if not pn.ref_tags(ref) or not pn.ref_numbers(ref): continue
        spoken = pn.verbalize(ref, base, wmap if base == 'te' else None)
        if base != 'en' and re.search(r'[A-Za-z0-9]', spoken): continue
        if base == 'en' and re.search(r'[0-9]', spoken): continue
        picked.append(dict(mix=mix, lang=base, i=i, ref=ref, spoken=spoken)); n += 1
        if n == 12: break
    print(mix, n, flush=True)

from transformers import AutoTokenizer, AutoModelForCausalLM
from snac import SNAC
dev = 'cuda'
snac = SNAC.from_pretrained('hubertsiuzdak/snac_24khz').to(dev)
tok = AutoTokenizer.from_pretrained('kenpath/svara-tts-v1')
model = AutoModelForCausalLM.from_pretrained('kenpath/svara-tts-v1', torch_dtype=torch.bfloat16).to(dev).eval()
LN = {'en': 'English', 'te': 'Telugu', 'hi': 'Hindi'}

def decode_row(r):
    idx = (r == 128257).nonzero(as_tuple=True)[0]
    c = r[idx[-1] + 1:] if len(idx) else r
    row = c[(c != 128258) & (c != 128263)]; row = row[:(row.size(0) // 7) * 7]; cl = [int(t) - 128266 for t in row]
    L = [[], [], []]
    for i in range(len(cl) // 7):
        b = 7 * i
        L[0].append(cl[b]); L[1].append(cl[b + 1] - 4096); L[2] += [cl[b + 2] - 2 * 4096, cl[b + 3] - 3 * 4096]
        L[1].append(cl[b + 4] - 4 * 4096); L[2] += [cl[b + 5] - 5 * 4096, cl[b + 6] - 6 * 4096]
    if not L[0] or min(min(x) for x in L) < 0 or max(max(x) for x in L) > 4095: return None
    with torch.inference_mode():
        return snac.decode([torch.tensor(x, device=dev).unsqueeze(0) for x in L]).squeeze().float().cpu().numpy()

def genb(prompts):
    seqs = [[128259] + tok(p).input_ids + [128009, 128260] for p in prompts]
    n = max(map(len, seqs))
    ids = torch.tensor([[128263] * (n - len(x)) + x for x in seqs]).to(dev)
    am = torch.tensor([[0] * (n - len(x)) + [1] * len(x) for x in seqs]).to(dev)
    with torch.inference_mode():
        g = model.generate(input_ids=ids, attention_mask=am, max_new_tokens=1600, do_sample=True, temperature=0.6, top_p=0.8,
                           repetition_penalty=1.1, eos_token_id=128258, pad_token_id=128263)
    return [decode_row(r[n:]) for r in g]

for k, p in enumerate(picked):
    p['speaker'] = f"{LN[p['lang']]} ({'Female' if k % 2 else 'Male'})"
    p['id'] = f"dom_{p['mix']}_{p['i']:02d}"
todo = [p for p in picked if not os.path.exists(f"{R}/tts24/{p['id']}.wav")]
os.makedirs(f'{R}/tts24', exist_ok=True)
for att in range(3):
    if not todo: break
    nt = []
    for b in range(0, len(todo), 12):
        chunk = todo[b:b + 12]
        ws = genb([f"{p['speaker']}: {p['spoken']} <clear>" for p in chunk])
        for p, w in zip(chunk, ws):
            # plausibility: >= 0.04 s per character of spoken text and <= 0.25 s/char, else regenerate
            if w is None or not (0.035 * len(p['spoken']) <= len(w) / 24000 <= 0.25 * len(p['spoken'])): nt.append(p)
            else: sf.write(f"{R}/tts24/{p['id']}.wav", w, 24000)
    todo = nt; print('tts attempt', att, 'remaining', len(todo), flush=True)
del model; torch.cuda.empty_cache()

# ---------------------------------------------------------------- procedural factory noise
def factory_noise(n, sr, seed):
    r = np.random.default_rng(seed); t = np.arange(n) / sr
    white = r.standard_normal(n)
    f = np.fft.rfftfreq(n, 1 / sr); spec = np.fft.rfft(white); spec[1:] /= np.sqrt(f[1:]); pink = np.fft.irfft(spec, n)
    pink /= np.std(pink) + 1e-9
    hum = sum((0.6 / h) * np.sin(2 * np.pi * 50 * h * t + r.uniform(0, 6.28)) for h in range(1, 8))          # 50 Hz mains/motor harmonics
    f0 = r.uniform(180, 420); am = 1 + 0.4 * np.sin(2 * np.pi * r.uniform(2, 8) * t)                             # rotating machinery whine
    whine = 0.5 * am * (np.sin(2 * np.pi * f0 * t) + 0.5 * np.sin(2 * np.pi * 2.03 * f0 * t))
    clank = np.zeros(n)                                                                                       # impulsive metal clanks
    for _ in range(int(r.integers(1, 4) * n / sr / 3) + 1):
        s0 = int(r.uniform(0, n - sr * 0.3)); L = int(sr * 0.25); env = np.exp(-np.arange(L) / (sr * 0.03))
        clank[s0:s0 + L] += 3 * env * np.sin(2 * np.pi * r.uniform(900, 2500) * np.arange(L) / sr) * r.uniform(0.5, 1.5)
    hiss = np.zeros(n)                                                                                        # steam/air leak bursts
    s0 = int(r.uniform(0, max(1, n - sr))); L = min(n - s0, int(sr * r.uniform(0.5, 1.5)))
    hp = np.diff(np.concatenate([[0], r.standard_normal(L)])); hiss[s0:s0 + L] = 0.8 * hp * np.hanning(L)
    x = pink + hum + whine + clank + hiss
    return x / (np.std(x) + 1e-9)

def mix(speech, snr, seed):
    noise = factory_noise(len(speech), 16000, seed)
    active = np.abs(speech) > 0.02 * np.max(np.abs(speech))
    ps = np.mean(speech[active] ** 2) if active.any() else np.mean(speech ** 2)
    pnz = np.mean(noise ** 2); y = speech + noise * np.sqrt(ps / (pnz * 10 ** (snr / 10)))
    return y / max(1.0, np.max(np.abs(y)) / 0.99)

for p in picked:
    src = f"{R}/tts24/{p['id']}.wav"
    if not os.path.exists(src): continue
    w, _ = librosa.load(src, sr=16000)
    for variant, snr in [('clean', None), ('snr20', 20), ('snr10', 10), ('snr5', 5)]:
        y = w if snr is None else mix(w, snr, seed=zlib.crc32(f"{p['id']}{snr}".encode()))
        o = f"{W}/{p['id']}_{variant}.wav"; sf.write(o, y, 16000)
        man.append(dict(id=f"{p['id']}_{variant}", lang=p['lang'], mix=p['mix'], set='domain', variant=variant,
                        src='synthetic: gpt-oss-120b prompt + svara-tts-v1 (Apache-2.0) + procedural factory noise',
                        speaker=p['speaker'], wav16=o, ref=p['ref'], spoken=p['spoken'], tags=pn.ref_tags(p['ref']),
                        numbers=pn.ref_numbers(p['ref']), dur=round(len(y) / 16000, 2)))
json.dump(man, open(f'{R}/manifest.json', 'w'), ensure_ascii=False, indent=1)
print('MANIFEST', len(man), {k: sum(1 for m in man if m['set'] == k) for k in ['fleurs', 'domain']}, flush=True)
