"""Okapi BM25 over chunk index text. Standard library only.

The tokenizer is tuned for industrial documents: Unicode hyphens/no-break
spaces are folded, and tag-like compounds (``MTR-LT-02-A01``, ``GR-A7-001``,
``OISD-STD-105``) are indexed both whole and as their parts, so an exact tag
query matches strongly without breaking prose matching.
"""

from __future__ import annotations

import math
import re
from collections import Counter

_FOLD = str.maketrans({
    "\u2010": "-", "\u2011": "-", "\u2012": "-", "\u2013": "-", "\u2014": "-", "\u2212": "-",
    "\u00a0": " ", "\u202f": " ", "\u2009": " ", "\u2007": " ",
})
_TOKEN = re.compile(r"[a-z0-9]+(?:[-./][a-z0-9]+)*")
_STOP = frozenset(
    "a an the of to in on for and or is are was were be by with at as from that this what which "
    "who whom when where how why does did do it its into per than then there their document doc "
    "according".split()
)


def normalize(text: str) -> str:
    return text.translate(_FOLD).lower()


def stem(tok: str) -> str:
    """Tiny suffix stripper for alphabetic words (permitting -> permit, valves -> valve)."""
    if not tok.isalpha() or len(tok) <= 4:
        return tok
    for suf in ("ing", "ed", "es", "s"):
        if suf == "es" and not tok.endswith(("ses", "xes", "ches", "shes")):
            continue
        if suf == "s" and tok.endswith("ss"):
            continue
        if tok.endswith(suf) and len(tok) - len(suf) >= 4:
            tok = tok[: -len(suf)]
            if suf == "ing" and len(tok) > 4 and tok[-1] == tok[-2]:
                tok = tok[:-1]
            return tok
    return tok


def tokenize(text: str) -> list[str]:
    out: list[str] = []
    for m in _TOKEN.finditer(normalize(text)):
        tok = m.group(0)
        if re.search(r"[-./]", tok):
            out.append(tok)
            out.extend(stem(p) for p in re.split(r"[-./]", tok) if p and p not in _STOP)
        elif tok not in _STOP:
            out.append(stem(tok))
    return out


class BM25:
    def __init__(self, docs: list[str], k1: float = 1.2, b: float = 0.75):
        self.k1, self.b = k1, b
        self.tfs: list[Counter] = []
        self.lens: list[int] = []
        self.df: Counter = Counter()
        self.postings: dict[str, list[int]] = {}
        self.idf: dict[str, float] = {}
        self.avg = 0.0
        self.add(docs)

    def add(self, docs: list[str]) -> None:
        """Append documents in place: only the new docs are tokenised; IDF and
        the average length are refreshed (identical to a full build)."""
        base = len(self.tfs)
        for j, d in enumerate(docs):
            tf = Counter(tokenize(d))
            self.tfs.append(tf)
            self.lens.append(sum(tf.values()))
            self.df.update(tf.keys())
            for t in tf:
                self.postings.setdefault(t, []).append(base + j)
        n = len(self.tfs)
        self.avg = (sum(self.lens) / n) if n else 0.0
        self.idf = {t: math.log(1 + (n - c + 0.5) / (c + 0.5)) for t, c in self.df.items()}

    def scores(self, query: str) -> dict[int, float]:
        q = Counter(tokenize(query))
        out: dict[int, float] = {}
        for t in q:
            idf = self.idf.get(t)
            if idf is None:
                continue
            for i in self.postings[t]:
                f = self.tfs[i][t]
                denom = f + self.k1 * (1 - self.b + self.b * self.lens[i] / (self.avg or 1))
                out[i] = out.get(i, 0.0) + idf * f * (self.k1 + 1) / denom
        return out

    def search(self, query: str, k: int = 50) -> list[tuple[int, float]]:
        s = self.scores(query)
        return sorted(s.items(), key=lambda x: -x[1])[:k]
