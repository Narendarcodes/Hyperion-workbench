"""Section-aware chunking with exact page/character provenance.

Every chunk is a contiguous slice ``page.text[char_start:char_end]`` of one
page, so a citation (doc id + page + span) always points at real text. A
section is opened by a markdown heading (``#``..``######``), a bold numbered
heading (``**3. Lubrication**``) or an all-caps OCR heading line
(``OBSERVATIONS / LAPSES``). The current heading path is carried forward
across page breaks and prepended to the *indexed* text (not to the span), so
BM25 and the dense encoder see "doc id | title | section" context.

Long sections are split at blank lines, never inside a markdown table run
unless the table alone exceeds ``max_chars``; tiny sections are merged forward.
Standard library only.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, asdict

from .ingest import Document

HEADING_RE = re.compile(
    r"^(?:#{1,6}\s+\S.*"                      # markdown heading
    r"|\*\*\s*\d+(?:\.\d+)*[\.\)]?\s+[^*\n]{2,80}\*\*.*"  # **3. Title**
    r"|[A-Z][A-Z0-9 /&(),\-]{5,70})\s*$",    # OCR all-caps heading
    re.MULTILINE,
)


@dataclass
class Chunk:
    chunk_id: str
    doc_id: str
    title: str
    page: int
    char_start: int
    char_end: int
    section: str
    text: str
    source_path: str

    def index_text(self) -> str:
        """Text fed to BM25 / dense encoder: provenance context + body."""
        return f"{self.doc_id} | {self.title} | {self.section}\n{self.text}"

    def to_dict(self) -> dict:
        return asdict(self)


def _clean_heading(line: str) -> str:
    return re.sub(r"[#*]+", "", line).strip().strip(" :-\u00a0\t").strip() or line.strip()


def _section_spans(text: str) -> list[tuple[int, int, str | None]]:
    """Split page text into (start, end, heading-or-None) spans."""
    starts = [(m.start(), _clean_heading(m.group(0))) for m in HEADING_RE.finditer(text)]
    # drop all-caps "headings" that are really table cells or long shouty lines
    starts = [(s, h) for s, h in starts if not text[s:s + 1] == "|"]
    spans: list[tuple[int, int, str | None]] = []
    if not starts or starts[0][0] > 0:
        spans.append((0, starts[0][0] if starts else len(text), None))
    for i, (s, h) in enumerate(starts):
        e = starts[i + 1][0] if i + 1 < len(starts) else len(text)
        spans.append((s, e, h))
    return [sp for sp in spans if text[sp[0]:sp[1]].strip()]


def _units(text: str, start: int, end: int, max_chars: int) -> list[tuple[int, int]]:
    """Atomic spans: blank-line paragraphs, then lines (table rows), then hard cuts."""
    units: list[tuple[int, int]] = []
    pos = start
    for m in re.finditer(r"\n[ \t]*\n", text[start:end]):
        units.append((pos, start + m.end()))
        pos = start + m.end()
    units.append((pos, end))
    out: list[tuple[int, int]] = []
    for a, b in units:
        if b - a <= max_chars:
            out.append((a, b))
            continue
        lp = a
        for m in re.finditer(r"\n", text[a:b]):
            out.append((lp, a + m.end()))
            lp = a + m.end()
        out.append((lp, b))
    final: list[tuple[int, int]] = []
    for a, b in out:
        while b - a > max_chars:
            final.append((a, a + max_chars))
            a += max_chars
        if b > a:
            final.append((a, b))
    return final


def _split_long(text: str, start: int, end: int, max_chars: int) -> list[tuple[int, int]]:
    """Greedy-pack atomic units into pieces of at most ``max_chars``."""
    if end - start <= max_chars:
        return [(start, end)]
    pieces: list[tuple[int, int]] = []
    cur_a = cur_b = None
    for a, b in _units(text, start, end, max_chars):
        if cur_a is None:
            cur_a, cur_b = a, b
        elif b - cur_a <= max_chars:
            cur_b = b
        else:
            pieces.append((cur_a, cur_b))
            cur_a, cur_b = a, b
    if cur_a is not None:
        pieces.append((cur_a, cur_b))
    return [p for p in pieces if text[p[0]:p[1]].strip()]


def chunk_document(doc: Document, max_chars: int = 1600, min_chars: int = 300) -> list[Chunk]:
    chunks: list[Chunk] = []
    heading = doc.title
    for page in doc.pages:
        text = page.text
        raw: list[tuple[int, int, str]] = []
        for s, e, h in _section_spans(text):
            if h is not None:
                heading = h
            for a, b in _split_long(text, s, e, max_chars):
                raw.append((a, b, heading))
        # merge tiny pieces forward (same page, contiguous)
        merged: list[list] = []
        for a, b, h in raw:
            if merged and (merged[-1][1] - merged[-1][0] < min_chars) and b - merged[-1][0] <= int(max_chars * 1.3):
                merged[-1][1] = b
                continue
            merged.append([a, b, h])
        for a, b, h in merged:
            # trim whitespace but keep exact offsets
            while a < b and text[a].isspace():
                a += 1
            while b > a and text[b - 1].isspace():
                b -= 1
            if b <= a:
                continue
            cid = f"{doc.doc_id}#p{page.page}#c{len(chunks)}"
            chunks.append(Chunk(cid, doc.doc_id, doc.title, page.page, a, b, h, text[a:b], doc.source_path))
    return chunks


def chunk_corpus(docs: list[Document], max_chars: int = 1600, min_chars: int = 300) -> list[Chunk]:
    out: list[Chunk] = []
    for d in docs:
        out.extend(chunk_document(d, max_chars, min_chars))
    return out
