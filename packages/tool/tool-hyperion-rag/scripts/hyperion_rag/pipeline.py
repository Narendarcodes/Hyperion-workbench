"""Hyperion RAG pipeline: index -> retrieve (BM25 / dense / hybrid / +rerank)
-> grounded answer with gpt-oss -> verified citations -> abstention.

Citation contract (consumed by the Chat | PDF citation viewer, PR #11
``citation-target.ts``): every citation carries ``doc_id``, 1-based ``page``,
``char_start``/``char_end`` into that page's text, the verbatim ``quote`` and
``href`` = ``<source_path>#page=<n>``, plus a ready markdown footnote
``[^n]: [DOC](href) p. N, chars a-b: "quote"`` (the viewer parses ``#page=``
and ``p. N``).
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field

from .bm25 import BM25, normalize
from .chunk import Chunk, chunk_corpus
from .ingest import load_corpus

RRF_K = 60
ABSTAIN_TOKEN = "NOT_IN_EVIDENCE"


# --------------------------------------------------------------------------- index
class Index:
    def __init__(self, chunks: list[Chunk], meta: dict | None = None, dense=None):
        self.chunks = chunks
        self.meta = meta or {}
        self.bm25 = BM25([c.index_text() for c in chunks])
        self.dense = dense  # numpy [n, 768] or None
        self._dim_cache: dict = {}

    @classmethod
    def build(cls, paths: list[str], max_chars: int = 1600, min_chars: int = 300) -> "Index":
        docs = load_corpus(paths)
        # JSONL rows: point citations at a per-doc file when one sits beside the JSONL
        for d in docs:
            if d.source_path.endswith(".jsonl"):
                cand = os.path.join(os.path.dirname(d.source_path), "docs", f"{d.doc_id}.md")
                if os.path.exists(cand):
                    d.source_path = cand
        chunks = chunk_corpus(docs, max_chars, min_chars)
        return cls(chunks, {"sources": paths, "n_docs": len(docs), "n_chunks": len(chunks),
                            "max_chars": max_chars, "min_chars": min_chars})

    def embed(self, encoder) -> None:
        from .dense import doc_text

        texts = [doc_text(f"{c.doc_id} {c.title} | {c.section}", c.text) for c in self.chunks]
        self.dense = encoder.encode_docs(texts)
        self.meta["embedding_model"] = encoder.model_id
        if encoder.fallback_reason:
            self.meta["embedding_fallback_reason"] = encoder.fallback_reason

    def save(self, out_dir: str) -> None:
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, "chunks.jsonl"), "w", encoding="utf-8") as fh:
            for c in self.chunks:
                fh.write(json.dumps(c.to_dict(), ensure_ascii=False) + "\n")
        with open(os.path.join(out_dir, "meta.json"), "w", encoding="utf-8") as fh:
            json.dump(self.meta, fh, indent=1)
        if self.dense is not None:
            import numpy as np

            np.save(os.path.join(out_dir, "dense.npy"), self.dense)

    @classmethod
    def load(cls, out_dir: str) -> "Index":
        with open(os.path.join(out_dir, "chunks.jsonl"), encoding="utf-8") as fh:
            chunks = [Chunk(**json.loads(l)) for l in fh if l.strip()]
        with open(os.path.join(out_dir, "meta.json"), encoding="utf-8") as fh:
            meta = json.load(fh)
        dense = None
        p = os.path.join(out_dir, "dense.npy")
        if os.path.exists(p):
            try:
                import numpy as np

                dense = np.load(p)
            except ImportError:
                dense = None
        return cls(chunks, meta, dense)

    def dense_at(self, dim: int):
        from .dense import truncate

        if dim not in self._dim_cache:
            self._dim_cache[dim] = truncate(self.dense, dim)
        return self._dim_cache[dim]


# --------------------------------------------------------------------------- retrieval
@dataclass
class Hit:
    idx: int
    score: float
    sources: dict = field(default_factory=dict)


def rrf(lists: list[list[tuple[int, float]]], k: int = RRF_K) -> list[tuple[int, float]]:
    agg: dict[int, float] = {}
    for lst in lists:
        for rank, (i, _) in enumerate(lst):
            agg[i] = agg.get(i, 0.0) + 1.0 / (k + rank + 1)
    return sorted(agg.items(), key=lambda x: -x[1])


def retrieve(index: Index, query: str, mode: str = "hybrid_rerank", k: int = 5, dim: int = 768,
             encoder=None, reranker=None, q_vec=None, pool: int = 100, rerank_top: int = 30) -> list[Hit]:
    """Return the top-k hits. ``mode``: bm25 | dense | hybrid | hybrid_rerank | bm25_rerank."""
    lists: list[list[tuple[int, float]]] = []
    bm = dn = None
    if mode in ("bm25", "hybrid", "hybrid_rerank", "bm25_rerank"):
        bm = index.bm25.search(query, pool)
        lists.append(bm)
    if mode in ("dense", "hybrid", "hybrid_rerank"):
        if index.dense is None:
            raise RuntimeError("index has no dense vectors; build with --embed or use mode=bm25")
        from .dense import search, truncate

        if q_vec is None:
            q_vec = encoder.encode_queries([query])
        qv = truncate(q_vec.reshape(1, -1), dim)[0]
        dn = search(index.dense_at(dim), qv, pool)
        lists.append(dn)
    fused = lists[0] if len(lists) == 1 else rrf(lists)
    if mode.endswith("_rerank"):
        cand = [i for i, _ in fused[:rerank_top]]
        scores = reranker.score(query, [index.chunks[i].index_text() for i in cand])
        ranked = sorted(zip(cand, scores), key=lambda x: -x[1])
        return [Hit(i, s, {"rerank": s}) for i, s in ranked[:k]]
    return [Hit(i, s) for i, s in fused[:k]]


# --------------------------------------------------------------------------- span location
def _norm_map(text: str) -> tuple[str, list[int]]:
    """Normalise for fuzzy quote matching, keeping a map back to original offsets."""
    out, idx = [], []
    prev_space = True
    folded = normalize(text)
    for i, ch in enumerate(folded):
        if ch in "*`_|":
            continue
        if ch.isspace():
            if prev_space:
                continue
            out.append(" ")
            idx.append(i)
            prev_space = True
            continue
        out.append(ch)
        idx.append(i)
        prev_space = False
    return "".join(out), idx


def locate(haystack: str, quote: str) -> tuple[int, int] | None:
    """Exact span of ``quote`` in ``haystack`` (tolerant to markdown, hyphen and space variants)."""
    if not quote or not quote.strip():
        return None
    pos = haystack.find(quote)
    if pos >= 0:
        return pos, pos + len(quote)
    hn, hmap = _norm_map(haystack)
    qn, _ = _norm_map(quote)
    qn = qn.strip()
    if len(qn) < 4:
        return None
    p = hn.find(qn)
    if p < 0:
        return None
    return hmap[p], hmap[p + len(qn) - 1] + 1


# --------------------------------------------------------------------------- generation
SYSTEM_PROMPT = (
    "You are Hyperion, an industrial document assistant. Answer ONLY from the evidence blocks. "
    "Every fact must be supported by a verbatim quote from a cited block. If the evidence does not "
    f"contain the answer, set \"abstain\": true and answer \"{ABSTAIN_TOKEN}\". Never use outside knowledge, "
    "never guess part numbers, values, dates or names."
)

USER_TEMPLATE = """Question: {question}

