/**
 * MRPL MG 91 spec compliance tools (DOC-010 closed world).
 *
 * Two model-facing tools over one deterministic Python job:
 * - `mrpl_spec_check`: validate sample inputs, run the checker, return rows.
 * - `mrpl_generate_report`: approval-gated deterministic XLSX builder. It
 *   re-runs the checker itself and refuses without an engineer approver, so
 *   the workbook bytes can never come from model-authored data.
 *
 * Python is spawned with no network, a fixed argv, cwd jailed to this
 * package's scripts dir, and a bounded timeout/output cap. Named exports
 * preserve loader injection metadata.
 * @module @deepseek-ai/dsh-tool-mrpl-spec-check
 */

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { delimiter, dirname, join, resolve, sep } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {
  ArrayValueSchemaSpec,
  InferValue,
  ObjectValueSchemaSpec,
} from '@deepseek-ai/dsh-tools'

export const name = 'tool-mrpl-spec-check'
export const inject = ['tools']

/** Deployment-owned execution choices (validated config, never constants). */
export interface Config {
  /** Python launcher argv[0] (`py` on Windows, `python3` elsewhere). */
  readonly python: string
  /** Absolute DOC-010 JSON path. Defaults to the repo corpus file. */
  readonly docPath: string
  /** Per-invocation ceiling in milliseconds. */
  readonly timeoutMs: number
  /** Stdout/stderr ceiling in bytes. */
  readonly maxOutputBytes: number
  /** Allowed roots for `input_path` sample files. Empty disables file input. */
  readonly inputDirs: string[]
}

const HERE = dirname(fileURLToPath(import.meta.url))
const SCRIPTS_DIR = resolve(HERE, '..', 'scripts')
const CHECK_SCRIPT = join(SCRIPTS_DIR, 'mrpl_spec_check.py')
const XLSX_SCRIPT = join(SCRIPTS_DIR, 'mrpl_to_xlsx.py')
const DEFAULT_DOC = resolve(HERE, '..', '..', '..', '..', '..',
  'refinery-corpus', 'corpus', 'processed', 'DOC-010.json')

export const Config: z<Config> = z.object({
  python: z.string().min(1).default(process.platform === 'win32' ? 'py' : 'python3'),
  docPath: z.string().min(1).default(DEFAULT_DOC),
  timeoutMs: z.number().step(1).min(1000).max(120000).default(30000),
  maxOutputBytes: z.number().step(1).min(4096).max(8_194_304).default(262144),
  inputDirs: z.array(z.string().min(1)).default([]),
})

export const DEFAULT_CONFIG: Config = {
  python: process.platform === 'win32' ? 'py' : 'python3',
  docPath: DEFAULT_DOC,
  timeoutMs: 30000,
  maxOutputBytes: 262144,
  inputDirs: [],
}

const PARAM_NAMES = ['ron', 'mon', 'density', 'sulphur', 'benzene', 'rvp', 'e70', 'olefins', 'aromatics'] as const

/** Sample lab values as an order-preserving array (avoids case-sensitive key issues). */
function paramsSchema(optional: boolean): ArrayValueSchemaSpec & { required?: true } {
  return {
    type: 'array',
    ...optional ? {} : { required: true as const },
    description: 'Sample lab values, one entry per parameter.',
    items: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: {
          type: 'string', required: true, enum: [...PARAM_NAMES],
          description: 'Parameter key (lowercase): ron, mon, density, sulphur, benzene, rvp, e70, olefins, aromatics.',
        },
        value: { type: 'number', required: true, description: 'Lab measurement.' },
        unit: { type: 'string', required: true, description: 'Unit as reported, e.g. kg/m3, mg/kg, vol%, kPa.' },
      },
    },
  }
}

const ROW_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  properties: {
    parameter: { type: 'string', required: true },
    specification: { type: 'string', required: true },
    lab_value: { type: 'number' },
    unit: { type: 'string' },
    margin: { type: 'number' },
    verdict: { type: 'string', required: true, enum: ['PASS', 'FAIL', 'NA'] },
    method: { type: 'string', required: true },
    citation: { type: 'string', required: true },
  },
} as const satisfies ObjectValueSchemaSpec

const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  properties: {
    sample_id: { type: 'string', required: true },
    spec_id: { type: 'string', required: true },
    season: { type: 'string', required: true },
    rows: { type: 'array', required: true, items: ROW_SCHEMA },
    summary: {
      type: 'object', required: true, additionalProperties: true,
      properties: {
        pass: { type: 'integer', required: true },
        fail: { type: 'integer', required: true },
        na: { type: 'integer', required: true },
        overall: { type: 'string', required: true, enum: ['PASS', 'FAIL'] },
      },
    },
  },
} as const satisfies ObjectValueSchemaSpec

