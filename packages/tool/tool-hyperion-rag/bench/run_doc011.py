#!/usr/bin/env python3
"""DOC-011 table-value benchmark against a running RAG service (service.py).

    python3 bench/run_doc011.py --rag-url http://127.0.0.1:8120 --repeats 3 --concurrency 81 --out out_doc011

For each answer-key item: /v1/search (is DOC-011 at the right page in the top 5?)
and /v1/answer (cited answer), scored by score_doc011.score_item.
"""
import argparse
import concurrent.futures as cf
import json
import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from score_doc011 import score_item  # noqa: E402

OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def post(url, doc, timeout=900):
    req = urllib.request.Request(url, json.dumps(doc).encode(), {"Content-Type": "application/json"})
    with OPENER.open(req, timeout=timeout) as r:
        return json.loads(r.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rag-url", default=os.environ.get("HYPERION_RAG_URL", "http://127.0.0.1:8120"))
    ap.add_argument("--key", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "doc011_answer_key.json"))
    ap.add_argument("--repeats", type=int, default=3)
    ap.add_argument("--concurrency", type=int, default=64)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    items = json.load(open(a.key, encoding="utf-8"))["items"]
    health = json.loads(OPENER.open(a.rag_url + "/health", timeout=30).read())

    def one(job):
        rep, it = job
        t0 = time.time()
        s = post(a.rag_url + "/v1/search", {"q": it["question"], "limit": 5})
        hit = any(p["documentId"] == "DOC-011" for p in s["passages"])
        hit_page = any(p["documentId"] == "DOC-011" and p["page"] == it["page"] for p in s["passages"])
        res = post(a.rag_url + "/v1/answer", {"question": it["question"], "limit": 8})
        sc = score_item(it, res)
        sc.update(repeat=rep, doc_hit5=hit, page_hit5=hit_page, latency_s=round(time.time() - t0, 2),
                  answer=res.get("answer"), citations=res.get("citations"), retrieval=res.get("retrieval"))
        return sc

    jobs = [(r, it) for r in range(a.repeats) for it in items]
    t0 = time.time()
    with cf.ThreadPoolExecutor(a.concurrency) as ex:
        rows = list(ex.map(one, jobs))
    wall = time.time() - t0
    with open(os.path.join(a.out, "answers.jsonl"), "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    keys = ["values_correct", "fully_correct", "value_in_verified_quote", "doc_cited", "page_correct", "doc_hit5", "page_hit5", "abstain"]
    per_rep = [{k: round(sum(r[k] for r in rows if r["repeat"] == i) / len(items), 4) for k in keys} for i in range(a.repeats)]
    summary = {"n_items": len(items), "repeats": a.repeats, "retrieval": health.get("retrieval"),
               "embed_model": health.get("embedModel"), "wall_s": round(wall, 1), "concurrency": a.concurrency,
               "mean": {k: round(sum(p[k] for p in per_rep) / a.repeats, 4) for k in keys}, "per_repeat": per_rep,
               "failing_items": sorted({r["id"] for r in rows if not r["fully_correct"]})}
    json.dump(summary, open(os.path.join(a.out, "summary.json"), "w"), indent=1)
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
