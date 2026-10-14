# End-to-end smoke test of py/stt_server.py with the benchmark routing (run inside hx-stt).
import base64, json, time, urllib.request, statistics as st, sys
sys.path.insert(0, '/root/hx/stt/sidecar')
import plantnorm as pn
man = json.load(open('/root/hx/stt/data/manifest.json'))
op = urllib.request.build_opener(urllib.request.ProxyHandler({}))
print(op.open('http://127.0.0.1:8790/healthz').read().decode())
items = [m for m in man if m['set'] == 'domain' and m['variant'] in ('clean', 'snr10')][::4][:30] + [m for m in man if m['set'] == 'fleurs'][::6]
out = []; lat = []
for m in items:
    body = json.dumps(dict(language=m['lang'], audio_b64=base64.b64encode(open(m['wav16'], 'rb').read()).decode())).encode()
    t = time.time(); r = json.loads(op.open(urllib.request.Request('http://127.0.0.1:8790/v1/transcribe', body, {'Content-Type': 'application/json'})).read()); dt = time.time() - t
    lat.append(dt); ht = set(pn.tags_of(pn.canonicalize(r['text'])))
    out.append(dict(id=m['id'], engine=r['engine'], rtt=round(dt, 3), engine_s=r['seconds'], tags_ok=all(x in ht for x in m['tags']), text=r['text'], raw=r['raw']))
    print(m['id'], r['engine'], round(dt, 3), '|', r['text'][:90], flush=True)
json.dump(out, open('/root/hx/stt/smoke_sidecar.json', 'w'), ensure_ascii=False, indent=1)
print('N', len(lat), 'rtt p50', round(st.median(lat), 3), 'p95', round(sorted(lat)[int(.95 * (len(lat) - 1))], 3),
      'tag-ok', sum(o['tags_ok'] for o in out if o['id'].startswith('dom')), '/', sum(1 for o in out if o['id'].startswith('dom')))
