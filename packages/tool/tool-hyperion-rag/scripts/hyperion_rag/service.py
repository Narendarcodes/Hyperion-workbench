"""Hyperion RAG HTTP service: a warm index that accepts uploads and answers
search / cited-answer requests. Standard-library HTTP (no web framework).

Endpoints (JSON unless noted)
  GET  /health                 -> {ok, retrieval, degraded[], chunks, documents, embedModel, ocr}
  GET  /v1/documents           -> {documents: [{documentId, title, status, pages, ocrPages, ocrPendingPages, chunks, error}]}
  POST /v1/documents           raw body (application/pdf | text/markdown | text/plain)
                               headers: x-document-id, x-file-name, x-title (optional)
                               -> 202 {jobId, documentId, status}
  GET  /v1/documents/<id>/pages -> {documentId, title, pages: [{page, text}]} (uploads)
  GET  /v1/jobs/<id>           -> {jobId, documentId, status, stage, stages[], fullRebuild, chunksAdded, error}
  POST /v1/search              {q, documentIds?, limit?} -> {retrieval, degraded[], passages[]}
  POST /v1/answer              {question, documentIds?, limit?} -> grounded answer with verified citations

Ingestion is incremental: an upload is parsed (native text; OCR sidecar only
for pages without a text layer), chunked, appended to BM25 and embedded on
its own; the rest of the index is never re-embedded (``fullRebuild: false``).
Retrieval mode is reported on every response: ``hybrid_rerank`` / ``hybrid``
when the dense encoder is loaded, ``bm25`` with a ``degraded`` reason when not.
"""

from __future__ import annotations

import json
import os
import queue
import re
import sys
import threading
import time
import urllib.parse
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .config import RagConfig
from .ingest import load_corpus
from .pdf import OcrClient, load_upload
from .pipeline import Index, answer, retrieve

DOC_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
CONTENT_TYPES = {"application/pdf": ".pdf", "text/markdown": ".md", "text/plain": ".txt"}
STAGES_PDF = ["queued", "parsing", "ocr", "chunking", "indexing", "indexed"]
STAGES_TEXT = ["queued", "parsing", "chunking", "indexing", "indexed"]


