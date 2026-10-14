"""Corpus ingest: normalise every supported source into ``Document`` records.

Supported sources (auto-detected per path):

1. JSONL file, one object per line with ``doc_id`` and ``text`` (optional
   ``title``/``type``/``plant``/``equipment``). This is the
   ``hyperion_eval/documents.jsonl`` shape.
2. A directory of ``*.md`` / ``*.txt`` files (``doc_id`` = file stem).
3. A directory of ``*.json`` files with ``{"doc_id"?, "pages": [{"page", "text"}]}``
   (the ``refinery-corpus/corpus/processed/DOC-*.json`` shape and the
   OCR stream's ``corpus_text`` contract, see README).
4. A directory of per-document sub-directories holding ``page_0001.txt`` ...
   (one file per page).

Page boundaries inside one text blob are taken from a form feed (``\\f``) or
an explicit ``<!-- page N -->`` marker. Sources without any page signal are a
single page 1; the citation then carries page 1 plus an exact character span.
Standard library only.
"""

from __future__ import annotations

import json
import os
import re
from html.parser import HTMLParser
from dataclasses import dataclass, field
from typing import Iterable

# "<!-- page N -->" or an OCR hand-off line "--- page N ---"
PAGE_MARKER = re.compile(r"<!--\s*page\s+(\d+)\s*-->|^-{3}\s*page\s+(\d+)\s*-{3}[ \t]*$", re.IGNORECASE | re.MULTILINE)


@dataclass
class Page:
    page: int
    text: str


@dataclass
class Document:
    doc_id: str
    title: str
    pages: list[Page]
    source_path: str
    meta: dict = field(default_factory=dict)


def split_pages(text: str) -> list[Page]:
    """Split one text blob into pages using \\f or ``<!-- page N -->`` markers."""
    if PAGE_MARKER.search(text):
        pages: list[Page] = []
        marks = list(PAGE_MARKER.finditer(text))
        head = text[: marks[0].start()]
        head_is_meta = not re.sub(r"<!--.*?-->", "", head, flags=re.DOTALL).strip()
        first = int(marks[0].group(1) or marks[0].group(2))
        if head.strip() and not head_is_meta and first > 1:
            pages.append(Page(1, head))
        for i, m in enumerate(marks):
            end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
            body = text[m.end():end]
            if i == 0 and head.strip() and not head_is_meta and first == 1:
                body = head + body  # stray text before an explicit page 1 belongs to page 1
            pages.append(Page(int(m.group(1) or m.group(2)), body))
        return pages
    if "\f" in text:
        return [Page(i + 1, t) for i, t in enumerate(text.split("\f"))]
    return [Page(1, text)]


_TITLE_RE = re.compile(r"^\s*(?:\*\*Type:\*\*|#\s+|Title:)\s*(.+?)\s*$", re.MULTILINE)


def guess_title(doc_id: str, text: str, meta: dict) -> str:
    parts = [p for p in (meta.get("type"), meta.get("equipment"), meta.get("plant")) if p]
    if parts:
        return " | ".join(str(p) for p in parts)
    m = _TITLE_RE.search(text[:2000])
    return m.group(1).strip("* ") if m else doc_id


def _from_jsonl(path: str) -> Iterable[Document]:
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            doc_id = str(row["doc_id"])
            text = row.get("text", "")
            meta = {k: v for k, v in row.items() if k not in ("text",)}
            pages = row.get("pages")
            page_list = ([Page(int(p["page"]), p["text"]) for p in pages]
                         if isinstance(pages, list) else split_pages(text))
            yield Document(doc_id, row.get("title") or guess_title(doc_id, text, meta),
                           page_list, path, meta)


