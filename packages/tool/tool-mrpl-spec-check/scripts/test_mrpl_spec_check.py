#!/usr/bin/env python3
"""Independent acceptance tests for mrpl_spec_check.py (stdlib only).

Run:  py test_mrpl_spec_check.py [--doc DOC-010.json]
Covers: demo vector (sulphur+VLI FAIL), normal PASS, unknown parameter,
unit mismatch, missing season, malformed JSON, DOC-010 missing/corrupt,
missing RVP/E70 -> VLI NA.
"""

import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "mrpl_spec_check.py")
DEFAULT_DOC = os.path.normpath(os.path.join(
    HERE, "..", "..", "..", "..", "..",
    "refinery-corpus", "corpus", "processed", "DOC-010.json"))

DOC = DEFAULT_DOC
for idx, token in enumerate(sys.argv[1:]):
    if token == "--doc":
        DOC = sys.argv[idx + 2]

PASS_COUNT = 0


def check(name, cond, detail=""):
    global PASS_COUNT
    status = "ok" if cond else "FAIL"
    print("[%s] %s %s" % (status, name, detail))
    if not cond:
        raise SystemExit("acceptance FAILED at: %s %s" % (name, detail))
    PASS_COUNT += 1


def run_py(input_obj=None, raw=None, doc=DOC, extra_args=()):
    """Run the checker; return (exit_code, parsed_stdout_or_text)."""
    with tempfile.TemporaryDirectory() as tmp:
        if raw is not None:
            path = os.path.join(tmp, "in.json")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write(raw)
        else:
            path = os.path.join(tmp, "in.json")
            with open(path, "w", encoding="utf-8") as handle:
                json.dump(input_obj, handle)
        proc = subprocess.run(
            [sys.executable, SCRIPT, path, "--doc", doc] + list(extra_args),
            capture_output=True, text=True, timeout=60)
        try:
            return proc.returncode, json.loads(proc.stdout)
        except json.JSONDecodeError:
            return proc.returncode, proc.stdout


def demo_input(**overrides):
    params = {
        "RON": {"value": 93.0, "unit": "number"},
        "MON": {"value": 84.0, "unit": "number"},
        "density": {"value": 745, "unit": "kg/m3"},
        "sulphur": {"value": 55, "unit": "mg/kg"},
        "benzene": {"value": 0.6, "unit": "vol%"},
        "RVP": {"value": 55, "unit": "kPa"},
        "E70": {"value": 30, "unit": "vol%"},
        "olefins": {"value": 10, "unit": "vol%"},
        "aromatics": {"value": 30, "unit": "vol%"},
    }
    sample = {"sample_id": "S-001", "season": "summer", "params": params}
    for key, value in overrides.items():
        if key == "season":
            sample["season"] = value
        elif key == "drop":
            for name in value:
                params.pop(name, None)
        else:
            params[key] = value
    return sample


def by_param(result, name):
    for row in result["rows"]:
        if row["parameter"].lower().startswith(name.lower()):
            return row
    raise AssertionError("row %r missing" % name)


# A. Demo vector -----------------------------------------------------------
code, res = run_py(demo_input())
check("A.exit", code == 0, "exit=%r" % code)
check("A.spec", res["spec_id"] == "DOC-010" and res["season"] == "summer")
check("A.sulphur", by_param(res, "sulphur")["verdict"] == "FAIL")
check("A.sulphur-margin", by_param(res, "sulphur")["margin"] == -5,
      "margin=%r" % by_param(res, "sulphur")["margin"])
check("A.vli", by_param(res, "VLI")["verdict"] == "FAIL")
check("A.vli-value", by_param(res, "VLI")["lab_value"] == 760.0,
      "vli=%r" % by_param(res, "VLI")["lab_value"])
check("A.vli-margin", by_param(res, "VLI")["margin"] == -10)
for name in ("RON", "MON", "Density", "E70", "RVP", "Benzene", "Olefins", "Aromatics"):
    check("A.pass-%s" % name, by_param(res, name)["verdict"] == "PASS")
check("A.summary", res["summary"] == {"pass": 8, "fail": 2, "na": 0, "overall": "FAIL"},
      json.dumps(res["summary"]))
check("A.citations", all(row["citation"].startswith("DOC-010 p.") and row["method"]
                         for row in res["rows"]))
check("A.provenance", res["provenance"]["source_hash"].startswith("sha256:")
      and res["provenance"]["tool_version"] == "1.0.0")

# B. Normal PASS vector (winter, clean values) ------------------------------
clean = demo_input(season="winter", sulphur={"value": 40, "unit": "mg/kg"},
                   RVP={"value": 50, "unit": "kPa"},
                   E70={"value": 25, "unit": "vol%"})
code, res = run_py(clean)
check("B.exit", code == 0)
check("B.overall", res["summary"]["overall"] == "PASS", json.dumps(res["summary"]))
check("B.vli", by_param(res, "VLI")["lab_value"] == 675.0)

# C. Unknown parameter ------------------------------------------------------
bad = demo_input()
bad["params"]["octane_boost"] = {"value": 5, "unit": "number"}
code, res = run_py(bad)
check("C.exit", code == 2, "exit=%r" % code)
check("C.code", res.get("code") == "unknown_parameter", json.dumps(res)[:160])

# D. Unit mismatch -----------------------------------------------------------
bad = demo_input(density={"value": 745, "unit": "g/ml"})
code, res = run_py(bad)
check("D.exit", code == 2)
check("D.code", res.get("code") == "unit_mismatch", json.dumps(res)[:160])

# E. Missing season ----------------------------------------------------------
bad = demo_input()
del bad["season"]
code, res = run_py(bad)
check("E.exit", code == 2)
check("E.code", res.get("code") == "missing_season", json.dumps(res)[:160])

# F. Malformed JSON ----------------------------------------------------------
code, res = run_py(raw='{"sample_id": "S-001", broken')
check("F.exit", code == 2, "exit=%r" % code)

# G. DOC-010 missing / corrupt ------------------------------------------------
code, res = run_py(demo_input(), doc=os.path.join(HERE, "no-such-doc.json"))
check("G.missing", code == 2 and res.get("code") == "spec_unavailable")
with tempfile.TemporaryDirectory() as tmp:
    corrupt = os.path.join(tmp, "corrupt.json")
    with open(corrupt, "w", encoding="utf-8") as handle:
        handle.write('{"document_id": "DOC-010", broken')
    code, res = run_py(demo_input(), doc=corrupt)
    check("G.corrupt", code == 2 and res.get("code") == "spec_unavailable")
with tempfile.TemporaryDirectory() as tmp:
    wrong = os.path.join(tmp, "wrong.json")
    with open(wrong, "w", encoding="utf-8") as handle:
        json.dump({"document_id": "DOC-999", "title": "other",
                   "page_text": [{"page": 1, "text": "x"}]}, handle)
    code, res = run_py(demo_input(), doc=wrong)
    check("G.identity", code == 2 and res.get("code") == "spec_incompatible",
          json.dumps(res)[:200])

# H. Missing RVP/E70 -> VLI NA ----------------------------------------------
code, res = run_py(demo_input(drop=("RVP", "E70")))
check("H.exit", code == 0, "exit=%r" % code)
vli = by_param(res, "VLI")
check("H.na", vli["verdict"] == "NA" and "RVP" in vli.get("reason", ""),
      json.dumps(vli)[:200])

print("\nALL %d ACCEPTANCE CHECKS PASSED" % PASS_COUNT)
