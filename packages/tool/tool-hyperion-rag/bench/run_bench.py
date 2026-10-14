#!/usr/bin/env python3
"""Benchmark Hyperion RAG on the synthetic hyperion_eval set.

  run_bench.py --eval-dir DIR --out DIR [--llm-url URL] [--concurrency 32] [--skip-gen]

Dataset: 300 synthetic docs, 600 answerable QA (300 lookup / 300 reasoning,
gold answer + evidence quote), 300 unanswerable (answer not in the doc).

Retrieval (answerable only): doc hit@{1,3,5,10}, MRR@10 (doc level),
evidence-chunk hit@5 (a top-5 chunk contains the gold evidence quote).
Configs: bm25, dense@768/256, hybrid@768/256, hybrid+rerank@768/256, for the
original questions and a "de-identified" variant with document ids removed
(the eval questions name their doc id, which makes lexical lookup easy).

Answers: gpt-oss-120b (reasoning low) over top-5 chunks; judged by
gpt-oss-120b in batches of 10 against the gold answer (1 / 0.5 / 0). An
abstention on an answerable question scores 0. Abstention P/R treats
"abstained" as the positive prediction and unanswerable as the positive class.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))

from hyperion_rag.pipeline import LLM, LLMUnavailable, Hit, Index, answer, locate, parse_json_obj, rrf  # noqa: E402

DOC_ID_RE = re.compile(r"\b(?:document|doc|sop|in)?\s*HYP[\-\u2011\u2010]?[A-Z]{3}[\-\u2011\u2010]?\d{3}\b,?", re.I)


def deidentify(q: str) -> str:
    q2 = DOC_ID_RE.sub(" ", q)
    return re.sub(r"\s{2,}", " ", q2).strip(" ,")


def load_eval(d: str):
    qa = json.load(open(os.path.join(d, "qa_pairs.json")))
    un = json.load(open(os.path.join(d, "unanswerable_questions.json")))
    return qa, un


# ------------------------------------------------------------------ retrieval stage
def retrieval_runs(index: Index, encoder, reranker, questions: list[dict], variant: str) -> dict:
    """Return {config: [list of (idx, score) top10 per question]} and rerank top scores."""
    from hyperion_rag.dense import search, truncate

    texts = [q["q"] if variant == "orig" else deidentify(q["q"]) for q in questions]
    qv = encoder.encode_queries(texts)
    runs: dict[str, list] = {}
    bm = [index.bm25.search(t, 100) for t in texts]
    runs["bm25"] = [b[:10] for b in bm]
    for dim in (768, 256):
        mat = index.dense_at(dim)
        qd = truncate(qv, dim)
        dn = [search(mat, qd[i], 100) for i in range(len(texts))]
        runs[f"dense@{dim}"] = [d[:10] for d in dn]
        hy = [rrf([bm[i], dn[i]]) for i in range(len(texts))]
        runs[f"hybrid@{dim}"] = [h[:10] for h in hy]
        rr = []
        for i, t in enumerate(texts):
            cand = [c for c, _ in hy[i][:30]]
            sc = reranker.score(t, [index.chunks[c].index_text() for c in cand])
            rr.append(sorted(zip(cand, sc), key=lambda x: -x[1])[:10])
        runs[f"hybrid_rerank@{dim}"] = rr
    return {"texts": texts, "runs": runs}


def _norm(s: str) -> str:
    from hyperion_rag.pipeline import _norm_map

    return _norm_map(s)[0].strip()


def ev_cover(evidence: str, text: str) -> float:
    """Share of the gold evidence's tokens present in ``text`` (gold quotes are often stitched/paraphrased)."""
    from hyperion_rag.bm25 import tokenize

    et = set(tokenize(evidence or ""))
    return len(et & set(tokenize(text))) / max(1, len(et))


EV_TH = 0.7


