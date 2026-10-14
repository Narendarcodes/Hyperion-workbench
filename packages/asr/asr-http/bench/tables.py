import json
R=json.load(open('scores.json'))
M=['indicconformer-600m','sravaani-1.0','whisper-large-v3','whisper-large-v3-turbo','faster-whisper-cpu-turbo','vasista-whisper-te','vasista-whisper-hi']
NAME={'indicconformer-600m':'IndicConformer-600M (ONNX, CPU)','sravaani-1.0':'SraVaani-1.0 (GPU)','whisper-large-v3':'Whisper large-v3 (GPU, fp16)','whisper-large-v3-turbo':'Whisper large-v3-turbo (GPU, fp16)','faster-whisper-cpu-turbo':'faster-whisper turbo (CTranslate2 int8, CPU)','vasista-whisper-te':'vasista22 whisper-telugu-large-v2','vasista-whisper-hi':'vasista22 whisper-hindi-large-v2'}
def get(m,s,mix,v='all'):
    for r in R:
        if r['model']==m and r['set']==s and r['mix']==mix and r['variant']==v: return r
f=lambda x: '—' if x is None else f'{x:.3f}'
out=[]
out.append('### FLEURS test (read speech), WER / CER\n\n| Model | te (n=20) | hi (n=20) | en (n=20) |\n|---|---|---|---|')
for m in M:
    c=[get(m,'fleurs',l) for l in ['te','hi','en']]
    out.append(f'| {NAME[m]} | '+' | '.join('—' if r is None else f"{r['wer']:.3f} / {r['cer']:.3f}" for r in c)+' |')
out.append('\n### Plant-floor domain set (clean + 20/10/5 dB factory noise, n=48 per cell): normalised WER · tag exact-match · number exact-match · all-tags-and-numbers-correct\n\n| Model | te | te-en | hi | hi-en | en |\n|---|---|---|---|---|---|')
for m in M:
    c=[get(m,'domain',l) for l in ['te','te-en','hi','hi-en','en']]
    out.append(f'| {NAME[m]} | '+' | '.join('—' if r is None else f"{r['wer']:.2f} · {r['tag_em']:.2f} · {r['num_em']:.2f} · {r['utt_all_ok']:.2f}" for r in c)+' |')
out.append('\n### Noise robustness (domain set, all languages the model covers): tag EM / number EM per SNR\n\n| Model | clean | 20 dB | 10 dB | 5 dB |\n|---|---|---|---|---|')
for m in M:
    c=[get(m,'domain','all',v) for v in ['clean','snr20','snr10','snr5']]
    out.append(f'| {NAME[m]} (n={c[0]["n"]}/SNR) | '+' | '.join(f"{r['tag_em']:.2f} / {r['num_em']:.2f}" for r in c)+' |')
out.append('\n### Speed and memory (batch 1, warm model, all clips the model ran)\n\n| Model | clips | RTF | p50 latency s | p95 latency s | peak VRAM GB |\n|---|---|---|---|---|---|')
for m in M:
    r=get(m,'all','all')
    out.append(f"| {NAME[m]} | {r['n']} | {r['rtf']:.3f} | {r['p50_s']:.3f} | {r['p95_s']:.3f} | {'CPU' if r['device']=='cpu' else f'{r[chr(112)+chr(101)+chr(97)+chr(107)+chr(95)+chr(103)+chr(98)]:.2f}'} |")
open('tables.md','w').write('\n'.join(out)+'\n'); print('\n'.join(out))
