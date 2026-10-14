#!/usr/bin/env python3
"""Score OCR outputs. usage: score.py <evalset_dir> <runs_dir> [engines...]  -> prints table, writes runs_dir/scores.json"""
import sys, json, re, os, unicodedata, html, statistics as st
from collections import Counter
from rapidfuzz.distance import Levenshtein

def to_lines(t):
    """Markdown/HTML OCR output -> plain lines; HTML table rows become '| a | b |' lines."""
    t = t or ''
    t = re.sub(r'^\s*---\n.*?\n---\n', '', t, flags=re.S)            # olmOCR front matter
    t = re.sub(r'<\|ref\|>.*?<\|/ref\|><\|det\|>.*?<\|/det\|>', '', t, flags=re.S)  # deepseek grounding
    t = re.sub(r'<\|[^|>]*\|>', '', t)
    t = re.sub(r'<table.*?</table>', lambda m: m.group(0).replace('\n', ' '), t, flags=re.S | re.I)
    t = re.sub(r'</t[dh]>\s*', ' | ', t, flags=re.I)
    t = re.sub(r'<tr[^>]*>', '\n| ', t, flags=re.I)
    t = re.sub(r'<br\s*/?>', ' ', t, flags=re.I)
    t = re.sub(r'<[^>]+>', ' ', t)
    t = html.unescape(t)
    return t.split('\n')

def norm(t):
    t = unicodedata.normalize('NFKC', t or '')
    t = re.sub('[\u2010\u2011\u2012\u2013\u2014\u2212]', '-', t)
    t = t.replace('\u2018', "'").replace('\u2019', "'").replace('\u201c', '"').replace('\u201d', '"').replace('•', ' ')
    return t

def plain(t, is_pred=True):
    lines = to_lines(t) if is_pred else (t or '').split('\n')
    out = []
    for ln in lines:
        if re.fullmatch(r'\s*\|?[\s:|-]*-{3,}[\s:|-]*\|?\s*', ln): continue   # md table separator
        ln = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', ln)
        ln = re.sub(r'(\*\*|__|`|^#+\s*|\$)', '', ln.strip())
        ln = ln.replace('|', ' ')
        ln = re.sub(r'^\s*([-*+])\s+', '', ln)
        out.append(ln)
    return re.sub(r'\s+', ' ', norm(' '.join(out))).strip()

def cell_key(c):
    c = norm(c); c = re.sub(r'(\*\*|__|`)', '', c); return re.sub(r'\s+', '', c)

def pred_cells(t):
    cells = []
    for ln in to_lines(t):
        s = ln.strip()
        if not s.startswith('|') or re.fullmatch(r'\|?[\s:|-]*-{3,}[\s:|-]*\|?', s): continue
        for c in s.strip('|').split('|'):
            k = cell_key(c)
            if k: cells.append(k)
    return cells

def f1(gt, pr):
    g, p = Counter(gt), Counter(pr); tp = sum((g & p).values())
    if not gt: return None
    prec = tp / max(1, sum(p.values())); rec = tp / sum(g.values())
    return 0.0 if tp == 0 else 2 * prec * rec / (prec + rec)

def bow_f1(gt, pr):
    return f1(gt.split(), pr.split()) if gt else None

def tag_recall(tags, pred):
    if not tags: return None
    p = re.sub(r'\s+', '', norm(pred))
    return sum(1 for t in tags if t in p) / len(tags)

def doc011(facts, pred_by_page):
    lines = []
    for t in pred_by_page.values(): lines += [norm(l) for l in to_lines(t)]
    rows = facts['rows']; ok = 0; detail = []
    for r in rows:
        hit = any(any(m.lower() in l.lower() for m in r['match']) and all(v.lower() in l.lower() for v in r['values']) for l in lines)
        ok += hit; detail.append((r['key'], hit))
    allp = norm(' '.join(pred_by_page.values()))
    ph = facts['phrases_p1'] + facts['phrases_p2']
    phr = sum(1 for x in ph if re.sub(r'\s+', '', norm(x)).lower() in re.sub(r'\s+', '', allp).lower())
    return {'row_fact_recall': round(ok / len(rows), 3), 'phrase_recall': round(phr / len(ph), 3), 'missed_rows': [k for k, h in detail if not h]}

