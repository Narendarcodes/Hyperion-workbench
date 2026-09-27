#!/usr/bin/env python3
"""MRPL MG 91 gasoline specification compliance checker (closed world).

Reads the REAL specification from ``refinery-corpus/corpus/processed/DOC-010.json``
and checks one synthetic lab sample against it. Standard library only
(``json`` + stdlib helpers); no network, no LLM, no external APIs.

Numeric limits are PARSED from the DOC-010 page text at runtime. A tiny
citation map (parameter -> page + verbatim test-method string) exists ONLY
because the OCR method column is line-jumbled and cannot be reliably
re-attached to rows by regex; it carries citation metadata, never limits.
If DOC-010 is missing, malformed, or structurally incompatible the job
FAILS CLOSED (exit 2, machine-readable error on stdout).

Usage:
    py mrpl_spec_check.py INPUT.json [--doc DOC-010.json] [--out RESULT.json]

Exit codes: 0 = check completed (PASS/FAIL/NA are data, not errors);
2 = input/spec/tool error (JSON error object on stdout).
"""

import hashlib
import json
import os
import re
import sys

TOOL_VERSION = "1.0.0"

# Canonical parameter keys (lowercase). Anything else is rejected.
KNOWN_PARAMS = (
    "ron", "mon", "density", "sulphur", "benzene",
    "rvp", "e70", "olefins", "aromatics",
)

# Accepted unit spellings per parameter (lowercase, stripped).
UNIT_ALIASES = {
    "ron": {"", "-", "none", "unitless", "on", "ron", "number", "octane", "octane number"},
    "mon": {"", "-", "none", "unitless", "on", "mon", "number", "octane", "octane number"},
    "density": {"kg/m3", "kg/m^3", "kgm-3"},
    "sulphur": {"mg/kg", "mgkg-1", "ppm"},  # ponytail: ppm treated as mg/kg-equiv for gasoline; flagged in assumptions
    "benzene": {"vol%", "vol %", "%vol", "%", "percent", "vol"},
    "rvp": {"kpa"},
    "e70": {"vol%", "vol %", "%vol", "%", "percent", "vol"},
    "olefins": {"vol%", "vol %", "%vol", "%", "percent", "vol"},
    "aromatics": {"vol%", "vol %", "%vol", "%", "percent", "vol"},
}

# Minimal citation metadata map. REASON: the DOC-010 OCR method column wraps
# across lines ("IS 1448, P: 34/ ASTM D \n1266 / ...") so methods cannot be
# regex-attached to rows; page numbers and verbatim method strings are copied
# here once and verified against DOC-010. All LIMITS are parsed from DOC-010.
CITATIONS = {
    "ron": {"page": 1, "method": "IS 1448, P:27 / ISO 5164 / ASTM D 2699"},
    "mon": {"page": 1, "method": "IS 1448, P:26 / ISO 5163 / ASTM D 2700"},
    "density": {"page": 1, "method": "IS 1448, P:16 / ISO 3675 / ASTM D 4052"},
    "e70": {"page": 1, "method": "IS 1448, P:18 / ISO 3405 / ASTM D 86"},
    "sulphur": {"page": 1, "method": "IS 1448, P:34 / ASTM D 1266 (P:83, ISO 4260, D 2784, D 5453, D 2622, ISO 14596, D 3120, ISO 20847)"},
    "rvp": {"page": 1, "method": "IS 1448, P:39 / ISO 3007 / ASTM D 323 (EN 13016, ASTM D 5191)"},
    "vli": {"page": 1, "method": "VLI = 10 x RVP + 7 x E70 (as printed in DOC-010)"},
    "benzene": {"page": 1 + 1, "method": "ASTM D 3606 (ASTM D 5580, D 6277, D 6730)"},
    "olefins": {"page": 2, "method": "P:23 / ASTM D 1319 / D 3738 (ASTM D 6730)"},
    "aromatics": {"page": 2, "method": "P:23 / ASTM D 1319 / ASTM D 6730 / ISO 3738 (ASTM D 5580, D 6730)"},
}
CITATIONS["benzene"]["page"] = 2


def default_doc_path():
    """Default DOC-010 location relative to this script (repo layout)."""
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.normpath(os.path.join(
        here, "..", "..", "..", "..", "..",
        "refinery-corpus", "corpus", "processed", "DOC-010.json"))


def fail(code, errors, warnings=None):
    """Emit a machine-readable error object and exit 2 (fail closed)."""
    print(json.dumps({"code": code, "errors": errors,
                      "warnings": warnings or []}, indent=2))
    sys.exit(2)


def norm(text):
    return re.sub(r"\s+", " ", text or " ")