def retrieval_metrics(index: Index, qa: list[dict], runs: dict) -> dict:
    out = {}
    for cfg, lists in runs.items():
        hits = {1: 0, 3: 0, 5: 0, 10: 0}
        mrr = 0.0
        ev5 = 0
        for q, lst in zip(qa, lists):
            docs = []
            for i, _ in lst:
                d = index.chunks[i].doc_id
                if d not in docs:
                    docs.append(d)
            if q["doc_id"] in docs:
                r = docs.index(q["doc_id"]) + 1
                mrr += 1 / r
                for k in hits:
                    if r <= k:
                        hits[k] += 1
            if any(index.chunks[i].doc_id == q["doc_id"] and ev_cover(q.get("evidence", ""), index.chunks[i].text) >= EV_TH
                   for i, _ in lst[:5]):
                ev5 += 1
        n = len(qa)
        out[cfg] = {**{f"doc_hit@{k}": round(v / n, 4) for k, v in hits.items()},
                    "mrr@10": round(mrr / n, 4), "evidence_chunk_hit@5": round(ev5 / n, 4), "n": n}
    return out


# ------------------------------------------------------------------ generation + judge
JUDGE_PROMPT = """You grade answers to questions about industrial documents.
For each item compare the CANDIDATE with the GOLD answer. Score 1 if the key facts match
(units/format differences are fine), 0.5 if partially correct or incomplete, 0 if wrong,
missing, or the candidate says the information is not available.
Return ONLY a JSON object: {{"scores": [{{"id": <id>, "score": <1|0.5|0>}} ...]}}

{items}"""


def judge_batch(llm: LLM, items: list[dict]) -> dict:
    body = "\n\n".join(f"id={it['id']}\nQUESTION: {it['q']}\nGOLD: {it['gold']}\nCANDIDATE: {it['ans']}" for it in items)
    for _ in range(3):
        try:
            raw = llm.chat([{"role": "user", "content": JUDGE_PROMPT.format(items=body)}], max_tokens=3000)
        except LLMUnavailable:
            continue
        obj = parse_json_obj(raw)
        if obj and isinstance(obj.get("scores"), list):
            got = {}
            for s in obj["scores"]:
                try:
                    got[str(s["id"])] = float(s["score"])
                except Exception:
                    pass
            if len(got) >= len(items):
                return got
    return {}


def gen_config(index: Index, items: list[dict], lists: list, llm: LLM, conc: int, expand: int = 1) -> list[dict]:
    def one(args):
        it, lst = args
        hits = [Hit(i, s, {"rerank": s} if it["_rr"] else {}) for i, s in lst[:5]]
        t0 = time.time()
        res = None
        for _ in range(3):  # infra failures are retried, never scored
            try:
                res = answer(index, it["text"], hits, llm, gate=None, require_verified=True, expand=expand)
                break
            except LLMUnavailable as exc:
                res = {"infra_error": str(exc)}
        if "infra_error" in res:
            res.update({"abstain": True, "abstain_reason": "infra_error", "answer": None, "citations": [],
                        "raw_answer": None, "model_abstain": None, "question": it["text"]})
        res["latency_s"] = round(time.time() - t0, 2)
        res["qid"], res["doc_id"], res["type"] = it["qid"], it["doc_id"], it["type"]
        res["gold"] = it.get("gold")
        res["evidence_gold"] = it.get("evidence")
        res["top_score"] = lst[0][1] if lst else None
        return res

    with ThreadPoolExecutor(conc) as ex:
        return list(ex.map(one, zip(items, lists)))