const REPORT_RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  properties: {
    out_path: { type: 'string', required: true },
    overall: { type: 'string', required: true },
    rows: { type: 'integer', required: true },
  },
} as const satisfies ObjectValueSchemaSpec

interface RunFailure extends Error {
  readonly stdout: string
  readonly stderr: string
}

/** Resolve a launcher name to an absolute .exe without relying on PATHEXT/shell search. */
function resolvePython(configured: string): string {
  const candidates = [configured]
  for (const fallback of ['python3', 'python', 'py']) {
    if (!candidates.includes(fallback)) candidates.push(fallback)
  }
  const pathDirs = (process.env['PATH'] ?? '').split(delimiter).filter(dir => dir.length > 0)
  for (const name of candidates) {
    if (/[\\/]/.test(name) || name.toLowerCase().endsWith('.exe')) {
      if (existsSync(name)) return resolve(name)
      const withExe = name.toLowerCase().endsWith('.exe') ? name : `${name}.exe`
      if (existsSync(withExe)) return resolve(withExe)
      continue
    }
    for (const dir of pathDirs) {
      const hit = join(dir, `${name}.exe`)
      if (existsSync(hit)) return hit
    }
  }
  throw new Error(
    'mrpl python job: no Python interpreter found (tried '
    + `${candidates.join(', ')} on PATH); set the tool config 'python' to an absolute path`,
  )
}
/** Resolve an `input_path` sample file inside the configured roots (fail closed). */
function resolveInputFile(inputPath: unknown, inputDirs: string[]): string {
  if (typeof inputPath !== 'string' || inputPath.trim().length === 0) {
    throw new Error('mrpl input_path must be a non-empty path to a sample JSON file')
  }
  if (inputDirs.length === 0) {
    throw new Error('mrpl input_path refused: no inputDirs configured on the tool')
  }
  const target = resolve(inputPath.trim())
  const inside = inputDirs.some((root) => {
    const base = resolve(root)
    return target === base || target.startsWith(base + sep)
  })
  if (!inside) throw new Error(`mrpl input_path refused: ${target} is outside the configured inputDirs`)
  if (!existsSync(target)) throw new Error(`mrpl input_path not found: ${target}`)
  return target
}

/** Spawn the checker (or builder) with bounded time/output; throw on any failure. */
function runPython(python: string, args: readonly string[], stdin: string,
  timeoutMs: number, maxOutputBytes: number): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let launcher: string
    try {
      launcher = resolvePython(python)
    } catch (error) {
      reject(error)
      return
    }
    const child = execFile(launcher, [...args], {
      cwd: SCRIPTS_DIR,
      timeout: timeoutMs,
      maxBuffer: maxOutputBytes,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error) {
        const failure = new Error(
          `mrpl python job failed: ${error.message}; exe=${launcher}; cwd=${SCRIPTS_DIR}; script=${args[0]}; stderr: ${String(stderr).slice(0, 2000)}; stdout: ${String(stdout).slice(0, 2000)}`,
        ) as RunFailure
        reject(failure)
        return
      }
      resolvePromise(String(stdout))
    })
    if (child.stdin) {
      child.stdin.write(stdin)
      child.stdin.end()
    }
  })
}

function parseResult(stdout: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout)
  } catch {
    throw new Error(`mrpl python job returned non-JSON output: ${stdout.slice(0, 500)}`)
  }
  if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as { rows?: unknown }).rows)) {
    throw new Error('mrpl python job returned an unexpected shape (missing rows[])')
  }
  return parsed as Record<string, unknown>
}

/**
 * Register `mrpl_spec_check` and `mrpl_generate_report` on `ctx.tools`.
 * @param ctx - registrant context carrying the tool registry.
 * @param config - deployment execution choices.
 */