def must_find(pattern, text, label):
    """Return the first regex match groups or raise a spec error."""
    match = re.search(pattern, text, re.IGNORECASE)
    if not match:
        raise ValueError("spec_incompatible: cannot parse %s from DOC-010" % label)
    return match


def load_spec(doc_path):
    """Load DOC-010, verify identity, and parse numeric limits from page text."""
    if not os.path.isfile(doc_path):
        fail("spec_unavailable", ["DOC-010 not found: %s" % doc_path])
    try:
        with open(doc_path, "r", encoding="utf-8") as handle:
            doc = json.load(handle)
    except (json.JSONDecodeError, UnicodeDecodeError, OSError) as exc:
        fail("spec_unavailable", ["DOC-010 unreadable: %s" % exc])
    try:
        if doc.get("document_id") != "DOC-010":
            raise ValueError("identity: document_id is %r, expected 'DOC-010'"
                             % (doc.get("document_id"),))
        if "MG 91" not in str(doc.get("title", "")):
            raise ValueError("identity: title does not mention MG 91")
        pages = {entry.get("page"): entry.get("text", "")
                 for entry in doc.get("page_text", [])}
        if 1 not in pages or 2 not in pages or not pages[1].strip() \
                or not pages[2].strip():
            raise ValueError("structure: expected non-empty pages 1 and 2")
        page1, page2 = norm(pages[1]), norm(pages[2])
        # VLI formula must be present exactly as printed (OCR renders E70 as E7O).
        must_find(r"10\s*\*\s*RVP", page1, "VLI formula (10*RVP)")
        must_find(r"7\s*\*\s*E7O?", page1, "VLI formula (7*E70)")
        spec = {
            "ron_min": float(must_find(
                r"Research Octane Number \(RON\), Min\s*(\d+(?:\.\d+)?)",
                page1, "RON min").group(1)),
            "mon_min": float(must_find(
                r"Motor Octane Number \(MON\), Min\s*(\d+(?:\.\d+)?)",
                page1, "MON min").group(1)),
            "density_lo": float(must_find(
                r"Density at 15.*?Kg/m3\s*(\d+)\s*-\s*(\d+)",
                page1, "density range").group(1)),
            "density_hi": float(must_find(
                r"Density at 15.*?Kg/m3\s*(\d+)\s*-\s*(\d+)",
                page1, "density range").group(2)),
            "e70_lo": float(must_find(
                r"Recovery up to 70.*?E70\}? Percent by\s*volume\s*(\d+)\s*-\s*(\d+)",
                page1, "E70 range").group(1)),
            "e70_hi": float(must_find(
                r"Recovery up to 70.*?E70\}? Percent by\s*volume\s*(\d+)\s*-\s*(\d+)",
                page1, "E70 range").group(2)),
            "sulphur_max": float(must_find(
                r"Sulphur,?\s*total\s*,?\s*mg/kg\s*Max\s*(\d+(?:\.\d+)?)",
                page1, "sulphur max").group(1)),
            "rvp_max": float(must_find(
                r"Reid Vapour pressure.*?kPa,?\s*(\d+(?:\.\d+)?)",
                page1, "RVP max").group(1)),
            "vli_summer": float(must_find(
                r"Summer\s*(\d+)", page1, "VLI summer limit").group(1)),
            "vli_winter": float(must_find(
                r"Winter\s*(\d+)", page1, "VLI winter limit").group(1)),
            "benzene_max": float(must_find(
                r"Benzene percent by Volume,?\s*Max\s*(\d+(?:\.\d+)?)",
                page2, "benzene max").group(1)),
            "olefins_max": float(must_find(
                r"Olefin Content,?\s*percent by volume,?\s*Max\s*(\d+(?:\.\d+)?)",
                page2, "olefins max").group(1)),
            "aromatics_max": float(must_find(
                r"Aromatic Content,?\s*percent by volume,?\s*Max\s*(\d+(?:\.\d+)?)",
                page2, "aromatics max").group(1)),
        }
    except ValueError as exc:
        fail("spec_incompatible", [str(exc)])
    with open(doc_path, "rb") as handle:
        digest = hashlib.sha256(handle.read()).hexdigest()
    return doc, spec, digest


def check_min(value, minimum):
    return "PASS" if value >= minimum else "FAIL", value - minimum


def check_max(value, maximum):
    return "PASS" if value <= maximum else "FAIL", maximum - value


def check_range(value, low, high):
    if low <= value <= high:
        return "PASS", min(value - low, high - value)
    return "FAIL", (value - low) if value < low else (high - value)


def fmt_num(value):
    """Compact number formatting for spec strings and margins."""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    text = ("%.4f" % value).rstrip("0").rstrip(".")
    return text if text else "0"