class RagService:
    def __init__(self, cfg: RagConfig, encoder=None, reranker=None, llm=None, ocr: OcrClient | None = None,
                 degraded: list[str] | None = None):
        self.cfg = cfg
        self.encoder, self.reranker, self.llm, self.ocr = encoder, reranker, llm, ocr
        self.degraded = list(degraded or [])
        if encoder is None and not any("dense" in d for d in self.degraded):
            self.degraded.append("dense encoder not loaded")
        self.index: Index | None = None
        self.lock = threading.RLock()
        self.jobs: dict[str, dict] = {}
        self.docs: dict[str, dict] = {}
        self.q: queue.Queue = queue.Queue()
        self._worker = threading.Thread(target=self._run, daemon=True)
        self._worker.start()

    # ------------------------------------------------------------------ state
    @property
    def mode(self) -> str:
        if self.encoder is not None and self.index is not None and self.index.dense is not None:
            return self.cfg.default_mode if self.reranker is not None else "hybrid"
        return "bm25_rerank" if self.reranker is not None else "bm25"

    def bootstrap(self, corpus: list[str]) -> None:
        """Load the persisted index, or build it once from ``corpus``."""
        meta = os.path.join(self.cfg.index_dir, "meta.json")
        with self.lock:
            if os.path.exists(meta):
                self.index = Index.load(self.cfg.index_dir)
                if self.index.dense is not None and self.encoder is None:
                    self.index.dense = None  # cannot embed queries: stay honest, BM25 only
                elif self.index.dense is None and self.encoder is not None and self.index.chunks:
                    self.index.embed(self.encoder)  # one-time upgrade of a BM25-only index
                    self.index.save(self.cfg.index_dir)
            else:
                docs = load_corpus(corpus) if corpus else []
                self.index = Index.from_documents(docs, encoder=self.encoder,
                                                  max_chars=self.cfg.chunk_max_chars,
                                                  min_chars=self.cfg.chunk_min_chars)
                self.index.meta["sources"] = list(corpus)
                self.index.save(self.cfg.index_dir)
            for doc_id in self.index.doc_ids():
                self.docs.setdefault(doc_id, self._doc_row(doc_id, "indexed"))
            self._load_registry()

    def _registry_path(self) -> str:
        return os.path.join(self.cfg.index_dir, "documents.json")

    def _load_registry(self) -> None:
        try:
            with open(self._registry_path(), encoding="utf-8") as fh:
                for row in json.load(fh):
                    self.docs[row["documentId"]] = row
        except (OSError, ValueError):
            pass

    def _save_registry(self) -> None:
        os.makedirs(self.cfg.index_dir, exist_ok=True)
        rows = [r for r in self.docs.values() if r.get("uploaded")]
        with open(self._registry_path(), "w", encoding="utf-8") as fh:
            json.dump(rows, fh, indent=1)

    def _doc_row(self, doc_id: str, status: str, **extra) -> dict:
        chunks = [c for c in self.index.chunks if c.doc_id == doc_id] if self.index else []
        row = {"documentId": doc_id, "title": chunks[0].title if chunks else doc_id, "status": status,
               "pages": len({c.page for c in chunks}), "chunks": len(chunks), "ocrPages": [],
               "ocrPendingPages": [], "error": None, "updatedAt": time.time()}
        row.update(extra)
        return row

    def _pages_path(self, doc_id: str) -> str:
        return os.path.join(self.cfg.ingest_dir, doc_id + ".pages.json")

    def pages(self, doc_id: str) -> dict | None:
        """Full page text of an uploaded document (for citation checks and the viewer)."""
        try:
            with open(self._pages_path(doc_id), encoding="utf-8") as fh:
                return json.load(fh)
        except (OSError, ValueError):
            return None

    def health(self) -> dict:
        with self.lock:
            n = len(self.index.chunks) if self.index else 0
            return {"ok": self.index is not None, "retrieval": self.mode, "degraded": self.degraded,
                    "chunks": n, "documents": len(self.index.doc_ids()) if self.index else 0,
                    "embedModel": getattr(self.encoder, "model_id", None),
                    "rerankModel": getattr(self.reranker, "model_id", None),
                    "ocr": self.cfg.ocr_url or None, "queue": self.q.qsize()}

    # ------------------------------------------------------------------ ingest
    def submit(self, doc_id: str, content_type: str, body: bytes, file_name: str | None, title: str | None) -> dict:
        os.makedirs(self.cfg.ingest_dir, exist_ok=True)
        path = os.path.join(self.cfg.ingest_dir, doc_id + CONTENT_TYPES[content_type])
        with open(path, "wb") as fh:
            fh.write(body)
        job_id = uuid.uuid4().hex[:12]
        stages = STAGES_PDF if content_type == "application/pdf" else STAGES_TEXT
        job = {"jobId": job_id, "documentId": doc_id, "fileName": file_name, "status": "queued", "stage": "queued",
               "stages": ["queued"], "plannedStages": stages, "fullRebuild": False, "chunksAdded": 0,
               "error": None, "submittedAt": time.time(), "finishedAt": None}
        with self.lock:
            self.jobs[job_id] = job
            self.docs[doc_id] = self._doc_row(doc_id, "queued", title=title or file_name or doc_id,
                                              uploaded=True, fileName=file_name, jobId=job_id)
        self.q.put((job_id, path, content_type, title))
        return dict(job)

    def _stage(self, job: dict, stage: str) -> None:
        with self.lock:
            job["stage"] = stage
            job["stages"].append(stage)
            job["status"] = "running" if stage != "indexed" else "indexed"
            self.docs[job["documentId"]]["status"] = job["status"] if stage == "indexed" else stage

    def _run(self) -> None:
        while True:
            item = self.q.get()
            if item is None:
                return
            job_id, path, content_type, title = item
            job = self.jobs[job_id]
            doc_id = job["documentId"]
            try:
                self._stage(job, "parsing")
                if content_type == "application/pdf" and self.ocr is not None:
                    self._stage(job, "ocr")
                doc = load_upload(doc_id, path, content_type, self.ocr, self.cfg.ocr_min_chars,
                                  self.cfg.ocr_dpi, title)
                if not doc.pages:
                    raise ValueError("no text found (scanned pages need HYPERION_OCR_URL)")
                self._stage(job, "chunking")
                with open(self._pages_path(doc_id), "w", encoding="utf-8") as fh:
                    json.dump({"documentId": doc_id, "title": doc.title,
                               "pages": [{"page": p.page, "text": p.text} for p in doc.pages]}, fh, ensure_ascii=False)
                self._stage(job, "indexing")
                with self.lock:
                    use_dense = self.encoder is not None and (self.index.dense is not None or not self.index.chunks)
                    added = self.index.add_documents([doc], encoder=self.encoder if use_dense else None)
                    self.index.save(self.cfg.index_dir)
                    job["chunksAdded"] = added
                    row = self.docs[doc_id]
                    row.update(self._doc_row(doc_id, "indexed", title=row.get("title"), uploaded=True,
                                             fileName=row.get("fileName"), jobId=job_id,
                                             ocrPages=doc.meta.get("ocr_pages", []),
                                             ocrPendingPages=doc.meta.get("ocr_pending_pages", [])))
                self._stage(job, "indexed")
                job["finishedAt"] = time.time()
            except Exception as exc:  # surfaced to the UI as a failed job
                with self.lock:
                    job.update(status="failed", error=f"{type(exc).__name__}: {exc}", finishedAt=time.time())
                    self.docs[doc_id].update(status="failed", error=job["error"])
            finally:
                with self.lock:
                    self._save_registry()

    def close(self) -> None:
        self.q.put(None)

    # ------------------------------------------------------------------ query
    def _hits(self, q: str, document_ids: list[str] | None, limit: int):
        with self.lock:
            idx = self.index
            k = limit if not document_ids else max(limit * 10, 50)
            hits = retrieve(idx, q, mode=self.mode, k=k, dim=self.cfg.dim, encoder=self.encoder,
                            reranker=self.reranker, pool=self.cfg.retrieval_pool, rerank_top=self.cfg.rerank_top)
            if document_ids:
                wanted = set(document_ids)
                hits = [h for h in hits if idx.chunks[h.idx].doc_id in wanted]
            return idx, hits[:limit]

    def search(self, q: str, document_ids: list[str] | None, limit: int) -> dict:
        idx, hits = self._hits(q, document_ids, limit)
        passages = []
        for h in hits:
            c = idx.chunks[h.idx]
            passages.append({"documentId": c.doc_id, "page": c.page, "snippet": c.text[:600], "score": round(h.score, 6),
                             "chunkId": c.chunk_id, "section": c.section, "title": c.title,
                             "charStart": c.char_start, "charEnd": c.char_end})
        return {"retrieval": self.mode, "degraded": self.degraded, "passages": passages}

    def answer(self, question: str, document_ids: list[str] | None, limit: int) -> dict:
        if self.llm is None:
            raise RuntimeError("answering model not configured (HYPERION_LLM_URL)")
        idx, hits = self._hits(question, document_ids, limit)
        res = answer(idx, question, hits, self.llm)
        res["retrieval"] = self.mode
        res["degraded"] = self.degraded
        return res


