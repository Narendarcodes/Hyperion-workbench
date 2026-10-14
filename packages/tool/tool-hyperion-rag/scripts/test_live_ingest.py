#!/usr/bin/env python3
"""Tests for live (incremental) ingestion, typed config, OCR hand-off and the
RAG HTTP service. Stdlib only: no GPU, no network (fake encoder / OCR / LLM).

Run: python3 scripts/test_live_ingest.py
"""

import base64
import json
import os
import sys
import tempfile
import threading
import time
import unittest
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from hyperion_rag.bm25 import BM25  # noqa: E402
from hyperion_rag.config import RagConfig  # noqa: E402
from hyperion_rag.ingest import Document, Page  # noqa: E402
from hyperion_rag.pipeline import Index, retrieve  # noqa: E402

FIXTURES = os.path.join(HERE, "..", "fixtures", "corpus")
# loopback calls must not go through an ambient HTTP proxy
NO_PROXY = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def doc(doc_id, *pages):
    return Document(doc_id, doc_id, [Page(i + 1, t) for i, t in enumerate(pages)], f"/x/{doc_id}.pdf")


class FakeEncoder:
    """Deterministic bag-of-letters vectors; enough to prove rows line up with chunks."""
    model_id = "fake/encoder"
    fallback_reason = None

    def __init__(self):
        self.encoded = 0

    def _vec(self, text):
        import numpy as np
        v = np.zeros(32, dtype="float32")
        for ch in text.lower():
            if "a" <= ch <= "z":
                v[ord(ch) - 97] += 1
        n = float(np.linalg.norm(v)) or 1.0
        return v / n

    def encode_docs(self, texts):
        import numpy as np
        self.encoded += len(texts)
        return np.stack([self._vec(t) for t in texts]) if texts else np.zeros((0, 32), dtype="float32")

    def encode_queries(self, queries):
        import numpy as np
        return np.stack([self._vec(q) for q in queries])


def have_numpy():
    try:
        import numpy  # noqa: F401
        return True
    except ImportError:
        return False


class ConfigTests(unittest.TestCase):
    def test_defaults_are_documented_and_typed(self):
        cfg = RagConfig.from_env({})
        self.assertEqual(cfg.embed_model, "google/embeddinggemma-2")
        self.assertEqual(cfg.embed_fallback, "")          # no silent fallback by default
        self.assertEqual(cfg.reranker_model, "BAAI/bge-reranker-v2-m3")
        self.assertIsInstance(cfg.ocr_min_chars, int)
        self.assertIsInstance(cfg.vram_gb, float)
        for name in RagConfig.ENV:
            self.assertIn(name, RagConfig.describe())     # every knob is documented

    def test_env_overrides_and_validation(self):
        cfg = RagConfig.from_env({"HYPERION_RAG_EMBED_MODEL": "org/m", "HYPERION_OCR_URL": "http://ocr:1",
                                  "HYPERION_RAG_OCR_MIN_CHARS": "12", "HYPERION_LLM_MODEL": "big"})
        self.assertEqual((cfg.embed_model, cfg.ocr_url, cfg.ocr_min_chars, cfg.llm_model),
                         ("org/m", "http://ocr:1", 12, "big"))
        with self.assertRaises(ValueError):
            RagConfig.from_env({"HYPERION_RAG_OCR_MIN_CHARS": "lots"})


class DensePreflightTests(unittest.TestCase):
    def test_old_sentence_transformers_is_reported_not_silently_mean_pooled(self):
        from hyperion_rag.dense import preflight
        ok, reason = preflight("google/embeddinggemma-2", st_version="5.1.2", offline=False, cached=lambda m: True)
        self.assertFalse(ok)
        self.assertIn("sentence-transformers", reason)

    def test_offline_requires_model_in_cache(self):
        from hyperion_rag.dense import preflight
        ok, reason = preflight("google/embeddinggemma-2", st_version="6.1.0", offline=True, cached=lambda m: False)
        self.assertFalse(ok)
        self.assertIn("not in the Hugging Face cache", reason)
        ok, reason = preflight("google/embeddinggemma-2", st_version="6.1.0", offline=True, cached=lambda m: True)
        self.assertTrue(ok, reason)


