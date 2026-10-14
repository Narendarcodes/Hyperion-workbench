#!/usr/bin/env python3
"""Render markdown tables from benchmark outputs.

  make_tables.py --synthetic metrics.json [--refinery refinery_metrics.json] [--pid pid_probe.json]
"""

import argparse
import json


def pct(v):
    return "–" if v is None else f"{100 * v:.1f}%"


def synthetic(m: dict) -> str:
    out = []
    d = m["dataset"]
    out.append(f"Dataset: {d['docs']} docs → {d['chunks']} chunks; {d['answerable']} answerable + "
               f"{d['unanswerable']} unanswerable questions. Embedder `{m['embedding_model']}`"
               f"{' (fallback: ' + m['embedding_fallback_reason'] + ')' if m.get('embedding_fallback_reason') else ''}, "
               f"reranker `{m['reranker']}`, corpus embed {m['embed_seconds']} s, peak VRAM {m.get('peak_vram_gb')} GB.\n")
    for variant, title in (("orig", "Original questions (name their doc id)"),
                           ("deid", "De-identified questions (doc ids removed)")):
        r = m["retrieval"][variant]
        out.append(f"**Retrieval — {title}, n={next(iter(r.values()))['n']}**\n")
        out.append("| config | doc hit@1 | hit@3 | hit@5 | hit@10 | MRR@10 | evidence chunk hit@5 |")
        out.append("|---|---|---|---|---|---|---|")
        for cfg in ("bm25", "dense@768", "dense@256", "hybrid@768", "hybrid@256", "hybrid_rerank@768", "hybrid_rerank@256"):
            if cfg in r:
                x = r[cfg]
                out.append(f"| {cfg} | {pct(x['doc_hit@1'])} | {pct(x['doc_hit@3'])} | {pct(x['doc_hit@5'])} | "
                           f"{pct(x['doc_hit@10'])} | {x['mrr@10']:.3f} | {pct(x['evidence_chunk_hit@5'])} |")
        out.append("")
    g = m.get("generation", {})
    if g:
        out.append("**Answers (gpt-oss-120b, judge gpt-oss-120b in batches of 10, partial = 0.5; abstaining on an answerable question = 0)**\n")
        out.append("| config | accuracy | lookup | reasoning | acc. before citation gate | abstention P | abstention R | false abstain (answerable) | cited doc correct | cite in gold-evidence chunk | all quotes verified | p50 latency | excluded infra errors |")
        out.append("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
        for cfg, x in g.items():
            out.append(f"| {cfg} | {pct(x['accuracy'])} | {pct(x['accuracy_lookup'])} | {pct(x['accuracy_reasoning'])} | "
                       f"{pct(x['accuracy_before_citation_gate'])} | {pct(x['abstention_precision'])} | "
                       f"{pct(x['abstention_recall'])} | {pct(x['false_abstain_rate_answerable'])} | "
                       f"{pct(x.get('citation_doc_correct'))} | {pct(x.get('citation_in_gold_evidence_chunk'))} | "
                       f"{pct(x.get('citation_all_quotes_verified'))} | {x['latency_p50_s']} s | {x.get('excluded_infra_errors', 0)} |")
        out.append("")
    gs = m.get("gate_sweep", {})
    for cfg, rows in gs.items():
        out.append(f"**Retrieval-gate sweep (post hoc, {cfg}; abstain if top rerank score < gate)**\n")
        out.append("| gate | accuracy | abstention P | abstention R |")
        out.append("|---|---|---|---|")
        for r in rows:
            out.append(f"| {r['gate']} | {pct(r['accuracy'])} | {pct(r['abstention_precision'])} | {pct(r['abstention_recall'])} |")
        out.append("")
        break
    return "\n".join(out)


def refinery(m: dict) -> str:
    d = m["dataset"]
    out = [f"Corpus: {d['docs']} docs indexed ({d['pages_indexed']} pages with text, {d['chunks']} chunks); "
           f"{d['cases']} cases; DOC-011 OCR text present: {d['doc011_ocr_text']}.\n"]
    keys = ["document_retrieval_accuracy", "all_required_docs_retrieved", "page_retrieval_accuracy",
            "citation_correctness", "citation_grounded", "citation_completeness", "unsupported_claim_rate_pooled",
            "procedure_step_coverage", "safety_control_coverage", "final_report_factual_accuracy",
            "gt_claim_coverage", "ocr_rule_score"]
    cfgs = list(m["configs"])
    out.append("| metric | " + " | ".join(cfgs) + " |")
    out.append("|---|" + "---|" * len(cfgs))
    for k in keys:
        out.append(f"| {k} | " + " | ".join(pct(m["configs"][c]["summary"].get(k)) for c in cfgs) + " |")
    out.append("")
    best = cfgs[-2] if "hybrid_rerank@768" not in cfgs else "hybrid_rerank@768"
    out.append(f"**Per case ({best})**\n")
    out.append("| case | difficulty | docs retrieved | claims kept / dropped | citation correct | completeness | case metric |")
    out.append("|---|---|---|---|---|---|---|")
    for r in m["configs"][best]["cases"]:
        extra = []
        for k in ("procedure_step_coverage", "safety_control_coverage", "final_report_factual_accuracy", "ocr_rule_score"):
            if r.get(k) is not None:
                extra.append(f"{k.split('_')[0]} {pct(r[k])}")
        out.append(f"| {r['case_id']} | {r['difficulty']} | {pct(r['document_retrieval_accuracy'])} | "
                   f"{r['claims']} / {r['unsupported_claims']} | {pct(r.get('citation_correctness'))} | "
                   f"{pct(r.get('citation_completeness'))} | {', '.join(extra) or '–'} |")
    return "\n".join(out)


def pid(m: dict) -> str:
    out = [f"{m['n']} pages (DOC-012 pdf pp {m['pages'][0]}–{m['pages'][-1]}), model `{m['model']}` multimodal "
           f"(load {m['multimodal_load_s']} s, embed {m['embed_s']} s, peak VRAM {m.get('peak_vram_gb')} GB).\n",
           "| page representation | hit@1 | hit@5 | MRR |", "|---|---|---|---|"]
    for k, v in m["results"].items():
        out.append(f"| {k} | {pct(v['hit@1'])} | {pct(v['hit@5'])} | {v['mrr']:.3f} |")
    return "\n".join(out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--synthetic")
    ap.add_argument("--refinery")
    ap.add_argument("--pid")
    a = ap.parse_args()
    if a.synthetic:
        print(synthetic(json.load(open(a.synthetic))))
    if a.refinery:
        print(refinery(json.load(open(a.refinery))))
    if a.pid:
        print(pid(json.load(open(a.pid))))