def score_config(index: Index, results: list[dict], llm: LLM, conc: int) -> dict:
    infra = sum(1 for r in results if r.get("abstain_reason") == "infra_error")
    results = [r for r in results if r.get("abstain_reason") != "infra_error"]
    # judge: strict (after citation gate) and raw (model answer before citation gate)
    todo = []
    for r in results:
        if r["type"] == "unanswerable":
            continue
        if r.get("raw_answer") and not r.get("model_abstain"):
            todo.append({"id": r["qid"], "q": r["question"], "gold": r["gold"], "ans": r["raw_answer"]})
    batches = [todo[i:i + 10] for i in range(0, len(todo), 10)]
    scores: dict = {}
    with ThreadPoolExecutor(conc) as ex:
        for got in ex.map(lambda b: judge_batch(llm, b), batches):
            scores.update(got)
    for r in results:
        r["judge_missing"] = r["type"] != "unanswerable" and bool(r.get("raw_answer")) and not r.get("model_abstain") and r["qid"] not in scores
        r["raw_score"] = scores.get(r["qid"], 0.0) if r["type"] != "unanswerable" and r.get("raw_answer") and not r.get("model_abstain") else 0.0
        r["score"] = 0.0 if r["abstain"] else r["raw_score"]
    ans = [r for r in results if r["type"] != "unanswerable" and not r["judge_missing"]]
    una = [r for r in results if r["type"] == "unanswerable"]
    tp = sum(r["abstain"] for r in una)
    fp = sum(r["abstain"] for r in ans)
    m = {
        "n_answerable": len(ans), "n_unanswerable": len(una),
        "accuracy": round(sum(r["score"] for r in ans) / len(ans), 4),
        "accuracy_before_citation_gate": round(sum(r["raw_score"] for r in ans) / len(ans), 4),
        "accuracy_lookup": round(sum(r["score"] for r in ans if r["type"] == "lookup") / max(1, sum(r["type"] == "lookup" for r in ans)), 4),
        "accuracy_reasoning": round(sum(r["score"] for r in ans if r["type"] == "reasoning") / max(1, sum(r["type"] == "reasoning" for r in ans)), 4),
        "abstention_precision": round(tp / max(1, tp + fp), 4),
        "abstention_recall": round(tp / max(1, len(una)), 4),
        "false_abstain_rate_answerable": round(fp / len(ans), 4),
        "unanswerable_hallucination_rate": round(1 - tp / max(1, len(una)), 4),
        "judge_missing": sum(1 for t in todo if t["id"] not in scores),
        "excluded_infra_errors": infra,
    }
    answered = [r for r in ans if not r["abstain"]]
    if answered:
        doc_ok = sum(any(c["doc_id"] == r["doc_id"] for c in r["citations"]) for r in answered)
        ver = sum(all(c["quote_verified"] for c in r["citations"]) and r["citations"] != [] for r in answered)
        span_ok = 0
        by_id = {x.chunk_id: x for x in index.chunks}
        for r in answered:
            ev = r.get("evidence_gold") or ""
            span_ok += any(c["doc_id"] == r["doc_id"] and c["quote_verified"]
                           and ev_cover(ev, by_id[c["chunk_id"]].text) >= EV_TH for c in r["citations"])
        m.update({
            "answered": len(answered),
            "citation_doc_correct": round(doc_ok / len(answered), 4),
            "citation_all_quotes_verified": round(ver / len(answered), 4),
            "citation_in_gold_evidence_chunk": round(span_ok / len(answered), 4),
        })
    lat = sorted(r["latency_s"] for r in results)
    m["latency_p50_s"] = lat[len(lat) // 2]
    m["latency_p95_s"] = lat[int(len(lat) * 0.95)]
    return m


def gate_sweep(results: list[dict]) -> list[dict]:
    """Post-hoc retrieval gate on the top rerank score (no extra LLM calls)."""
    results = [r for r in results if r.get("abstain_reason") != "infra_error" and not r.get("judge_missing")]
    ans = [r for r in results if r["type"] != "unanswerable"]
    una = [r for r in results if r["type"] == "unanswerable"]
    rows = []
    for g in (0.0, 0.01, 0.02, 0.05, 0.1, 0.2, 0.3):
        def ab(r):
            return r["abstain"] or (r["top_score"] is not None and r["top_score"] < g)
        tp = sum(ab(r) for r in una)
        fp = sum(ab(r) for r in ans)
        acc = sum(0 if ab(r) else r["score"] for r in ans) / len(ans)
        rows.append({"gate": g, "accuracy": round(acc, 4), "abstention_precision": round(tp / max(1, tp + fp), 4),
                     "abstention_recall": round(tp / len(una), 4)})
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--eval-dir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--llm-url", default="http://127.0.0.1:8001/v1")
    ap.add_argument("--concurrency", type=int, default=32)
    ap.add_argument("--model", default="google/embeddinggemma-2")
    ap.add_argument("--gen-configs", default="bm25,dense@768,hybrid@768,hybrid_rerank@768,hybrid_rerank@256,noexp:hybrid_rerank@768,deid:hybrid_rerank@768")
    ap.add_argument("--skip-gen", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--corpus", nargs="*", default=[],
                    help="index these files/dirs instead of EVAL/documents.jsonl (e.g. an OCR'd copy of the corpus)")
    ap.add_argument("--reuse-retrieval", default="", help="retrieval_cache.pkl from an earlier run on the same index")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    log = open(os.path.join(a.out, "bench.log"), "a")

    def say(*x):
        msg = time.strftime("%H:%M:%S ") + " ".join(str(v) for v in x)
        print(msg, flush=True)
        log.write(msg + "\n")
        log.flush()

    from hyperion_rag.dense import DenseEncoder
    from hyperion_rag.rerank import Reranker
    import torch

    t0 = time.time()
    index = Index.build(a.corpus or [os.path.join(a.eval_dir, "documents.jsonl")])
    enc = DenseEncoder(a.model)
    say("encoder", enc.model_id, "fallback:", enc.fallback_reason)
    t1 = time.time()
    index.embed(enc)
    embed_s = time.time() - t1
    index.save(os.path.join(a.out, "index"))
    rer = Reranker()
    say("index", index.meta, f"embed {embed_s:.1f}s")
    qa, un = load_eval(a.eval_dir)
    if a.limit:
        qa, un = qa[:a.limit], un[:a.limit // 2]
    for u in un:
        u.setdefault("type", "unanswerable")
    allq = qa + un
    import pickle

    cache = os.path.join(a.out, "retrieval_cache.pkl")
    if a.reuse_retrieval and os.path.exists(a.reuse_retrieval):
        retr = pickle.load(open(a.reuse_retrieval, "rb"))
        say("retrieval reused from", a.reuse_retrieval)
    else:
        retr = {}
        for variant in ("orig", "deid"):
            t2 = time.time()
            retr[variant] = retrieval_runs(index, enc, rer, allq, variant)
            say("retrieval", variant, f"{time.time() - t2:.1f}s")
    pickle.dump(retr, open(cache, "wb"))
    metrics = {"dataset": {"docs": index.meta["n_docs"], "chunks": index.meta["n_chunks"],
                           "answerable": len(qa), "unanswerable": len(un)},
               "embedding_model": enc.model_id, "embedding_fallback_reason": enc.fallback_reason,
               "reranker": rer.model_id, "embed_seconds": round(embed_s, 1),
               "peak_vram_gb": round(torch.cuda.max_memory_allocated() / 2**30, 2) if torch.cuda.is_available() else None,
               "retrieval": {}}
    for variant in ("orig", "deid"):
        metrics["retrieval"][variant] = retrieval_metrics(index, qa, {k: v[:len(qa)] for k, v in retr[variant]["runs"].items()})
    json.dump(metrics, open(os.path.join(a.out, "metrics.json"), "w"), indent=1)
    say("retrieval metrics", json.dumps(metrics["retrieval"]["orig"]))
    if a.skip_gen:
        return
    llm = LLM(a.llm_url)
    metrics["generation"] = {}
    metrics["gate_sweep"] = {}
    for cfg in a.gen_configs.split(","):
        flags, name = (cfg.rsplit(":", 1)[0].split(":"), cfg.rsplit(":", 1)[1]) if ":" in cfg else ([], cfg)
        variant = "deid" if "deid" in flags else "orig"
        expand = 0 if "noexp" in flags else 1
        items = [{"qid": q["qid"], "doc_id": q["doc_id"], "type": q["type"], "gold": q.get("gold"),
                  "evidence": q.get("evidence"), "text": retr[variant]["texts"][i], "_rr": "rerank" in name}
                 for i, q in enumerate(allq)]
        t3 = time.time()
        res = gen_config(index, items, retr[variant]["runs"][name], llm, a.concurrency, expand)
        m = score_config(index, res, llm, a.concurrency)
        m["wall_s"] = round(time.time() - t3, 1)
        metrics["generation"][cfg] = m
        if "rerank" in name:
            metrics["gate_sweep"][cfg] = gate_sweep(res)
        with open(os.path.join(a.out, f"answers_{cfg.replace(':', '_').replace('@', '_')}.jsonl"), "w") as fh:
            for r in res:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        json.dump(metrics, open(os.path.join(a.out, "metrics.json"), "w"), indent=1)
        say("gen", cfg, json.dumps(m))
    metrics["total_wall_s"] = round(time.time() - t0, 1)
    json.dump(metrics, open(os.path.join(a.out, "metrics.json"), "w"), indent=1)
    say("done")


if __name__ == "__main__":
    main()