Evidence:
{evidence}

Reply with ONE JSON object and nothing else:
{{"answer": "<concise answer, or {abstain}>", "abstain": <true|false>,
  "citations": [{{"block": "E<n>", "quote": "<short verbatim substring of that block that supports the answer>"}}]}}"""


def evidence_block(n: int, c: Chunk) -> str:
    return f"[E{n}] doc={c.doc_id} page={c.page} section={c.section}\n{c.text}"


class LLM:
    def __init__(self, base_url: str | None = None, model: str = "llm", reasoning_effort: str = "low",
                 timeout: float = 180.0, max_tokens: int = 2048):
        self.base_url = (base_url or os.environ.get("HYPERION_LLM_URL", "http://127.0.0.1:8001/v1")).rstrip("/")
        self.model, self.effort, self.timeout, self.max_tokens = model, reasoning_effort, timeout, max_tokens

    def chat(self, messages: list[dict], max_tokens: int | None = None, retries: int = 3) -> str:
        """POST a chat completion. Connection errors / 5xx (server restarting) are retried with
        exponential backoff for up to ``HYPERION_LLM_MAX_WAIT_S`` (default 900 s) and then raise
        ``LLMUnavailable`` so callers can tell infrastructure failures from answers."""
        body = {"model": self.model, "messages": messages, "temperature": 0,
                "max_tokens": max_tokens or self.max_tokens, "reasoning_effort": self.effort}
        data = json.dumps(body).encode()
        max_wait = float(os.environ.get("HYPERION_LLM_MAX_WAIT_S", "900"))
        start, delay, last, bad_reply = time.time(), 2.0, None, 0
        while True:
            try:
                req = urllib.request.Request(self.base_url + "/chat/completions", data=data,
                                             headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=self.timeout) as r:
                    out = json.loads(r.read())
                return out["choices"][0]["message"].get("content") or ""
            except urllib.error.HTTPError as exc:
                last = exc
                if exc.code < 500 and exc.code != 429:
                    bad_reply += 1
                    if bad_reply >= retries:
                        raise LLMUnavailable(f"LLM rejected request: {exc}") from exc
            except Exception as exc:  # connection refused / reset / timeout while restarting
                last = exc
            if time.time() - start > max_wait:
                raise LLMUnavailable(f"LLM unavailable for {max_wait:.0f}s: {last}")
            time.sleep(delay)
            delay = min(delay * 2, 30.0)


class LLMUnavailable(RuntimeError):
    """The LLM endpoint could not be reached (infrastructure, not an eval outcome)."""


def parse_json_obj(text: str) -> dict | None:
    text = text.strip()
    text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.MULTILINE).strip()
    try:
        v = json.loads(text)
        return v if isinstance(v, dict) else None
    except Exception:
        pass
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            v = json.loads(m.group(0))
            return v if isinstance(v, dict) else None
        except Exception:
            return None
    return None


def build_citations(index: Index, hits: list[Hit], raw_cites: list) -> list[dict]:
    cites: list[dict] = []
    for rc in raw_cites or []:
        if not isinstance(rc, dict):
            continue
        m = re.search(r"(\d+)", str(rc.get("block", "")))
        if not m:
            continue
        n = int(m.group(1))
        if not 1 <= n <= len(hits):
            continue
        c = index.chunks[hits[n - 1].idx]
        quote = str(rc.get("quote", "")).strip()
        span = locate(c.text, quote)
        verified = span is not None
        a, b = (c.char_start + span[0], c.char_start + span[1]) if span else (c.char_start, c.char_end)
        href = f"{c.source_path}#page={c.page}"
        shown = c.text[span[0]:span[1]] if span else quote
        cites.append({
            "doc_id": c.doc_id, "page": c.page, "char_start": a, "char_end": b,
            "chunk_id": c.chunk_id, "quote": shown, "quote_verified": verified, "href": href,
        })
    # de-duplicate identical spans, then number footnotes
    seen, out = set(), []
    for ct in cites:
        key = (ct["doc_id"], ct["page"], ct["char_start"], ct["char_end"])
        if key in seen:
            continue
        seen.add(key)
        n = len(out) + 1
        q = ct["quote"].replace("\n", " ").replace('"', "'")
        if len(q) > 220:
            q = q[:217] + "..."
        ct["footnote"] = (f"[^{n}]: [{ct['doc_id']}]({ct['href']}) p. {ct['page']}, "
                          f"chars {ct['char_start']}-{ct['char_end']}: \"{q}\"")
        out.append(ct)
    return out


def expand_neighbors(index: Index, hits: list[Hit], window: int = 1, max_chunks: int = 8) -> list[Hit]:
    """Small-to-big context: add each hit's adjacent chunks from the same document.

    Procedure questions ("what is done after step 12?") usually straddle a
    chunk boundary; neighbours restore the sequence. Evidence is then ordered
    by document and position so the model reads steps in order.
    """
    chosen: dict[int, Hit] = {}
    for h in hits:
        for j in range(h.idx - window, h.idx + window + 1):
            if len(chosen) >= max_chunks:
                break
            if 0 <= j < len(index.chunks) and index.chunks[j].doc_id == index.chunks[h.idx].doc_id and j not in chosen:
                chosen[j] = h if j == h.idx else Hit(j, 0.0, {"neighbor_of": h.idx})
    first_rank = {}
    for r, h in enumerate(hits):
        first_rank.setdefault(index.chunks[h.idx].doc_id, r)
    return sorted(chosen.values(), key=lambda h: (first_rank.get(index.chunks[h.idx].doc_id, 99), h.idx))


def answer(index: Index, question: str, hits: list[Hit], llm: LLM, gate: float | None = None,
           require_verified: bool = True, expand: int = 1, max_chunks: int = 8) -> dict:
    """Grounded answer with verified citations. Abstains when evidence is missing.

    Abstention layers: (1) no hits; (2) rerank top score below ``gate``;
    (3) the model abstains; (4) ``require_verified`` and no cited quote
    could be located in the evidence (unsupported answer is withheld).
    """
    result = {"question": question, "abstain": False, "abstain_reason": None, "answer": None,
              "raw_answer": None, "citations": [], "evidence": [index.chunks[h.idx].chunk_id for h in hits]}
    if not hits:
        result.update(abstain=True, abstain_reason="no_evidence", answer=ABSTAIN_TOKEN)
        return result
    top = hits[0].sources.get("rerank")
    if gate is not None and top is not None and top < gate:
        result.update(abstain=True, abstain_reason=f"retrieval_gate<{gate}", answer=ABSTAIN_TOKEN)
        return result
    if expand:
        hits = expand_neighbors(index, hits, expand, max_chunks)
        result["evidence"] = [index.chunks[h.idx].chunk_id for h in hits]
    ev = "\n\n".join(evidence_block(i + 1, index.chunks[h.idx]) for i, h in enumerate(hits))
    raw = llm.chat([{"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": USER_TEMPLATE.format(question=question, evidence=ev,
                                                                   abstain=ABSTAIN_TOKEN)}])
    obj = parse_json_obj(raw) or {"answer": raw.strip(), "abstain": ABSTAIN_TOKEN in raw, "citations": []}
    ans = str(obj.get("answer", "")).strip()
    model_abstain = bool(obj.get("abstain")) or ans.upper().startswith(ABSTAIN_TOKEN) or not ans
    cites = [] if model_abstain else build_citations(index, hits, obj.get("citations", []))
    result["raw_answer"] = ans
    result["model_abstain"] = model_abstain
    if model_abstain:
        result.update(abstain=True, abstain_reason="model", answer=ABSTAIN_TOKEN)
        return result
    verified = [c for c in cites if c["quote_verified"]]
    if require_verified and not verified:
        result.update(abstain=True, abstain_reason="no_verified_citation", answer=ABSTAIN_TOKEN, citations=cites)
        return result
    result.update(answer=ans, citations=cites)
    return result


def render_markdown(res: dict) -> str:
    if res["abstain"]:
        return ("The indexed documents do not contain enough evidence to answer this "
                f"({res['abstain_reason']}).")
    marks = "".join(f"[^{i + 1}]" for i in range(len(res["citations"])))
    feet = "\n".join(c["footnote"] for c in res["citations"])
    return f"{res['answer']} {marks}\n\n{feet}".strip()


# --------------------------------------------------------------------------- multi-document reports
REPORT_SYSTEM = (
    "You are Hyperion, an industrial safety/engineering analyst working in a CLOSED WORLD: the evidence "
    "blocks are the only corpus. Write the answer as a list of atomic claims. Every claim must cite at "
    "least one block with a short verbatim quote copied exactly from that block. Do not state anything the "
    "blocks do not support; put gaps (missing documents, unreadable/unscanned pages, standards that are "
    "only referenced) under \"uncertainties\" instead of guessing. Never invent numbers, tags, clauses or "
    "table values. If nothing in the evidence answers the question, set \"abstain\": true."
)

REPORT_TEMPLATE = """Task: {question}