# ---------------------------------------------------------------------- HTTP
def make_handler(svc: RagService):
    class Handler(BaseHTTPRequestHandler):
        server_version = "hx-rag/1"

        def log_message(self, fmt, *args):
            sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

        def _send(self, code: int, doc: dict):
            raw = json.dumps(doc, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def _body(self, ceiling: int) -> bytes | None:
            n = int(self.headers.get("Content-Length") or 0)
            if n <= 0 or n > ceiling:
                return None
            return self.rfile.read(n)

        def do_GET(self):
            path = self.path.split("?", 1)[0].rstrip("/")
            if path == "/health":
                return self._send(200, svc.health())
            if path == "/v1/documents":
                with svc.lock:
                    rows = sorted(svc.docs.values(), key=lambda r: r["documentId"])
                return self._send(200, {"documents": rows})
            m = re.fullmatch(r"/v1/documents/([A-Za-z0-9][A-Za-z0-9_-]{0,63})/pages", path)
            if m:
                doc = svc.pages(m.group(1))
                return self._send(200, doc) if doc else self._send(404, {"error": "unknown document"})
            m = re.fullmatch(r"/v1/jobs/([a-f0-9]{1,32})", path)
            if m:
                job = svc.jobs.get(m.group(1))
                return self._send(200, dict(job)) if job else self._send(404, {"error": "unknown job"})
            return self._send(404, {"error": "not found"})

        def do_POST(self):
            path = self.path.split("?", 1)[0].rstrip("/")
            if path == "/v1/documents":
                doc_id = (self.headers.get("x-document-id") or "").strip()
                if not DOC_ID.match(doc_id):
                    return self._send(400, {"error": "x-document-id must match [A-Za-z0-9][A-Za-z0-9_-]{0,63}"})
                ctype = (self.headers.get("content-type") or "").split(";", 1)[0].strip().lower()
                if ctype not in CONTENT_TYPES:
                    return self._send(415, {"error": f"content-type must be one of {sorted(CONTENT_TYPES)}"})
                body = self._body(svc.cfg.max_upload_bytes)
                if body is None:
                    return self._send(413, {"error": "body missing or larger than HYPERION_RAG_MAX_UPLOAD_BYTES"})
                name = self.headers.get("x-file-name")
                name = urllib.parse.unquote(name) if name else None
                job = svc.submit(doc_id, ctype, body, name, self.headers.get("x-title"))
                return self._send(202, job)
            if path in ("/v1/search", "/v1/answer"):
                raw = self._body(1 << 20)
                try:
                    req = json.loads(raw or b"")
                except ValueError:
                    return self._send(400, {"error": "body must be JSON"})
                text = str(req.get("q") or req.get("question") or "").strip()
                if not text or len(text) > 2000:
                    return self._send(400, {"error": "query must be 1-2000 characters"})
                ids = req.get("documentIds") or None
                if ids is not None and not (isinstance(ids, list) and all(isinstance(i, str) for i in ids)):
                    return self._send(400, {"error": "documentIds must be a list of strings"})
                limit = req.get("limit", 5)
                limit = min(max(int(limit), 1), 20) if isinstance(limit, int) else 5
                try:
                    out = svc.search(text, ids, limit) if path == "/v1/search" else svc.answer(text, ids, limit)
                except Exception as exc:
                    return self._send(502, {"error": f"{type(exc).__name__}: {exc}"})
                return self._send(200, out)
            return self._send(404, {"error": "not found"})

    return Handler


def serve(svc: RagService, host: str, port: int) -> ThreadingHTTPServer:
    class Server(ThreadingHTTPServer):
        daemon_threads = True
        request_queue_size = svc.cfg.listen_backlog

    return Server((host, port), make_handler(svc))