class IncrementalBM25Tests(unittest.TestCase):
    def test_add_matches_full_build(self):
        a = ["pump seal leak at P-101", "flash point of HSD is 35 C", "relief valve PSV-12 set pressure"]
        b = ["cooling water pump trip", "HSD flash point test method IS 1448"]
        full = BM25(a + b)
        inc = BM25(a)
        inc.add(b)
        for q in ["flash point HSD", "pump", "PSV-12"]:
            self.assertEqual([i for i, _ in full.search(q)], [i for i, _ in inc.search(q)])
            for (i, s1), (_, s2) in zip(full.search(q), inc.search(q)):
                self.assertAlmostEqual(s1, s2, places=9)


@unittest.skipUnless(have_numpy(), "numpy needed for the dense path")
class IncrementalIndexTests(unittest.TestCase):
    def test_add_document_only_embeds_new_chunks(self):
        enc = FakeEncoder()
        idx = Index.from_documents([doc("A", "pump seal replacement procedure " * 20)], encoder=enc)
        before = enc.encoded
        n0 = len(idx.chunks)
        added = idx.add_documents([doc("B", "flash point of high speed diesel is 35 degrees " * 20)], encoder=enc)
        self.assertGreater(added, 0)
        self.assertEqual(enc.encoded - before, added)          # no re-embedding of A
        self.assertEqual(idx.dense.shape[0], len(idx.chunks))
        self.assertEqual(len(idx.chunks), n0 + added)
        hits = retrieve(idx, "flash point diesel", mode="hybrid", k=1, encoder=enc)
        self.assertEqual(idx.chunks[hits[0].idx].doc_id, "B")

    def test_replace_and_remove_keep_rows_aligned(self):
        enc = FakeEncoder()
        idx = Index.from_documents([doc("A", "alpha " * 50), doc("B", "bravo " * 50)], encoder=enc)
        idx.add_documents([doc("A", "zulu " * 50)], encoder=enc)          # same id replaces
        self.assertEqual(sorted({c.doc_id for c in idx.chunks}), ["A", "B"])
        self.assertTrue(all("zulu" in c.text for c in idx.chunks if c.doc_id == "A"))
        self.assertEqual(idx.dense.shape[0], len(idx.chunks))
        idx.remove_document("B")
        self.assertEqual({c.doc_id for c in idx.chunks}, {"A"})
        self.assertEqual(idx.dense.shape[0], len(idx.chunks))

    def test_save_load_roundtrip_after_incremental_add(self):
        enc = FakeEncoder()
        idx = Index.from_documents([doc("A", "alpha " * 50)], encoder=enc)
        idx.add_documents([doc("B", "bravo " * 50)], encoder=enc)
        with tempfile.TemporaryDirectory() as d:
            idx.save(d)
            back = Index.load(d)
            self.assertEqual(len(back.chunks), len(idx.chunks))
            self.assertEqual(back.dense.shape, idx.dense.shape)
            self.assertEqual(back.meta["n_docs"], 2)


class PdfIngestTests(unittest.TestCase):
    def test_only_low_text_pages_go_to_ocr(self):
        from hyperion_rag.pdf import document_from_pages
        calls = []

        def ocr(page_numbers):
            calls.append(list(page_numbers))
            return {n: f"OCR text of page {n} flash point 35" for n in page_numbers}

        d = document_from_pages("DOC-X", "/x/DOC-X.pdf", ["native text " * 20, "", "   "], ocr=ocr, min_chars=40)
        self.assertEqual(calls, [[2, 3]])
        self.assertEqual([p.page for p in d.pages], [1, 2, 3])
        self.assertTrue(d.pages[1].text.startswith("OCR text"))
        self.assertEqual(d.meta["ocr_pages"], [2, 3])

    def test_without_ocr_scanned_pages_are_reported(self):
        from hyperion_rag.pdf import document_from_pages
        d = document_from_pages("DOC-Y", "/x/DOC-Y.pdf", ["native " * 30, ""], ocr=None, min_chars=40)
        self.assertEqual([p.page for p in d.pages], [1])
        self.assertEqual(d.meta["ocr_pending_pages"], [2])

    def test_ocr_client_posts_page_images(self):
        from hyperion_rag.pdf import OcrClient
        seen = []

        class R:
            def __init__(self, body):
                self.body = body

            def read(self):
                return self.body

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        def opener(req, timeout=None):
            body = json.loads(req.data)
            seen.append((req.full_url, len(base64.b64decode(body["image_base64"]))))
            return R(json.dumps({"pages": [{"number": 1, "text": "page text"}], "model": "m"}).encode())

        client = OcrClient("http://ocr:9", opener=opener, concurrency=2)
        out = client.ocr_images({4: b"png4", 7: b"png7"})
        self.assertEqual(out, {4: "page text", 7: "page text"})
        self.assertEqual(sorted(u for u, _ in seen), ["http://ocr:9/v1/ocr/image"] * 2)