Evidence:
{evidence}

Reply with ONE JSON object and nothing else:
{{"abstain": <true|false>,
  "claims": [{{"text": "<one factual statement>", "citations": [{{"block": "E<n>", "quote": "<verbatim substring of that block>"}}]}}],
  "uncertainties": ["<what the evidence does not establish>"]}}"""

DOC_MENTION = re.compile(r"\b([A-Z]{2,5}-\d{3}(?:-\d{3})?)\b")


def named_doc_hits(index: Index, question: str, reranker, per_doc: int = 2, pool: int = 40) -> list[Hit]:
    """Chunks from documents the question names explicitly (e.g. "DOC-004"), best per_doc each."""
    ids = {c.doc_id for c in index.chunks}
    named = [d for d in dict.fromkeys(DOC_MENTION.findall(question)) if d in ids]
    out: list[Hit] = []
    for d in named:
        cand = [i for i, _ in index.bm25.search(question, 5000) if index.chunks[i].doc_id == d][:pool]
        if not cand:
            cand = [i for i, c in enumerate(index.chunks) if c.doc_id == d][:pool]
        if reranker is not None and cand:
            sc = reranker.score(question, [index.chunks[i].index_text() for i in cand])
            ranked = sorted(zip(cand, sc), key=lambda x: -x[1])
        else:
            ranked = [(i, 0.0) for i in cand]
        out.extend(Hit(i, s, {"rerank": s, "named_doc": d}) for i, s in ranked[:per_doc])
    return out


def answer_report(index: Index, question: str, hits: list[Hit], llm: LLM, expand: int = 1,
                  max_chunks: int = 16) -> dict:
    """Claim-level, fully cited multi-document answer. Unsupported claims are dropped and counted."""
    res = {"question": question, "abstain": False, "claims": [], "dropped_claims": [], "uncertainties": []}
    if not hits:
        res.update(abstain=True, abstain_reason="no_evidence")
        return res
    if expand:
        hits = expand_neighbors(index, hits, expand, max_chunks)
    res["evidence"] = [index.chunks[h.idx].chunk_id for h in hits]
    ev = "\n\n".join(evidence_block(i + 1, index.chunks[h.idx]) for i, h in enumerate(hits))
    raw = llm.chat([{"role": "system", "content": REPORT_SYSTEM},
                    {"role": "user", "content": REPORT_TEMPLATE.format(question=question, evidence=ev)}],
                   max_tokens=6000)
    obj = parse_json_obj(raw)
    if obj is None:
        res.update(abstain=True, abstain_reason="unparseable_model_output", raw=raw[:2000])
        return res
    res["uncertainties"] = [str(u) for u in obj.get("uncertainties", []) if str(u).strip()]
    for cl in obj.get("claims", []) or []:
        if not isinstance(cl, dict) or not str(cl.get("text", "")).strip():
            continue
        cites = build_citations(index, hits, cl.get("citations", []))
        entry = {"text": str(cl["text"]).strip(), "citations": cites,
                 "supported": any(c["quote_verified"] for c in cites)}
        (res["claims"] if entry["supported"] else res["dropped_claims"]).append(entry)
    if bool(obj.get("abstain")) and not res["claims"]:
        res.update(abstain=True, abstain_reason="model")
    elif not res["claims"]:
        res.update(abstain=True, abstain_reason="no_verified_citation")
    return res


def render_report_markdown(res: dict) -> str:
    lines, feet, n = [], [], 0
    if res.get("abstain") and not res.get("claims"):
        lines.append(f"The indexed documents do not support an answer ({res.get('abstain_reason')}).")
    for cl in res.get("claims", []):
        marks = ""
        for c in cl["citations"]:
            if not c["quote_verified"]:
                continue
            n += 1
            marks += f"[^{n}]"
            feet.append(re.sub(r"^\[\^\d+\]", f"[^{n}]", c["footnote"]))
        lines.append(f"- {cl['text']} {marks}".rstrip())
    if res.get("uncertainties"):
        lines.append("\n**Not established by the corpus:**")
        lines.extend(f"- {u}" for u in res["uncertainties"])
    return "\n".join(lines + ([""] + feet if feet else []))