export function apply(ctx: Context, config: Config): void {
  // Loader may deliver a partial config; deployment defaults always win missing keys.
  const cfg: Config = { ...DEFAULT_CONFIG, ...config }
  ctx.tools.register(defineTool({
    name: 'mrpl_spec_check',
    description: 'Check one gasoline sample against the MRPL MG 91 specification (DOC-010). '
      + 'If this is your first call for a spec check, load the `mrpl-spec-check` skill first and follow it. '
      + 'Deterministic: limits are parsed from DOC-010 at runtime, VLI = 10*RVP + 7*E70. '
      + 'Prefer `input_path` (a prebuilt sample JSON you only edit values in) over inline params; '
      + 'never compute limits or VLI by hand.',
    parameters: {
      sample_id: { type: 'string', description: 'Sample identifier, e.g. S-001. Required unless input_path is given.' },
      season: { type: 'string', enum: ['summer', 'winter'], description: 'Season selects the VLI limit (750 summer / 950 winter). Required unless input_path is given.' },
      params: paramsSchema(true),
      input_path: { type: 'string', description: 'Absolute path to a prebuilt sample JSON file (same shape as the inline input). Overrides inline fields.' },
    },
    output: {
      schema: RESULT_SCHEMA,
      render: (_args, value) => {
        const summary = (value as { summary?: { pass?: unknown; fail?: unknown; na?: unknown; overall?: unknown } }).summary ?? {}
        return [{ type: 'text', text: `MRPL MG 91 check: ${String(summary.pass ?? '?')} pass, ${String(summary.fail ?? '?')} fail, ${String(summary.na ?? '?')} NA — overall ${String(summary.overall ?? '?')}.` }]
      },
    },
    async execute(args) {
      const file = typeof args.input_path === 'string' && args.input_path.trim()
        ? resolveInputFile(args.input_path, cfg.inputDirs)
        : null
      if (file === null && (typeof args.sample_id !== 'string' || typeof args.season !== 'string' || args.params === undefined)) {
        throw new Error('mrpl_spec_check needs input_path or all of sample_id, season, params')
      }
      const stdout = await runPython(cfg.python,
        [CHECK_SCRIPT, file ?? '-', '--doc', cfg.docPath],
        file === null ? JSON.stringify({ sample_id: args.sample_id, season: args.season, params: args.params }) : '',
        cfg.timeoutMs, cfg.maxOutputBytes)
      return parseResult(stdout) as InferValue<typeof RESULT_SCHEMA>
    },
    presentCall: () => ({ card: 'generic', title: 'Run MRPL MG 91 spec check', kind: 'other', rawInput: {} }),
  }))

  ctx.tools.register(defineTool({
    name: 'mrpl_generate_report',
    description: 'Build the final S-001_MG91_Compliance.xlsx from a checked sample. '
      + 'APPROVAL GATE: call only after the engineer explicitly approved report generation '
      + 'in chat; pass their name in approved_by. Refuses without an approver. '
      + 'Re-runs the checker internally, so workbook data is deterministic.',
    parameters: {
      sample_id: { type: 'string', description: 'Sample identifier, e.g. S-001. Required unless input_path is given.' },
      season: { type: 'string', enum: ['summer', 'winter'], description: 'Season selects the VLI limit. Required unless input_path is given.' },
      params: paramsSchema(true),
      input_path: { type: 'string', description: 'Absolute path to a prebuilt sample JSON file (same shape as the inline input). Overrides inline fields.' },
      approved_by: { type: 'string', required: true, description: 'Engineer name/handle from the approval message. Empty refuses.' },
      approval_note: { type: 'string', description: 'Quote or summary of the approval message.' },
      out_path: { type: 'string', required: true, description: 'Absolute path for S-001_MG91_Compliance.xlsx.' },
    },
    output: {
      schema: REPORT_RESULT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: `Compliance report written: ${String((value as { out_path?: unknown }).out_path ?? '')}.` }],
    },
    async execute(args) {
      const approver = typeof args.approved_by === 'string' ? args.approved_by.trim() : ''
      if (!approver) throw new Error('mrpl_generate_report refused: engineer approval required (approved_by is empty)')
      const outPath = String(args.out_path ?? '')
      if (!outPath) throw new Error('mrpl_generate_report refused: out_path is required')
      // Deterministic source: re-run the checker here; the model never authors rows.
      const file = typeof args.input_path === 'string' && args.input_path.trim()
        ? resolveInputFile(args.input_path, cfg.inputDirs)
        : null
      if (file === null && (typeof args.sample_id !== 'string' || typeof args.season !== 'string' || args.params === undefined)) {
        throw new Error('mrpl_generate_report needs input_path or all of sample_id, season, params')
      }
      const checkStdout = await runPython(cfg.python,
        [CHECK_SCRIPT, file ?? '-', '--doc', cfg.docPath],
        file === null ? JSON.stringify({ sample_id: args.sample_id, season: args.season, params: args.params }) : '',
        cfg.timeoutMs, cfg.maxOutputBytes)
      const checked = parseResult(checkStdout)
      const payload = JSON.stringify({
        check_result: checked,
        approved_by: approver,
        ...(typeof args.approval_note === 'string' && args.approval_note ? { approval_note: args.approval_note } : {}),
      })
      const reportStdout = await runPython(cfg.python,
        [XLSX_SCRIPT, '--out', outPath],
        payload, cfg.timeoutMs, cfg.maxOutputBytes)
      let report: unknown
      try {
        report = JSON.parse(reportStdout)
      } catch {
        throw new Error(`report builder returned non-JSON output: ${reportStdout.slice(0, 500)}`)
      }
      const record = report as { out_path?: unknown; overall?: unknown; rows?: unknown }
      return {
        out_path: String(record.out_path ?? outPath),
        overall: String(record.overall ?? ''),
        rows: Number(record.rows ?? 0),
      } as InferValue<typeof REPORT_RESULT_SCHEMA>
    },
    presentCall: () => ({ card: 'generic', title: 'Generate MRPL compliance report (approval-gated)', kind: 'other', rawInput: {} }),
  }))
}
