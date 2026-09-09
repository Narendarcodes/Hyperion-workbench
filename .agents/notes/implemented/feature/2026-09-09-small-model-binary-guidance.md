# Agent Note: Small-model binary-file guidance

Status: implemented

## Problem

The local small-model route (`qwen3.5:4b` via Ollama) fails the same way on binary inputs: it calls `read` on PDFs, Office documents, spreadsheets, and images, receives `FS_NOT_TEXT` with no actionable next step, invents unlisted tool names, and runs multi-line Python through inline `python -c` with nested quotes that break shell parsing.

## Decision

The base bundle sets an `Execution Rules` `personaPrefix`: only listed tools, write-Python-to-file before `pwsh`/`bash` execution, no inline `python -c`, and no direct `read` on binaries (`read_image` for images, extraction scripts with pymupdf/pypdf, python-docx, pandas/openpyxl for documents and spreadsheets).

`dsh-fs-local` appends the same per-extension remedy to every `FS_NOT_TEXT` rejection, on both the NUL-byte binary path and the invalid-UTF-8 path, across `readWholeText`, `streamWholeText`, and `readForEdit`. The extension comes from the path basename, case-insensitively; unknown or missing extensions keep the bare message. Error codes are unchanged, so callers still branch on `FS_NOT_TEXT`.

## Alternatives considered

**Persona prefix only, no error hints.** The prefix states the rules once, but a small model that already called `read` on a binary never sees them again at the failure point. The in-error remedy meets the model where the mistake surfaces.

**Error hints only, no persona prefix.** Hints fix recovery but not prevention: the model still invents tool names and inline-Python invocations on the first attempt. The prefix constrains the attempt; the hint repairs the miss.

**A dedicated binary-extraction tool.** A new tool would add a capability seam (definition, provider, consumer) for behavior the existing `write`+`pwsh`/`bash` composition already covers. The hint reuses that composition instead of growing the tool roster.

## Consequences

Small-model turns on binary inputs cost one failed `read` plus a guided retry instead of an unrecoverable loop. The base system prompt grows by three rules on every profile; large models pay a small context tax for guardrails aimed at the small route. Hint text names third-party libraries the harness does not install, so offline or minimal hosts can still hit a missing-dependency failure after following the remedy.

## Testing

`packages/fs/fs-local/tests/fsio.spec.ts` pins each hint (pdf, doc/docx, xls/xlsx, png/jpg/gif, uppercase, no-extension) and the basename-over-parent-directory extraction, plus the shared remedy across whole-read, streamed-read, and read-for-edit NUL paths.
