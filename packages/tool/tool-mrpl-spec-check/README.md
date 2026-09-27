# @deepseek-ai/dsh-tool-mrpl-spec-check

MRPL MG 91 gasoline spec compliance tools over the real DOC-010 corpus file
(`refinery-corpus/corpus/processed/DOC-010.json`). Two model-facing tools:

- `mrpl_spec_check` — deterministic check of one sample; limits are parsed
  from DOC-010 page text at runtime, VLI = 10×RVP + 7×E70 per DOC-010.
- `mrpl_generate_report` — approval-gated XLSX builder. Refuses without a
  non-empty `approved_by` and re-runs the checker internally, so workbook
  bytes are deterministic and never model-authored.

Python (`scripts/`) is stdlib-only except `mrpl_to_xlsx.py`, which needs
`openpyxl` (`py -m pip install openpyxl`). The spawn is bounded (timeout,
output cap, cwd jailed to `scripts/`, fixed argv, no network in the scripts).

## Known Limitations and Deferred Work

- No `./invariant`: the tools expose no cross-observation relation that can
  diverge; correctness is pinned by `tests/loader-composition.spec.ts` and
  the Python acceptance suite (`scripts/test_mrpl_spec_check.py`).
- The approval gate is workflow-level (skill requires an explicit engineer
  approval message before calling `mrpl_generate_report`; the tool refuses
  without `approved_by`). dsh-native modal approval is not bridged to Studio,
  so the transcript is the audit record.
