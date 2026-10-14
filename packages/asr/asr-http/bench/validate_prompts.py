# Second pass: gpt-oss checks that "spoken" pronounces exactly "ref" (all tags, numbers); returns corrected spoken. Then script filters.
import json, urllib.request, concurrent.futures as cf, re, sys
URL='http://127.0.0.1:8001/v1/chat/completions'
d=json.load(open(sys.argv[1]))
SCRIPT={'te':'Telugu script','hi':'Devanagari','en':'lowercase English words'}
def chk(lang,x):
    base=lang.split('-')[0]
    u=f'''Reference transcript: {x["ref"]}
TTS text: {x["spoken"]}
The TTS text must be a faithful, complete spoken rendering of the reference: every word, every equipment tag spelled letter-by-letter and digit-by-digit, every number with its exact value and unit, nothing added or dropped, written only in {SCRIPT[base]} (no digits, no Latin letters{'' if base=='en' else ', no other scripts'}, no symbols like % or °). Fix any error. Return JSON {{"ok": true/false (was the original already faithful), "spoken": "<corrected TTS text>"}}'''
    body=json.dumps(dict(model='llm',messages=[dict(role='user',content=u)],temperature=0,max_tokens=3000)).encode()
    r=json.load(urllib.request.urlopen(urllib.request.Request(URL,body,{'Content-Type':'application/json'}),timeout=600))
    t=r['choices'][0]['message']['content']; m=re.search(r'\{.*\}',t,re.S); j=json.loads(m.group(0))
    return j
def clean_ok(lang,s):
    base=lang.split('-')[0]
    if re.search(r'[0-9%°/]',s): return False
    if base!='en' and re.search(r'[A-Za-z]',s): return False
    rng={'te':r'\u0C00-\u0C7F','hi':r'\u0900-\u097F','en':r'a-zA-Z'}[base]
    return not re.search(rf'[^{rng}\s,.\-?!\u0964\u200c\u200d\']',s)
out={}; jobs=[]
with cf.ThreadPoolExecutor(32) as ex:
    for lang,items in d.items():
        for x in items: jobs.append((lang,x,ex.submit(chk,lang,x)))
    for lang,x,f in jobs:
        try: j=f.result(); x['spoken_v']=j['spoken']; x['llm_ok']=j.get('ok')
        except Exception as e: x['spoken_v']=None; x['err']=repr(e)[:200]
        x['script_ok']=bool(x['spoken_v']) and clean_ok(lang,x['spoken_v'])
        out.setdefault(lang,[]).append(x)
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False,indent=1)
for l,it in out.items(): print(l,len(it),'script_ok',sum(x['script_ok'] for x in it),'orig_ok',sum(bool(x.get('llm_ok')) for x in it))
