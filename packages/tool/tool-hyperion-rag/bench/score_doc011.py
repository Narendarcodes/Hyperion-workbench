"""Score cited answers against the DOC-011 answer key (pure functions; used by run_doc011.py)."""
import re
import unicodedata


def norm(text: str) -> str:
    t = unicodedata.normalize("NFKC", text or "").lower()
    t = t.replace("\u2013", "-").replace("\u2014", "-").replace("\u2212", "-")
    return re.sub(r"\s+", " ", t)


def has_value(text: str, value: str) -> bool:
    t, v = norm(text), norm(value)
    if re.fullmatch(r"\d+(\.\d+)?", v):
        return re.search(r"(?<![\d.])" + re.escape(v) + r"(?![\d])", t) is not None
    return v in t


def score_item(item: dict, res: dict) -> dict:
    answer = res.get("answer") or ""
    cites = res.get("citations") or []
    values_ok = (not res.get("abstain")) and all(has_value(answer, v) for v in item["values"])
    doc_cited = any(c.get("doc_id", c.get("documentId")) == "DOC-011" for c in cites)
    verified_value = any((c.get("quote_verified", c.get("verified")) and c.get("doc_id", c.get("documentId")) == "DOC-011"
                          and any(has_value(c.get("quote", ""), v) for v in item["values"])) for c in cites)
    page_ok = any(c.get("page") == item["page"] for c in cites if c.get("doc_id", c.get("documentId")) == "DOC-011")
    return {"id": item["id"], "values_correct": values_ok, "doc_cited": doc_cited, "page_correct": page_ok,
            "value_in_verified_quote": verified_value, "fully_correct": values_ok and verified_value,
            "abstain": bool(res.get("abstain"))}
