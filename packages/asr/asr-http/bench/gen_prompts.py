# Generate synthetic plant-floor prompts with gpt-oss-120b (droplet, 127.0.0.1:8001). Synthetic data only.
import json, urllib.request, concurrent.futures as cf, re, sys
URL='http://127.0.0.1:8001/v1/chat/completions'
SPEC={
 'te':('Telugu','Telugu script only, except equipment tags/units which stay in canonical Latin form in "ref"'),
 'hi':('Hindi','Devanagari script only, except equipment tags/units which stay in canonical Latin form in "ref"'),
 'en':('Indian English','English'),
 'te-en':('Telugu-English code-mixed (Tenglish, as spoken by Hyderabad refinery operators: Telugu grammar with English technical words)','Telugu script for Telugu words, English technical words written in Latin script'),
 'hi-en':('Hindi-English code-mixed (Hinglish, as spoken by refinery operators: Hindi grammar with English technical words)','Devanagari for Hindi words, English technical words in Latin script'),
}
SYS='You write realistic short spoken utterances by refinery/process-plant control-room operators. Output strict JSON only.'
def ask(lang,n,seed):
    name,script=SPEC[lang]
    u=f'''Write {n} distinct utterances in {name} that an operator would say to a voice assistant on a refinery plant floor (pumps, compressors, heat exchangers, columns, valves, alarms, permits, shift handover). Each MUST contain at least one equipment tag in ISA style (examples of the style only, invent new ones: P-101A, FV-2203, TI-405, E-301B, K-1102, PSV-118, LIC-207) and at least one number with a unit (pressure in bar or kg/cm2, temperature in degrees C, flow in m3/h, percent, rpm). Keep each 8-20 words. Variation seed {seed}.
For each, give:
 "ref": the canonical transcript ({script}); tags exactly like P-101A, numbers as digits (e.g. 12.5, 340), units as bar, °C, m3/h, %, rpm.
 "spoken": the SAME utterance written fully as it is pronounced, for a text-to-speech engine that reads only {'Telugu script' if lang.startswith('te') else 'Devanagari' if lang.startswith('hi') else 'English words'}: spell tags letter-by-letter and digit-by-digit the way operators say them (e.g. P-101A -> "pee one zero one ay" style but written in that script), numbers in words as operators say them (English number words are common; write them in that script), no digits or Latin letters{' at all' if lang!='en' else ''}.
 "tags": list of tags in canonical form; "numbers": list of the numeric values as strings.
Return JSON: {{"items":[{{"ref":...,"spoken":...,"tags":[...],"numbers":[...]}}]}}'''
    body=json.dumps(dict(model='llm',messages=[dict(role='system',content=SYS),dict(role='user',content=u)],temperature=0.8,max_tokens=6000)).encode()
    r=json.load(urllib.request.urlopen(urllib.request.Request(URL,body,{'Content-Type':'application/json'}),timeout=600))
    t=r['choices'][0]['message']['content']; m=re.search(r'\{.*\}',t,re.S)
    return lang,json.loads(m.group(0))['items']
jobs=[('te',10,1),('te',10,2),('hi',10,1),('hi',10,2),('en',12,1),('te-en',10,1),('te-en',6,2),('hi-en',10,1),('hi-en',6,2)]
out={}
with cf.ThreadPoolExecutor(9) as ex:
    for f in cf.as_completed([ex.submit(ask,*j) for j in jobs]):
        try: l,items=f.result(); out.setdefault(l,[]).extend(items); print(l,len(items),flush=True)
        except Exception as e: print('ERR',repr(e)[:300],flush=True)
json.dump(out,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