class ServiceTests(unittest.TestCase):
    """The HTTP service: upload -> job -> searchable, without a full rebuild."""

    @classmethod
    def setUpClass(cls):
        from hyperion_rag.service import RagService, serve
        cls.tmp = tempfile.TemporaryDirectory()
        cfg = RagConfig.from_env({"HYPERION_RAG_INDEX_DIR": os.path.join(cls.tmp.name, "index"),
                                  "HYPERION_RAG_INGEST_DIR": os.path.join(cls.tmp.name, "ingest")})
        cls.svc = RagService(cfg, encoder=None, reranker=None, llm=None, ocr=None)
        cls.svc.bootstrap([FIXTURES])
        cls.server = serve(cls.svc, "127.0.0.1", 0)
        cls.base = f"http://127.0.0.1:{cls.server.server_address[1]}"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.svc.close()
        cls.tmp.cleanup()

    def call(self, path, body=None, method=None, headers=None):
        data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
        h = {"content-type": "application/json"} if isinstance(body, dict) else {}
        h.update(headers or {})
        req = urllib.request.Request(self.base + path, data=data, headers=h, method=method)
        with NO_PROXY.open(req, timeout=10) as r:
            return json.loads(r.read())

    def test_health_reports_retrieval_mode_honestly(self):
        h = self.call("/health")
        self.assertEqual(h["retrieval"], "bm25")
        self.assertIn("dense encoder not loaded", h["degraded"])

    def test_upload_becomes_searchable_incrementally(self):
        chunks_before = self.call("/health")["chunks"]
        text = "# Flash point record\n\nThe flash point of the HSD sample DOC-LIVE-1 was 42 C by IS 1448 P:21.\n" * 5
        job = self.call("/v1/documents", text.encode(), method="POST",
                        headers={"content-type": "text/markdown", "x-document-id": "DOC-LIVE-1",
                                 "x-file-name": "flash.md"})
        self.assertIn(job["status"], ("queued", "running", "indexed"))
        for _ in range(100):
            st = self.call(f"/v1/jobs/{job['jobId']}")
            if st["status"] in ("indexed", "failed"):
                break
            time.sleep(0.05)
        self.assertEqual(st["status"], "indexed", st)
        self.assertEqual(st["stages"][-1], "indexed")
        self.assertFalse(st["fullRebuild"])
        self.assertGreater(self.call("/health")["chunks"], chunks_before)
        res = self.call("/v1/search", {"q": "flash point HSD sample", "limit": 3})
        self.assertEqual(res["passages"][0]["documentId"], "DOC-LIVE-1")
        self.assertEqual(res["retrieval"], "bm25")
        docs = {d["documentId"]: d for d in self.call("/v1/documents")["documents"]}
        self.assertEqual(docs["DOC-LIVE-1"]["status"], "indexed")
        pages = self.call("/v1/documents/DOC-LIVE-1/pages")
        self.assertEqual(pages["pages"][0]["page"], 1)
        self.assertIn("flash point of the HSD sample", pages["pages"][0]["text"])

    def test_burst_of_concurrent_clients_is_not_reset(self):
        # the DOC-011 bench at concurrency 81 got ECONNRESET: socketserver's default backlog is 5
        self.assertGreaterEqual(self.server.request_queue_size, RagConfig.from_env({}).listen_backlog)
        import concurrent.futures as cf
        with cf.ThreadPoolExecutor(96) as ex:
            res = list(ex.map(lambda i: self.call("/v1/search", {"q": f"seal {i}", "limit": 2}), range(96)))
        self.assertEqual(len(res), 96)

    def test_search_filters_by_document_ids(self):
        res = self.call("/v1/search", {"q": "seal", "documentIds": ["DOC-900"], "limit": 5})
        self.assertTrue(all(p["documentId"] == "DOC-900" for p in res["passages"]))

    def test_rejects_bad_ids_and_types(self):
        import urllib.error
        with self.assertRaises(urllib.error.HTTPError) as e:
            self.call("/v1/documents", b"x", method="POST", headers={"content-type": "text/plain",
                                                                      "x-document-id": "../etc"})
        self.assertEqual(e.exception.code, 400)
        with self.assertRaises(urllib.error.HTTPError) as e:
            self.call("/v1/documents", b"x", method="POST", headers={"content-type": "application/zip",
                                                                      "x-document-id": "OK-1"})
        self.assertEqual(e.exception.code, 415)


if __name__ == "__main__":
    unittest.main(verbosity=2)
