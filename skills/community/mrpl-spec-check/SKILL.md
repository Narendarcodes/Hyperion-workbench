---
name: mrpl-spec-check
description: Closed-world MRPL MG 91 gasoline spec compliance check against DOC-010. Parses sample lab values, runs the deterministic mrpl_spec_check tool, presents PASS/FAIL/NA with DOC-010 citations, and gates the XLSX report on engineer approval.
version: 1.0.0
---

# mrpl-spec-check Skill

Perform a MRPL MG 91 (BS-IV, IS 2796:2008 Amd.1) specification compliance
check for ONE sample. DOC-010 is the ONLY specification authority. The
sample lab values are DEMO INPUT unless stated otherwise.

## 1. Trigger

Activate when the user asks for a gasoline/MG 91/spec check against DOC-010,
e.g. "Run a spec check on sample S-001 against MRPL MG 91 (DOC-010)".

## 2. Closed-world rules (never break these)

- NEVER invent specification limits, formulas, methods, or citations.
  Every number in the result table comes from the `mrpl_spec_check` tool.
- NEVER compute limits or VLI mentally. Always call `mrpl_spec_check`.
- Copy `method` and `citation` strings from tool rows VERBATIM.
- Unknown parameter, unit mismatch, or missing season = report the tool
  error and STOP. Do not guess.
- Label every output: `Sample <id> — demo input, not a refinery certificate.`

## 3. Turn 1 — analysis (no report in this turn)

1. `todo_write` exactly these 8 todos (status discipline: one `in_progress`
   at a time, mark `completed` only AFTER the step really happened):
   `Understanding request`, `Loading MRPL specification`,
   `Validating sample inputs`, `Running spec check`, `Calculating VLI`,
   `Preparing results`, `Waiting for review`, `Generating report`.
2. Parse sample_id, season (`summer` selects VLI limit 750, `winter` 950),
   and the 9 lab values from the user message.
3. NEVER author the tool JSON by hand. Copy this LOCKED template exactly,
   changing ONLY the nine `value` fields (and `season` if the user says
   winter). Never touch `name` or `unit`:

   ```json
   {"sample_id": "S-001", "season": "summer", "params": [
     {"name": "ron", "value": 93.0, "unit": "number"},
     {"name": "mon", "value": 84.0, "unit": "number"},
     {"name": "density", "value": 745, "unit": "kg/m3"},
     {"name": "sulphur", "value": 55, "unit": "mg/kg"},
     {"name": "benzene", "value": 0.6, "unit": "vol%"},
     {"name": "rvp", "value": 55, "unit": "kPa"},
     {"name": "e70", "value": 30, "unit": "vol%"},
     {"name": "olefins", "value": 10, "unit": "vol%"},
     {"name": "aromatics", "value": 30, "unit": "vol%"}
   ]}
   ```
4. Call `mrpl_spec_check` with the edited block. If the session cwd is a
   configured `inputDirs` root you may instead save the block as
   `<session-cwd>/S-001.input.json` (values only edited) and pass
   `input_path` — same result, zero authoring.
4. Advance the todos as each step completes (`Generating report` stays
   `pending` — the report is NOT generated in this turn).
5. Present the result with heading `MRPL MG 91 Compliance Check`,
   the demo-input label, and EXACTLY this GFM table header:

   | Parameter | Specification | Lab Value | Unit | Margin | Verdict | Method | Citation |

   One row per tool row, in tool order. Mark FAIL verdicts bold
   (`**FAIL**`). Copy Method/Citation verbatim from the tool.
6. Then post the review block:

   **Review Required** — <N> parameters failed:
   - `<param>: <lab_value> <unit> > <spec>` (one line per FAIL row)
   - Source: DOC-010 — MRPL MG 91 specification

   Ask the engineer to reply with exactly one of:
   - `Approve & Generate Report`
   - `Correct Inputs: <param>=<value> <unit>, ...`

7. END THE TURN. Never call `mrpl_generate_report` in the analysis turn.

## 4. Correction (same session, no restart)

On `Correct Inputs: ...`: call ONLY `mrpl_spec_check` again with the
corrected values (keep all other values), re-render the table, re-post the
review block. Previous history is the audit trail — do not restart.

## 5. Turn 2 — approval-gated report (only after the approval message)

1. Verify the immediately preceding engineer message is
   `Approve & Generate Report`. Without it, do nothing except re-ask.
2. Call `mrpl_generate_report` with the SAME sample inputs plus:
   `approved_by` = engineer identifier (e.g. `engineer (chat approval)`),
   `approval_note` = short quote of the approval message,
   `out_path` = `<session-cwd>/S-001_MG91_Compliance.xlsx`
   (use the session working directory for `<session-cwd>`).
   The tool re-runs the checker itself and refuses without an approver.
3. Mark the `Generating report` todo `completed` only after the tool
   returns `out_path`.
4. Deliver the file with the EXISTING chat attachment path:
   copy the XLSX via shell to the Studio uploads directory
   (`Join-Path $HOME '.hermes/hermes3d/uploads'`, filename
   `S-001_MG91_Compliance.xlsx`, byte-preserving copy; if the copy is
   denied, retry once with the `workspace-write` permission scope),
   then post: `Compliance report ready — [Open XLSX Report](/api/files/S-001_MG91_Compliance.xlsx)`.
5. On rejection (`Reject ...` or any non-approval reply): generate NOTHING,
   record the rejection in chat, offer correction.

## 6. Forbidden

Model Router / Sovereignty / Agent Runs / Trajectory changes, new
Simulation screens, new approval frameworks, PDF output, second use cases,
office redesign, frontend redesign. This skill does the spec check only.
