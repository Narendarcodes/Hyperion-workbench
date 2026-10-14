#!/usr/bin/env python3
"""Stdlib acceptance tests for the Hyperion RAG core (BM25 path; no GPU, no network).

Run: python3 scripts/test_hyperion_rag.py
"""

import json
import os
import re
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from hyperion_rag.bm25 import BM25, tokenize  # noqa: E402
from hyperion_rag.chunk import chunk_document  # noqa: E402
from hyperion_rag.ingest import Document, Page, load_corpus, split_pages  # noqa: E402
from hyperion_rag.pipeline import (ABSTAIN_TOKEN, Hit, Index, answer, answer_report,  # noqa: E402
                                   expand_neighbors, locate, retrieve, rrf)

FIXTURES = os.path.join(HERE, "..", "fixtures", "corpus")
# Same page/destination rules as ui-primitives citation-target.ts (PR #11 viewer contract)
VIEWER_PAGE = re.compile(r"#page=(\d+)|(?:\bp\.?\s*|\bpage\s+)(\d+)", re.I)


class FakeLLM:
    def __init__(self, reply):
        self.reply = reply
        self.calls = []

    def chat(self, messages, max_tokens=None, retries=3):
        self.calls.append(messages)
        return self.reply if isinstance(self.reply, str) else json.dumps(self.reply)


class IngestChunkTests(unittest.TestCase):
    def test_page_markers_and_form_feeds(self):
        self.assertEqual([p.page for p in split_pages("a<!-- page 2 -->b<!-- page 3 -->c")], [1, 2, 3])
        self.assertEqual([p.text for p in split_pages("x\fy")], ["x", "y"])
        self.assertEqual(len(split_pages("no breaks")), 1)
        ocr = "<!-- DOC-011 | OCR -->\n\n--- page 1 ---\nTable 1\n\n--- page 2 ---\nNotes"
        self.assertEqual([(p.page, p.text.strip()) for p in split_pages(ocr)], [(1, "Table 1"), (2, "Notes")])

    def test_fixture_corpus_loads_dirs_and_page_files(self):
        docs = {d.doc_id: d for d in load_corpus([FIXTURES])}
        self.assertIn("HYP-T01", docs)
        self.assertEqual([p.page for p in docs["DOC-900"].pages], [1, 2])

    def test_chunks_are_exact_page_slices_with_sections(self):
        doc = load_corpus([os.path.join(FIXTURES, "HYP-T01.md")])[0]
        chunks = chunk_document(doc, max_chars=300, min_chars=50)
        self.assertGreater(len(chunks), 1)
        page = doc.pages[0].text
        for c in chunks:
            self.assertEqual(page[c.char_start:c.char_end], c.text)
        self.assertTrue(any(c.section == "2. Seal Replacement" for c in chunks))

    def test_long_table_is_split_on_row_boundaries(self):
        rows = "\n".join(f"| R{i} | PN-{i:04d} | {i} |" for i in range(80))
        doc = Document("T", "t", [Page(1, "### Parts\n" + rows)], "t.md")
        for c in chunk_document(doc, max_chars=400, min_chars=50):
            self.assertLessEqual(len(c.text), 400)
            self.assertTrue(c.text.rstrip().endswith("|"))


class RetrievalTests(unittest.TestCase):
    def test_tokenizer_keeps_tags_whole_and_split(self):
        toks = tokenize("Install kit MS\u20114471\u2011K now")
        self.assertIn("ms-4471-k", toks)
        self.assertIn("4471", toks)

    def test_bm25_finds_exact_tag(self):
        bm = BM25(["pump seal kit MS-4471-K", "flare header FH-2", "unrelated text"])
        self.assertEqual(bm.search("which seal kit MS-4471-K?", 1)[0][0], 0)

    def test_rrf_rewards_agreement(self):
        fused = rrf([[(1, 9.0), (2, 8.0)], [(2, 0.9), (3, 0.8)]])
        self.assertEqual(fused[0][0], 2)

    def test_index_roundtrip_and_bm25_mode(self):
        idx = Index.build([FIXTURES], max_chars=300, min_chars=50)
        with tempfile.TemporaryDirectory() as d:
            idx.save(d)
            idx2 = Index.load(d)
        hits = retrieve(idx2, "knockout drum KO-7 high level alarm", "bm25", 3)
        top = idx2.chunks[hits[0].idx]
        self.assertEqual((top.doc_id, top.page), ("DOC-900", 2))

    def test_neighbour_expansion_stays_in_document(self):
        idx = Index.build([FIXTURES], max_chars=200, min_chars=20)
        first = next(i for i, c in enumerate(idx.chunks) if c.doc_id == "HYP-T01")
        out = expand_neighbors(idx, [Hit(first + 1, 1.0)], 1, 8)
        self.assertTrue(all(idx.chunks[h.idx].doc_id == "HYP-T01" for h in out))
        self.assertEqual(len(out), 3)


