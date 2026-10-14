"""Build the bundled MRPL seed document store from the public refinery corpus.

Usage:
    python build_mrpl_seed.py --corpus /path/to/refinery-corpus [--catalog catalog.json]

Reads the raw public documents under ``<corpus>/corpus/raw`` and writes, under
``../mrpl-seed`` (same layout as the refinery corpus, so the host route can read
either directory):

    manifest/documents.json        catalog envelope (provenance, sha256, sizes)
    corpus/processed/<DOC>.json    page-preserving text {document_id, title, pages, page_text}

Catalog metadata (titles, organizations, dates, source URLs, unit/area labels)
comes from ``--catalog`` (defaults to the committed manifest so a re-run only
refreshes hashes and text). Everything is PUBLIC SAMPLE DATA: OISD/CSB/OSHA/OSTI
government releases, MRPL/IOCL public spec sheets and a CC-BY-4.0 training text.
None of it is an MRPL plant record.

Requires: pymupdf.
"""
import argparse
import datetime
import hashlib
import html.parser
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SEED = os.path.normpath(os.path.join(HERE, "..", "mrpl-seed"))

# DOC-012 is a 3311-page OER book; the corpus scope is Chapter 7 (pdf pp. 558-590).
PAGE_RANGES = {"DOC-012": (558, 590)}
# HTML captures are split into fixed-size sections (no page numbers exist).
SECTION_CHARS = 6000


class _TextOnly(html.parser.HTMLParser):
    SKIP = {"script", "style", "nav", "header", "footer", "noscript"}

    def __init__(self):
        super().__init__()
        self.depth = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.depth += 1
        elif tag in ("p", "div", "br", "li", "h1", "h2", "h3", "h4", "tr"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.depth > 0:
            self.depth -= 1

    def handle_data(self, data):
        if self.depth == 0:
            self.parts.append(data)


def html_sections(path):
    parser = _TextOnly()
    parser.feed(open(path, encoding="utf-8", errors="replace").read())
    text = re.sub(r"[ \t\r\f\v]+", " ", "".join(parser.parts))
    text = re.sub(r"\n\s*\n+", "\n\n", text).strip()
    paragraphs = text.split("\n\n")
    sections, current = [], ""
    for para in paragraphs:
        if len(current) + len(para) > SECTION_CHARS and current:
            sections.append(current.strip())
            current = ""
        current += para + "\n\n"
    if current.strip():
        sections.append(current.strip())
    return [{"page": i + 1, "text": s} for i, s in enumerate(sections)]


def pdf_pages(path, doc_id):
    import pymupdf  # noqa: PLC0415 - optional heavy dependency

    doc = pymupdf.open(path)
    lo, hi = PAGE_RANGES.get(doc_id, (1, len(doc)))
    pages = [{"page": n, "text": doc[n - 1].get_text()} for n in range(lo, hi + 1)]
    return len(doc), pages


def sha256_of(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus", required=True)
    parser.add_argument("--catalog", default=os.path.join(SEED, "manifest", "documents.json"))
    args = parser.parse_args()

    catalog = json.load(open(args.catalog, encoding="utf-8"))
    entries = catalog["documents"] if isinstance(catalog, dict) else catalog
    processed_dir = os.path.join(SEED, "corpus", "processed")
    os.makedirs(processed_dir, exist_ok=True)
    os.makedirs(os.path.join(SEED, "manifest"), exist_ok=True)

    out = []
    for entry in entries:
        doc_id = entry["document_id"]
        raw = os.path.join(args.corpus, "corpus", "raw", entry["file_name"])
        if not os.path.exists(raw):
            raise SystemExit("missing raw file for %s: %s" % (doc_id, raw))
        record = dict(entry)
        record["size_bytes"] = os.path.getsize(raw)
        record["sha256"] = sha256_of(raw)
        if raw.endswith(".html"):
            pages = html_sections(raw)
            record["pages"] = 0
            record["text_unit"] = "section"
        else:
            total, pages = pdf_pages(raw, doc_id)
            record["pages"] = total
            record["text_unit"] = "page"
        if doc_id in PAGE_RANGES:
            record["page_range"] = list(PAGE_RANGES[doc_id])
        chars = sum(len(p["text"].strip()) for p in pages)
        record["text_status"] = "extracted" if chars > 0 else "ocr-pending"
        record["text_chars"] = chars
        if chars > 0:
            json.dump({"document_id": doc_id, "title": record["title"],
                       "pages": len(pages), "page_text": pages},
                      open(os.path.join(processed_dir, doc_id + ".json"), "w", encoding="utf-8"),
                      ensure_ascii=False)
        out.append(record)
        print(doc_id, record["text_unit"], len(pages), chars, "chars")

    envelope = {
        "dataset": "hyperion-public-refinery-sample",
        "label": "Public sample data (OISD, CSB, OSHA, OSTI, MRPL/IOCL public spec sheets, CC-BY training text). Not MRPL plant records.",
        "generated": datetime.date.today().isoformat(),
        "documents": out,
    }
    json.dump(envelope, open(os.path.join(SEED, "manifest", "documents.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
