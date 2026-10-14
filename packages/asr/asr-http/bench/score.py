"""Score results/*.json against data/manifest.json -> scores.json + scores.md

FLEURS rows: WER/CER on lightly normalised text (lowercase, punctuation stripped, NFC).
Domain rows: WER/CER on plantnorm.canonicalize() tokens (spelled tags -> P101A, English number words -> digits,
unit phrases -> unit tokens, applied to both sides), plus tag exact-match and number exact-match recall
(fraction of reference tags / numbers recovered from the canonicalised hypothesis) and the share of
utterances where *every* tag and number was recovered.
"""
import json, glob, re, sys, unicodedata, statistics as st
import plantnorm as pn

D = sys.argv[1] if len(sys.argv) > 1 else '.'
man = {m['id']: m for m in json.load(open(f'{D}/data/manifest.json'))}


def norm(s):
    s = unicodedata.normalize('NFC', s.lower()).replace('\u200c', '').replace('\u200d', '')
    s = re.sub(r'[\u0964\u0965]', ' ', s)
    s = re.sub(r'[^\w\s\u0900-\u097F\u0C00-\u0C7F]', ' ', s)
    return s.split()


def ed(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        p = d[:]; d[0] = i
        for j in range(1, len(b) + 1):
            d[j] = min(p[j] + 1, d[j - 1] + 1, p[j - 1] + (a[i - 1] != b[j - 1]))
    return d[len(b)]


def agg(rows, J):
    we = wn = ce = cn = 0; sec = dur = 0.0; tg = tn = ng = nn = 0; allok = 0; lat = []
    for r in rows:
        m = man[r['id']]
        if m['set'] == 'fleurs':
            R, H = norm(m['ref']), norm(r['hyp'])
        else:
            R, H = pn.canonicalize(m['ref']), pn.canonicalize(r['hyp'])
            ht, hn = set(pn.tags_of(H)), set(pn.numbers_of(H))
            rt, rn = [t for t in m['tags']], m['numbers']
            tg += sum(t in ht for t in rt); tn += len(rt); ng += sum(n in hn for n in rn); nn += len(rn)
            allok += all(t in ht for t in rt) and all(n in hn for n in rn)
        we += ed(R, H); wn += len(R)
        rc, hc = ''.join(R), ''.join(H); ce += ed(list(rc), list(hc)); cn += len(rc)
        sec += r['sec']; dur += m['dur']; lat.append(r['sec'])
    out = dict(n=len(rows), wer=round(we / max(wn, 1), 3), cer=round(ce / max(cn, 1), 3), rtf=round(sec / max(dur, 1e-9), 3),
               p50_s=round(st.median(lat), 3), p95_s=round(sorted(lat)[int(0.95 * (len(lat) - 1))], 3),
               audio_s=round(dur, 1), peak_gb=J['peak_gb'], device=J['device'])
    if tn:
        out.update(tag_em=round(tg / tn, 3), num_em=round(ng / max(nn, 1), 3), utt_all_ok=round(allok / len(rows), 3))
    return out


rows = []
for f in sorted(glob.glob(f'{D}/results/*.json')):
    J = json.load(open(f)); res = [r for r in J['res'] if r['id'] in man]
    groups = {}
    for r in res:
        m = man[r['id']]
        groups.setdefault(('all', 'all', 'all'), []).append(r)
        groups.setdefault((m['set'], m['mix'], 'all'), []).append(r)
        if m['set'] == 'domain':
            groups.setdefault(('domain', m['mix'], m['variant']), []).append(r)
            groups.setdefault(('domain', 'all', m['variant']), []).append(r)
            groups.setdefault(('domain', 'all', 'all'), []).append(r)
    for (s, mix, var), rs in groups.items():
        rows.append(dict(model=J['key'], model_id=J['model'], set=s, mix=mix, variant=var, **agg(rs, J)))
json.dump(rows, open(f'{D}/scores.json', 'w'), indent=1, ensure_ascii=False)
print(len(rows), 'rows')