def main():
    ev, runs = sys.argv[1], sys.argv[2]
    engines = sys.argv[3:] or sorted(d for d in os.listdir(runs) if os.path.isdir(os.path.join(runs, d)))
    items = [json.loads(l) for l in open(os.path.join(ev, 'manifest.jsonl'))]
    facts = json.load(open(os.path.join(os.path.dirname(os.path.abspath(ev)), 'doc011_facts.json')))
    allres = {}
    for e in engines:
        d = os.path.join(runs, e); per = []
        if not os.path.isdir(d): continue
        d011 = {}
        for it in items:
            f = os.path.join(d, it['id'] + '.json')
            if not os.path.exists(f): continue
            r = json.load(open(f)); pred = r.get('text') or ''
            if it['doc_id'] == 'DOC-011': d011[it['id']] = pred; continue
            gt = plain(it['gt_text'], False); pp = plain(pred)
            cer = min(1.0, Levenshtein.distance(pp, gt) / max(1, len(gt)))
            per.append({'id': it['id'], 'source': it['source'], 'deg': it['degradation'], 'type': it['doc_type'], 'cer': cer,
                        'bow_f1': bow_f1(gt, pp), 'cell_f1': f1([cell_key(c) for c in it['gt_cells'] if cell_key(c)], pred_cells(pred)) if it['gt_cells'] else None,
                        'tag_recall': tag_recall(it['gt_tags'], pred), 'error': r.get('error'), 'finish': r.get('finish_reason'), 'latency': r.get('latency_s')})
        def agg(rows, k):
            v = [x[k] for x in rows if x[k] is not None]; return round(st.mean(v), 4) if v else None
        run = json.load(open(os.path.join(d, '_run.json'))) if os.path.exists(os.path.join(d, '_run.json')) else {}
        res = {'pages_scored': len(per), 'errors': sum(1 for x in per if x['error']), 'truncated': sum(1 for x in per if x['finish'] == 'length'),
               'pages_per_min': run.get('pages_per_min'), 'run': run}
        for name, rows in [('all', per), ('synthetic', [x for x in per if x['source'] == 'synthetic']), ('real', [x for x in per if x['source'] == 'real'])] + \
                          [(f'syn_{g}', [x for x in per if x['source'] == 'synthetic' and x['deg'] == g]) for g in ('light', 'medium', 'heavy')] + \
                          [(f'real_{t}', [x for x in per if x['source'] == 'real' and x['type'] == t]) for t in sorted({x['type'] for x in per if x['source'] == 'real'})]:
            res[name] = {'n': len(rows), 'cer': agg(rows, 'cer'), 'bow_f1': agg(rows, 'bow_f1'), 'cell_f1': agg(rows, 'cell_f1'),
                         'n_cell_pages': sum(1 for x in rows if x['cell_f1'] is not None), 'tag_recall': agg(rows, 'tag_recall'),
                         'n_tag_pages': sum(1 for x in rows if x['tag_recall'] is not None)}
        res['doc011'] = doc011(facts, d011) if d011 else None
        res['per_page'] = per
        allres[e] = res
    json.dump(allres, open(os.path.join(runs, 'scores.json'), 'w'), indent=1)
    print(f"{'engine':14} {'n':>3} {'CER':>6} {'BoW-F1':>7} {'cellF1':>7} {'tagRec':>7} | {'synCER':>6} {'realCER':>7} {'heavyCER':>8} | {'p/min':>6} err trunc | DOC-011 rows/phr")
    for e, r in allres.items():
        a, s, re_, h = r['all'], r['synthetic'], r['real'], r['syn_heavy']
        dd = r['doc011'] or {}
        print(f"{e:14} {a['n']:>3} {a['cer'] or 0:6.3f} {a['bow_f1'] or 0:7.3f} {a['cell_f1'] or 0:7.3f} {a['tag_recall'] or 0:7.3f} | {s['cer'] or 0:6.3f} {re_['cer'] or 0:7.3f} {h['cer'] or 0:8.3f} | {r['pages_per_min'] or 0:6.1f} {r['errors']:>3} {r['truncated']:>5} | {dd.get('row_fact_recall')}/{dd.get('phrase_recall')}")

if __name__ == '__main__':
    main()
