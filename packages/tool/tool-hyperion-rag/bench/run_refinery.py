#!/usr/bin/env python3
"""Benchmark 2: the public refinery corpus (13 docs, 3,494 pages) with HUMAN ground truth.

  run_refinery.py --processed DIR --html DOC-009.html --eval DIR --out DIR [--ocr DIR]

Scoring follows ``evaluation/scoring_schema.json``. ground_truth.json is the
ONLY reference: no AI answer is ever scored against another AI answer, and
every metric below is deterministic (string/page matching against the
corpus and the human claims). Definitions used (also in docs/benchmarks/rag.md):

- document_retrieval_accuracy: share of the case's ``input_documents`` present
  in the evidence handed to the model (mean over cases; ``all_docs`` = strict).
- page_retrieval_accuracy: share of verified citations whose (doc, page) equals
  a human ground-truth (doc, page) within +/-1 page (single-page docs: doc match).
- citation_correctness: share of citations whose quote is found verbatim
  (markdown/space tolerant) on the cited page AND whose (doc, page+/-1) is a
  human ground-truth evidence location. A verbatim quote on another page is
  "grounded" but not "correct" (reported separately as citation_grounded).
- citation_completeness: share of human claims (corpus-document claims only)
  with >=1 verified citation on the same doc and page +/-1.
- unsupported_claim_rate (hallucination rate): model claims with no verified
  citation / all model claims (unsupported claims are also withheld from the
  rendered answer).
- procedure_step_coverage (CASE-004/008) and safety_control_coverage
  (CASE-006/007): share of human claims whose content tokens are >=50 %
  present in the cited answer; safety coverage minus an invention penalty
  (= unsupported_claim_rate of that case), floored at 0.
- final_report_factual_accuracy (CASE-010): 1 - unsupported_claim_rate.
- CASE-009 rule: full marks if the answer states OCR is pending / text is not
  extractable and invents no table values; zero if it emits table values
  without OCR text in the corpus.
Not scored here (need human annotation of the model output): entity F1,
P&ID component F1, cross-document consistency.
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

from hyperion_rag.bm25 import tokenize  # noqa: E402
from hyperion_rag.pipeline import (LLM, Hit, Index, LLMUnavailable, answer_report, named_doc_hits,  # noqa: E402
                                   render_report_markdown, retrieve)

PROC = {"CASE-004", "CASE-008"}
SAFETY = {"CASE-006", "CASE-007"}
OCR_PENDING_RE = re.compile(r"ocr|scann|not (?:extractable|readable|available)|no (?:extractable )?text|image", re.I)


def cover(claim: str, text: str) -> float:
    ct = set(tokenize(claim))
    return len(ct & set(tokenize(text))) / max(1, len(ct))


def page_ok(gt_page, page: int, single_page: bool) -> bool:
    try:
        g = int(gt_page)
    except Exception:
        return False
    return single_page or abs(g - page) <= 1


def score_case(case: dict, gt: list[dict], res: dict, index: Index, npages: dict) -> dict:
    corpus_gt = [g for g in gt if str(g.get("source_document", "")).startswith("DOC-") and g["source_document"] in npages]
    ev_docs = {index.chunks[i].doc_id for i in []}
    ev_docs = {cid.split("#")[0] for cid in res.get("evidence", [])}
    req = case.get("input_documents", [])
    present = [d for d in req if d in ev_docs]
    m = {"case_id": case["case_id"], "difficulty": case.get("difficulty"),
         "document_retrieval_accuracy": round(len(present) / max(1, len(req)), 3),
         "all_required_docs_retrieved": len(present) == len(req)}
    claims = res.get("claims", [])
    dropped = res.get("dropped_claims", [])
    total_claims = len(claims) + len(dropped)
    m["claims"] = len(claims)
    m["unsupported_claims"] = len(dropped)
    m["unsupported_claim_rate"] = round(len(dropped) / total_claims, 3) if total_claims else None
    cites = [c for cl in claims for c in cl["citations"]]
    all_cites = cites + [c for cl in dropped for c in cl["citations"]]
    gt_locs = [(g["source_document"], g.get("page")) for g in corpus_gt]

    def at_gt(c):
        return any(c["doc_id"] == d and page_ok(p, c["page"], npages.get(d, 1) <= 1) for d, p in gt_locs)

    m["citations"] = len(all_cites)
    m["citation_grounded"] = round(sum(c["quote_verified"] for c in all_cites) / len(all_cites), 3) if all_cites else None
    m["citation_correctness"] = round(sum(c["quote_verified"] and at_gt(c) for c in all_cites) / len(all_cites), 3) if all_cites else None
    ver = [c for c in all_cites if c["quote_verified"]]
    m["page_retrieval_accuracy"] = round(sum(at_gt(c) for c in ver) / len(ver), 3) if ver else None
    if corpus_gt:
        done = 0
        for g in corpus_gt:
            if any(c["quote_verified"] and c["doc_id"] == g["source_document"]
                   and page_ok(g.get("page"), c["page"], npages.get(g["source_document"], 1) <= 1) for c in cites):
                done += 1
        m["citation_completeness"] = round(done / len(corpus_gt), 3)
    answer_text = " ".join(cl["text"] + " " + " ".join(c["quote"] for c in cl["citations"]) for cl in claims)
    answer_text += " " + " ".join(res.get("uncertainties", []))
    m["gt_claim_coverage"] = round(sum(cover(g["claim"], answer_text) >= 0.5 for g in gt) / max(1, len(gt)), 3)
    if case["case_id"] in PROC:
        hits = [cover(g["claim"], answer_text) >= 0.5 for g in gt]
        m["procedure_step_coverage"] = round(sum(hits) / len(gt), 3)
    if case["case_id"] in SAFETY:
        cov = sum(cover(g["claim"], answer_text) >= 0.5 for g in gt) / len(gt)
        pen = m["unsupported_claim_rate"] or 0.0
        m["safety_control_coverage"] = round(max(0.0, cov - pen), 3)
    if case["case_id"] == "CASE-010":
        m["final_report_factual_accuracy"] = round(1 - (m["unsupported_claim_rate"] or 0.0), 3) if total_claims else 0.0
    if case["case_id"] == "CASE-009":
        has_text = npages.get("DOC-011", 0) > 0
        said_pending = bool(OCR_PENDING_RE.search(" ".join(res.get("uncertainties", [])) + " " + answer_text)) or res.get("abstain")
        numbers = [cl for cl in claims if re.search(r"\d", cl["text"]) and any(c["doc_id"] == "DOC-011" for c in cl["citations"])]
        if not has_text:
            m["ocr_rule_score"] = 1.0 if said_pending and not numbers and not dropped else 0.0
        else:
            m["ocr_rule_score"] = None  # OCR text present: scored by citations above
        m["doc011_text_in_corpus"] = has_text
    return m


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--processed", required=True)
    ap.add_argument("--html", nargs="*", default=[])
    ap.add_argument("--ocr", default="")
    ap.add_argument("--eval", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--llm-url", default="http://127.0.0.1:8001/v1")
    ap.add_argument("--configs", default="bm25,hybrid@768,hybrid_rerank@768,hybrid_rerank@256")
    ap.add_argument("--k", type=int, default=8)
    ap.add_argument("--keep-previous", action="store_true", help="merge into an existing refinery_metrics.json")
    ap.add_argument("--reuse-index", action="store_true", help="reuse OUT/index when it already has dense vectors")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    from hyperion_rag.dense import DenseEncoder
    from hyperion_rag.rerank import Reranker

    sources = [a.processed] + a.html
    if a.ocr and os.path.isdir(a.ocr) and os.listdir(a.ocr):
        sources.insert(0, a.ocr)  # OCR text wins over the empty scanned pages (first id kept)
    t0 = time.time()
    enc = DenseEncoder()
    idx_dir = os.path.join(a.out, "index")
    if a.reuse_index and os.path.exists(os.path.join(idx_dir, "dense.npy")):
        index = Index.load(idx_dir)
        embed_s = float(index.meta.get("embed_seconds", 0))
    else:
        index = Index.build(sources)
        t1 = time.time()
        index.embed(enc)
        embed_s = time.time() - t1
        index.meta["embed_seconds"] = round(embed_s, 1)
        index.save(idx_dir)
    npages = {}
    for c in index.chunks:
        npages[c.doc_id] = max(npages.get(c.doc_id, 0), c.page)
    rer = Reranker()
    cases = json.load(open(os.path.join(a.eval, "cases.json")))
    gts = {g["case_id"]: g["ground_truth"] for g in json.load(open(os.path.join(a.eval, "ground_truth.json")))}
    llm = LLM(a.llm_url, timeout=900.0)  # long multi-document reports under shared-server load
    prev_path = os.path.join(a.out, "refinery_metrics.json")
    prev = json.load(open(prev_path)) if os.path.exists(prev_path) else {}
    report = {"dataset": {"docs": index.meta["n_docs"], "chunks": index.meta["n_chunks"], "cases": len(cases),
                          "pages_indexed": sum(npages.values()), "doc011_ocr_text": npages.get("DOC-011", 0) > 0,
                          "sources": sources},
              "embedding_model": enc.model_id, "embed_seconds": round(embed_s, 1),
              "configs": prev.get("configs", {}) if a.keep_previous else {}}
    for cfg in a.configs.split(","):
        mode, dim = (cfg.split("@") + ["768"])[:2]
        dim = int(dim)

        def run(case):
            q = case["question"]
            hits = retrieve(index, q, mode, a.k, dim, enc, rer if "rerank" in mode else None, rerank_top=50)
            seen = {h.idx for h in hits}
            hits += [h for h in named_doc_hits(index, q, rer if "rerank" in mode else None) if h.idx not in seen]
            t = time.time()
            res = None
            for _ in range(2):  # infrastructure failures are retried, never scored
                try:
                    res = answer_report(index, q, hits, llm)
                    break
                except LLMUnavailable as exc:
                    res = {"infra_error": str(exc), "claims": [], "dropped_claims": [], "evidence": []}
            res["latency_s"] = round(time.time() - t, 1)
            res["markdown"] = render_report_markdown(res)
            return res

        with ThreadPoolExecutor(10) as ex:
            results = list(ex.map(run, cases))
        infra = [c["case_id"] for c, r in zip(cases, results) if "infra_error" in r]
        rows = [score_case(c, gts[c["case_id"]], r, index, npages) for c, r in zip(cases, results) if "infra_error" not in r]

        def mean(key):
            v = [r[key] for r in rows if r.get(key) is not None]
            return round(sum(v) / len(v), 3) if v else None

        tot_claims = sum(r["claims"] + r["unsupported_claims"] for r in rows)
        summary = {k: mean(k) for k in ("document_retrieval_accuracy", "page_retrieval_accuracy",
                                         "citation_correctness", "citation_grounded", "citation_completeness",
                                         "gt_claim_coverage", "procedure_step_coverage",
                                         "safety_control_coverage", "final_report_factual_accuracy",
                                         "ocr_rule_score")}
        summary["unsupported_claim_rate_pooled"] = round(sum(r["unsupported_claims"] for r in rows) / tot_claims, 3) if tot_claims else None
        summary["all_required_docs_retrieved"] = round(sum(r["all_required_docs_retrieved"] for r in rows) / len(rows), 3)
        summary["excluded_infra_error_cases"] = infra
        report["configs"][cfg] = {"summary": summary, "cases": rows}
        with open(os.path.join(a.out, f"refinery_answers_{cfg.replace('@', '_')}.json"), "w") as fh:
            json.dump(results, fh, indent=1, ensure_ascii=False)
        json.dump(report, open(os.path.join(a.out, "refinery_metrics.json"), "w"), indent=1)
        print(cfg, json.dumps(summary), flush=True)
    report["wall_s"] = round(time.time() - t0, 1)
    json.dump(report, open(os.path.join(a.out, "refinery_metrics.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
