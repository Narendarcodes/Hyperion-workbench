import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from score_doc011 import has_value, score_item  # noqa: E402


class T(unittest.TestCase):
    def test_numbers_match_whole_tokens(self):
        self.assertTrue(has_value("Minimum flash point is 35 °C", "35"))
        self.assertFalse(has_value("value 135", "35"))
        self.assertFalse(has_value("3.5", "35"))
        self.assertTrue(has_value("815–845 kg/m3", "845"))
        self.assertTrue(has_value("Not worse than No. 1", "no. 1"))

    def test_fully_correct_needs_value_in_a_verified_doc011_quote(self):
        item = {"id": "f", "values": ["35"], "page": 1}
        good = {"answer": "35 °C", "citations": [{"doc_id": "DOC-011", "page": 1, "quote": "Flash point, Abel, °C, Min | 35", "quote_verified": True}]}
        self.assertTrue(score_item(item, good)["fully_correct"])
        wrong_doc = {"answer": "35 °C", "citations": [{"doc_id": "DOC-008", "page": 1, "quote": "35", "quote_verified": True}]}
        self.assertFalse(score_item(item, wrong_doc)["fully_correct"])
        unverified = {"answer": "35", "citations": [{"doc_id": "DOC-011", "page": 1, "quote": "35", "quote_verified": False}]}
        self.assertFalse(score_item(item, unverified)["fully_correct"])
        self.assertFalse(score_item(item, {"answer": "35", "abstain": True, "citations": []})["values_correct"])


if __name__ == "__main__":
    unittest.main()