def run(sample, spec):
    """Evaluate one sample against parsed limits. Returns (rows, warnings, assumptions)."""
    rows, warnings, assumptions = [], [], []
    values = {}

    params = sample.get("params", {})
    if isinstance(params, list):
        # Array form (tool schema): [{name, value, unit}] -> keyed dict.
        merged = {}
        for entry in params:
            if not isinstance(entry, dict) or not isinstance(entry.get("name"), str):
                fail("bad_request", ["params array entries need {name, value, unit}"])
            key = entry["name"].lower()
            if key in merged:
                fail("bad_request", ["duplicate parameter %r" % key])
            merged[key] = {"value": entry.get("value"), "unit": entry.get("unit")}
        params = merged
    if not isinstance(params, dict):
        fail("bad_request", ["'params' must be an object keyed by parameter name, or an array of {name, value, unit}"])
    lowered = {str(key).lower(): entry for key, entry in params.items()}
    for key in lowered:
        if key not in KNOWN_PARAMS:
            fail("unknown_parameter",
                 ["unknown parameter %r; known: %s" % (key, ", ".join(KNOWN_PARAMS))])
    for key in KNOWN_PARAMS:
        if key not in lowered:
            cite = CITATIONS[key]
            rows.append({"parameter": key, "specification": "see DOC-010",
                         "lab_value": None, "unit": None, "margin": None,
                         "verdict": "NA", "method": cite["method"],
                         "citation": "DOC-010 p.%d" % cite["page"],
                         "reason": "not supplied in sample input"})
            continue
        entry = lowered[key] or {}
        value = entry.get("value", None)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            fail("bad_request", ["parameter %r needs a numeric 'value'" % key])
        unit = str(entry.get("unit", "") or "").strip().lower()
        if unit not in UNIT_ALIASES[key]:
            fail("unit_mismatch",
                 ["unit %r is not accepted for parameter %r; accepted units: %s"
                  % (entry.get("unit", ""), key,
                     ", ".join(sorted(UNIT_ALIASES[key]) or ["(unitless)"]))])
        values[key] = float(value)
        if key == "sulphur" and unit == "ppm":
            assumptions.append("sulphur reported as ppm treated as mg/kg equivalent")

    def row(key, label, spec_text, unit, verdict, margin, reason=None):
        cite = CITATIONS[key]
        item = {"parameter": label, "specification": spec_text,
                "lab_value": values.get(key), "unit": unit,
                "margin": (None if margin is None else round(margin, 4)),
                "verdict": verdict, "method": cite["method"],
                "citation": "DOC-010 p.%d" % cite["page"]}
        if reason:
            item["reason"] = reason
        rows.append(item)

    if "ron" in values:
        verdict, margin = check_min(values["ron"], spec["ron_min"])
        row("ron", "RON", "Min %s" % fmt_num(spec["ron_min"]), "number", verdict, margin)
    if "mon" in values:
        verdict, margin = check_min(values["mon"], spec["mon_min"])
        row("mon", "MON", "Min %s" % fmt_num(spec["mon_min"]), "number", verdict, margin)
    if "density" in values:
        verdict, margin = check_range(values["density"], spec["density_lo"], spec["density_hi"])
        row("density", "Density at 15 C",
            "%s-%s" % (fmt_num(spec["density_lo"]), fmt_num(spec["density_hi"])),
            "kg/m3", verdict, margin)
    if "e70" in values:
        verdict, margin = check_range(values["e70"], spec["e70_lo"], spec["e70_hi"])
        row("e70", "E70 (recovery up to 70 C)",
            "%s-%s" % (fmt_num(spec["e70_lo"]), fmt_num(spec["e70_hi"])),
            "vol%", verdict, margin)
    if "sulphur" in values:
        verdict, margin = check_max(values["sulphur"], spec["sulphur_max"])
        row("sulphur", "Sulphur, total",
            "Max %s" % fmt_num(spec["sulphur_max"]), "mg/kg", verdict, margin)
    if "rvp" in values:
        verdict, margin = check_max(values["rvp"], spec["rvp_max"])
        row("rvp", "RVP at 38 C",
            "Max %s" % fmt_num(spec["rvp_max"]), "kPa", verdict, margin)
    if "benzene" in values:
        verdict, margin = check_max(values["benzene"], spec["benzene_max"])
        row("benzene", "Benzene",
            "Max %s" % fmt_num(spec["benzene_max"]), "vol%", verdict, margin)
    if "olefins" in values:
        verdict, margin = check_max(values["olefins"], spec["olefins_max"])
        row("olefins", "Olefins",
            "Max %s" % fmt_num(spec["olefins_max"]), "vol%", verdict, margin)
    if "aromatics" in values:
        verdict, margin = check_max(values["aromatics"], spec["aromatics_max"])
        row("aromatics", "Aromatics",
            "Max %s" % fmt_num(spec["aromatics_max"]), "vol%", verdict, margin)

    # VLI is DERIVED: VLI = 10*RVP + 7*E70, limit depends on season.
    if "rvp" in values and "e70" in values:
        vli = 10.0 * values["rvp"] + 7.0 * values["e70"]
        limit = spec["vli_summer"] if sample["season"] == "summer" else spec["vli_winter"]
        verdict = "PASS" if vli <= limit else "FAIL"
        cite = CITATIONS["vli"]
        rows.append({"parameter": "VLI",
                     "specification": "Max %s (%s)" % (fmt_num(limit), sample["season"]),
                     "lab_value": round(vli, 4), "unit": "index",
                     "margin": round(limit - vli, 4), "verdict": verdict,
                     "method": cite["method"],
                     "citation": "DOC-010 p.%d" % cite["page"]})
    else:
        cite = CITATIONS["vli"]
        rows.append({"parameter": "VLI", "specification": "Max (season)",
                     "lab_value": None, "unit": "index", "margin": None,
                     "verdict": "NA", "method": cite["method"],
                     "citation": "DOC-010 p.%d" % cite["page"],
                     "reason": "VLI requires both RVP and E70 (VLI = 10*RVP + 7*E70)"})
        warnings.append("VLI not evaluated: supply RVP and E70 to compute it")

    assumptions.append("RVP specification value '60' read as Max kPa per DOC-010 table convention")
    order = ["RON", "MON", "Density at 15 C", "E70 (recovery up to 70 C)",
             "Sulphur, total", "RVP at 38 C", "Benzene", "Olefins",
             "Aromatics", "VLI"]
    return sorted(rows, key=lambda item: order.index(item["parameter"])
                  if item["parameter"] in order else 99), warnings, assumptions