class AnswerTests(unittest.TestCase):
    def setUp(self):
        self.idx = Index.build([FIXTURES], max_chars=300, min_chars=50)
        self.hits = retrieve(self.idx, "seal kit part number MS-4471-K for pump P-101", "bm25", 3)

    def test_locate_tolerates_markdown_and_unicode_hyphens(self):
        hay = "Step 4: Install mechanical seal kit **MS\u20114471\u2011K** (qty 1)."
        a, b = locate(hay, "Install mechanical seal kit MS-4471-K")
        self.assertTrue(hay[a:b].startswith("Install"))
        self.assertIsNone(locate(hay, "seal kit XY-0000"))

    def test_fuzzy_locate_handles_tables_bullets_ellipses_but_not_wrong_numbers(self):
        table = "| Quantity per Service    | **1.8 L** (ISO\u2011VG 220)   |"
        a, b = locate(table, "Quantity per Service | 1.8 L (ISO-VG 220)")
        self.assertIn("1.8 L", table[a:b])
        log = "The filter element F-IN-07 was replaced. Operator logged it.\nDowntime: 49 minutes."
        self.assertIsNotNone(locate(log, "The filter element F-IN-07 was replaced ... Downtime: 49 minutes"))
        bullets = "\u2022 Shut down motor, inspected belt.\n\u2022 Re-tensioned belt to 22 mm (spec 21-23 mm) and restarted."
        self.assertIsNotNone(locate(bullets, "Re-tensioned belt to 22 mm (spec 21-23 mm) and restarted"))
        self.assertIsNone(locate(bullets, "Re-tensioned belt to 25 mm (spec 21-23 mm) and restarted"))

    def test_verified_citation_with_viewer_footnote(self):
        n = next(i for i, h in enumerate(self.hits) if "MS" in self.idx.chunks[h.idx].text) + 1
        llm = FakeLLM({"answer": "MS-4471-K", "abstain": False,
                       "citations": [{"block": f"E{n}", "quote": "Install mechanical seal kit MS-4471-K"}]})
        res = answer(self.idx, "seal kit?", self.hits, llm, expand=0)
        self.assertFalse(res["abstain"])
        c = res["citations"][0]
        self.assertTrue(c["quote_verified"])
        self.assertEqual(c["doc_id"], "HYP-T01")
        page_text = load_corpus([os.path.join(FIXTURES, "HYP-T01.md")])[0].pages[0].text
        self.assertIn("MS", page_text[c["char_start"]:c["char_end"]])
        m = VIEWER_PAGE.search(c["footnote"])
        self.assertEqual(int(m.group(1) or m.group(2)), 1)
        self.assertTrue(c["footnote"].startswith("[^1]: [HYP-T01]("))

    def test_abstains_when_model_abstains(self):
        res = answer(self.idx, "serial number?", self.hits,
                     FakeLLM({"answer": ABSTAIN_TOKEN, "abstain": True, "citations": []}))
        self.assertTrue(res["abstain"])
        self.assertEqual(res["abstain_reason"], "model")

    def test_unverifiable_quote_is_withheld(self):
        res = answer(self.idx, "seal kit?", self.hits,
                     FakeLLM({"answer": "XY-0000", "abstain": False,
                              "citations": [{"block": "E1", "quote": "seal kit XY-0000"}]}))
        self.assertTrue(res["abstain"])
        self.assertEqual(res["abstain_reason"], "no_verified_citation")

    def test_retrieval_gate_and_no_hits(self):
        self.assertEqual(answer(self.idx, "q", [], FakeLLM("{}"))["abstain_reason"], "no_evidence")
        low = [Hit(self.hits[0].idx, 0.01, {"rerank": 0.01})]
        llm = FakeLLM("{}")
        self.assertTrue(answer(self.idx, "q", low, llm, gate=0.1)["abstain"])
        self.assertEqual(llm.calls, [])

    def test_report_drops_unsupported_claims(self):
        n = next(i for i, h in enumerate(self.hits) if "MS" in self.idx.chunks[h.idx].text) + 1
        llm = FakeLLM({"abstain": False, "claims": [
            {"text": "Seal kit is MS-4471-K", "citations": [{"block": f"E{n}", "quote": "seal kit MS-4471-K"}]},
            {"text": "Pump runs at 2900 rpm", "citations": [{"block": "E1", "quote": "2900 rpm"}]},
        ], "uncertainties": ["Seal vendor not stated"]})
        res = answer_report(self.idx, "seal?", self.hits, llm, expand=0)
        self.assertEqual(len(res["claims"]), 1)
        self.assertEqual(len(res["dropped_claims"]), 1)


class CliTests(unittest.TestCase):
    def test_cli_index_and_bm25_query(self):
        with tempfile.TemporaryDirectory() as d:
            out = subprocess.run([sys.executable, os.path.join(HERE, "rag.py"), "index", "--corpus", FIXTURES,
                                  "--out", d], capture_output=True, text=True, check=True)
            self.assertTrue(json.loads(out.stdout)["ok"])
            q = subprocess.run([sys.executable, os.path.join(HERE, "rag.py"), "query", "--index", d, "-"],
                               input=json.dumps({"question": "flare header FH-2 design pressure", "mode": "bm25"}),
                               capture_output=True, text=True, check=True)
            body = json.loads(q.stdout)
            self.assertEqual(body["hits"][0]["doc_id"], "DOC-900")
            self.assertTrue(body["hits"][0]["href"].endswith("#page=1"))

    def test_cli_rejects_bad_mode(self):
        with tempfile.TemporaryDirectory() as d:
            subprocess.run([sys.executable, os.path.join(HERE, "rag.py"), "index", "--corpus", FIXTURES, "--out", d],
                           capture_output=True, check=True)
            q = subprocess.run([sys.executable, os.path.join(HERE, "rag.py"), "query", "--index", d, "-"],
                               input=json.dumps({"question": "x", "mode": "magic"}), capture_output=True, text=True)
            self.assertEqual(q.returncode, 2)
            self.assertIn("error", json.loads(q.stdout))


if __name__ == "__main__":
    unittest.main(verbosity=1)
