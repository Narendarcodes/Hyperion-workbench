"""Uploaded-file ingestion: native PDF text per page, OCR only for the pages
that have (almost) no text layer, plus plain text / Markdown uploads.

The OCR sidecar (``packages/fs/tool-fs/ocr-sidecar``) is addressed only by
``HYPERION_OCR_URL``; which VLM it runs is the sidecar's own config
(``OCR_MODEL_ID``), so the OCR model can be swapped without touching this code.
"""

from __future__ import annotations

import base64
import concurrent.futures as cf
import json
import urllib.request
from typing import Callable

from .ingest import Document, Page, guess_title, split_pages


class OcrError(RuntimeError):
    pass


class OcrClient:
    """POST /v1/ocr/image per page image (PNG bytes) to the OCR sidecar."""

    def __init__(self, base_url: str, timeout: float = 300.0, concurrency: int = 8, opener=None):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.concurrency = max(1, concurrency)
        self._open = opener or urllib.request.urlopen
        self.model = None

    def _one(self, png: bytes) -> str:
        body = json.dumps({"image_base64": base64.b64encode(png).decode()}).encode()
        req = urllib.request.Request(self.base_url + "/v1/ocr/image", data=body,
                                     headers={"Content-Type": "application/json"})
        try:
            with self._open(req, timeout=self.timeout) as r:
                out = json.loads(r.read())
        except Exception as exc:  # network / 5xx: surfaced as a failed ingest stage
            raise OcrError(f"OCR sidecar request failed: {exc}") from exc
        self.model = out.get("model", self.model)
        return "\n".join(p.get("text", "") for p in out.get("pages", []))

    def ocr_images(self, images: dict[int, bytes]) -> dict[int, str]:
        with cf.ThreadPoolExecutor(min(self.concurrency, max(1, len(images)))) as ex:
            futs = {n: ex.submit(self._one, png) for n, png in images.items()}
            return {n: f.result() for n, f in futs.items()}


def document_from_pages(doc_id: str, source_path: str, page_texts: list[str],
                        ocr: Callable[[list[int]], dict[int, str]] | None, min_chars: int,
                        title: str | None = None) -> Document:
    """Build a Document from native page texts; pages under ``min_chars`` go to ``ocr``.

    Without an OCR callable those pages are left out and listed in
    ``meta['ocr_pending_pages']`` (never silently dropped).
    """
    low = [i + 1 for i, t in enumerate(page_texts) if len(t.strip()) < min_chars]
    ocr_text: dict[int, str] = ocr(low) if (ocr is not None and low) else {}
    pages: list[Page] = []
    for i, t in enumerate(page_texts, start=1):
        if ocr_text.get(i, "").strip():
            pages.append(Page(i, ocr_text[i]))
        elif t.strip():
            pages.append(Page(i, t))
    meta = {"page_count": len(page_texts), "ocr_pages": sorted(n for n in ocr_text if ocr_text[n].strip())}
    pending = [n for n in low if not ocr_text.get(n, "").strip() and not page_texts[n - 1].strip()]
    if pending:
        meta["ocr_pending_pages"] = pending
    first = next((p.text for p in pages if p.text.strip()), "")
    return Document(doc_id, title or guess_title(doc_id, first, {}), pages, source_path, meta)


def pdf_page_texts(path: str) -> list[str]:
    import fitz  # PyMuPDF

    with fitz.open(path) as pdf:
        return [page.get_text("text") for page in pdf]


def render_pages(path: str, numbers: list[int], dpi: int) -> dict[int, bytes]:
    import fitz

    out: dict[int, bytes] = {}
    with fitz.open(path) as pdf:
        for n in numbers:
            out[n] = pdf[n - 1].get_pixmap(dpi=dpi).tobytes("png")
    return out


def load_upload(doc_id: str, path: str, content_type: str, ocr_client: OcrClient | None,
                min_chars: int, dpi: int, title: str | None = None) -> Document:
    """Turn one uploaded file into a Document (PDF, Markdown or plain text)."""
    if content_type == "application/pdf":
        texts = pdf_page_texts(path)
        ocr = None
        if ocr_client is not None:
            def ocr(numbers: list[int]) -> dict[int, str]:
                return ocr_client.ocr_images(render_pages(path, numbers, dpi))
        return document_from_pages(doc_id, path, texts, ocr, min_chars, title)
    with open(path, encoding="utf-8", errors="replace") as fh:
        text = fh.read()
    pages = split_pages(text)
    return Document(doc_id, title or guess_title(doc_id, text, {}), pages, path,
                    {"page_count": len(pages), "ocr_pages": []})