def _from_json_file(path: str) -> Document | None:
    with open(path, encoding="utf-8") as fh:
        row = json.load(fh)
    if not isinstance(row, dict):
        return None
    plist = row.get("pages") if isinstance(row.get("pages"), list) else row.get("page_text")
    if not isinstance(plist, list):
        return None
    doc_id = str(row.get("doc_id") or row.get("document_id") or row.get("doc") or row.get("id")
                 or os.path.splitext(os.path.basename(path))[0])
    pages = [Page(int(p.get("page", p.get("number", i + 1))), str(p.get("text", ""))) for i, p in enumerate(plist)]
    pages = [p for p in pages if p.text.strip()]  # empty pages (unscanned / OCR pending) carry no evidence
    if not pages:
        return None
    meta = {k: v for k, v in row.items() if k not in ("pages", "page_text") and isinstance(v, (str, int, float))}
    text0 = pages[0].text if pages else ""
    return Document(doc_id, str(row.get("title") or guess_title(doc_id, text0, meta)), pages, path, meta)


def _from_dir(path: str) -> Iterable[Document]:
    for name in sorted(os.listdir(path)):
        full = os.path.join(path, name)
        stem, ext = os.path.splitext(name)
        if os.path.isdir(full):
            page_files = sorted(f for f in os.listdir(full) if re.match(r"page[_-]?\d+\.(txt|md)$", f))
            if page_files:
                pages = []
                for f in page_files:
                    num = int(re.search(r"(\d+)", f).group(1))
                    with open(os.path.join(full, f), encoding="utf-8") as fh:
                        pages.append(Page(num, fh.read()))
                yield Document(name, guess_title(name, pages[0].text, {}), pages, full, {})
            continue
        if ext.lower() in (".md", ".txt"):
            with open(full, encoding="utf-8") as fh:
                text = fh.read()
            yield Document(stem, guess_title(stem, text, {}), split_pages(text), full, {})
        elif ext.lower() == ".json":
            doc = _from_json_file(full)
            if doc is not None:
                yield doc
        elif ext.lower() == ".jsonl":
            yield from _from_jsonl(full)
        elif ext.lower() in (".html", ".htm"):
            yield _from_html(full)


class _HTMLText(HTMLParser):
    _BLOCK = {"p", "div", "br", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "section", "table", "pre"}

    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.skip = 0
        self.title = ""
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "nav", "header", "footer"):
            self.skip += 1
        if tag == "title":
            self._in_title = True
        if tag in self._BLOCK:
            self.parts.append("\n")
        if tag in ("h1", "h2", "h3", "h4"):
            self.parts.append("## ")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "nav", "header", "footer") and self.skip:
            self.skip -= 1
        if tag == "title":
            self._in_title = False
        if tag in self._BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if not self.skip:
            self.parts.append(data)


def _from_html(path: str) -> Document:
    """HTML capture (e.g. a regulations page) -> one page of visible text."""
    with open(path, encoding="utf-8", errors="replace") as fh:
        raw = fh.read()
    p = _HTMLText()
    p.feed(raw)
    text = re.sub(r"[ \t\r\f\v]+", " ", "".join(p.parts))
    text = re.sub(r"\n\s*\n+", "\n\n", text).strip()
    stem = os.path.splitext(os.path.basename(path))[0]
    return Document(stem, p.title.strip() or stem, [Page(1, text)], path, {"format": "html"})


def load_corpus(paths: Iterable[str]) -> list[Document]:
    """Load every document from the given files/directories; duplicate ids keep the first."""
    seen: dict[str, Document] = {}
    for p in paths:
        if os.path.isdir(p):
            it = _from_dir(p)
        elif p.endswith(".jsonl"):
            it = _from_jsonl(p)
        elif p.endswith(".json"):
            d = _from_json_file(p)
            it = [d] if d else []
        elif p.endswith((".html", ".htm")):
            it = [_from_html(p)]
        else:
            with open(p, encoding="utf-8") as fh:
                text = fh.read()
            stem = os.path.splitext(os.path.basename(p))[0]
            it = [Document(stem, guess_title(stem, text, {}), split_pages(text), p, {})]
        for d in it:
            seen.setdefault(d.doc_id, d)
    return list(seen.values())
