---
name: hyperion-rag
description: Answer questions from the indexed plant documents (SOPs, fault logs, equipment manuals, incident reports, permits, specs) with verified page-level citations. Load before calling hyperion_rag_answer or hyperion_rag_search. Covers when to search vs answer, how to present citations for the PDF viewer, and the abstention rule.
version: 1.0.0
---

# hyperion-rag Skill

## 1. Trigger

Any question whose answer should come from plant documents: part numbers,
torque values, procedure steps, alarm set points, incident causes,
permit requirements, spec limits, "what does DOC-xxx say about …".

## 2. Rules (never break these)

- Answer ONLY from tool output. Never fill a gap from general knowledge.
- If `hyperion_rag_answer` returns `abstain: true`, say plainly that the
  indexed documents do not contain the answer and, if useful, what was
  searched. Do not guess.
- Keep every citation the tool returns. Paste the tool's `markdown` (answer
  text plus `[^n]` footnotes) as-is so the citation viewer can open the page.
- Never edit a quote, page number or document id.

## 3. Flow

1. Single fact or short answer: call `hyperion_rag_answer` with the user's
   question verbatim.
2. Multi-document brief, gap analysis or checklist: call
   `hyperion_rag_answer` with `report: true`. Present claims as a list with
   their footnotes, then the "Not established by the corpus" items.
3. Exploration ("which documents mention X?"): call `hyperion_rag_search`
   and list doc id + page for each hit.
4. If the tool reports `degraded`, mention that retrieval ran in reduced
   (keyword-only) mode.