def main(argv):
    doc_path = os.environ.get("DOC010_PATH", "") or default_doc_path()
    input_path, out_path = None, None
    rest = []
    for token in argv[1:]:
        if token == "--doc" and rest is not None:
            rest.append(token)
        else:
            rest.append(token)
    # Minimal flag parsing: [--doc PATH] [--out PATH] INPUT
    args, positional = [], []
    skip = False
    idx = 0
    while idx < len(rest):
        token = rest[idx]
        if skip:
            skip = False
        elif token == "--doc":
            doc_path = rest[idx + 1]; idx += 1
        elif token == "--out":
            out_path = rest[idx + 1]; idx += 1
        else:
            positional.append(token)
        idx += 1
    input_path = positional[0] if positional else None
    if not input_path:
        fail("bad_request", ["usage: mrpl_spec_check.py INPUT.json [--doc DOC-010.json] [--out RESULT.json]"])
    if input_path == "-":
        try:
            sample = json.load(sys.stdin)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            fail("bad_request", ["stdin unreadable: %s" % exc])
    else:
        try:
            with open(input_path, "r", encoding="utf-8") as handle:
                sample = json.load(handle)
        except (json.JSONDecodeError, UnicodeDecodeError, OSError) as exc:
            fail("bad_request", ["input unreadable: %s" % exc])
    if not isinstance(sample, dict):
        fail("bad_request", ["input root must be a JSON object"])
    sample_id = sample.get("sample_id", "")
    if not isinstance(sample_id, str) or not sample_id.strip():
        fail("bad_request", ["'sample_id' must be a non-empty string"])
    season = str(sample.get("season", "") or "").strip().lower()
    if season not in ("summer", "winter"):
        fail("missing_season",
             ["'season' must be 'summer' or 'winter' (VLI limit is season-dependent)"])

    doc, spec, digest = load_spec(doc_path)
    rows, warnings, assumptions = run({"season": season,
                                      "params": sample.get("params", {})}, spec)
    verdicts = [item["verdict"] for item in rows]
    result = {
        "sample_id": sample_id.strip(),
        "spec_id": "DOC-010",
        "spec_title": doc.get("title", ""),
        "season": season,
        "rows": rows,
        "summary": {"pass": verdicts.count("PASS"), "fail": verdicts.count("FAIL"),
                    "na": verdicts.count("NA"),
                    "overall": "FAIL" if "FAIL" in verdicts else "PASS"},
        "warnings": warnings,
        "assumptions": assumptions,
        "errors": [],
        "provenance": {"source": os.path.abspath(doc_path),
                       "source_hash": "sha256:%s" % digest,
                       "tool_version": TOOL_VERSION},
    }
    text = json.dumps(result, indent=2)
    if out_path:
        with open(out_path, "w", encoding="utf-8") as handle:
            handle.write(text + "\n")
    print(text)


if __name__ == "__main__":
    main(sys.argv)
