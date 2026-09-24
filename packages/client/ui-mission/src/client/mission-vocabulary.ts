/**
 * Mission vocabulary: event classifications, agent statuses, phases, station mappings, and bubble text generation.
 * @module @deepseek-ai/dsh-client-ui-mission/client/mission-vocabulary
 */

/** The 13 observable agent statuses in the Mission View. */
export type MissionAgentStatus =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'planning'
  | 'delegating'
  | 'working'
  | 'searching'
  | 'executing'
  | 'waiting'
  | 'blocked'
  | 'verifying'
  | 'completed'
  | 'failed'

/** The 7 mission phases from task inception to verified delivery. */
export type MissionPhase =
  | 'input'
  | 'understand'
  | 'plan'
  | 'retrieve'
  | 'execute'
  | 'verify'
  | 'deliver'

/** Evidence-backed state of one mission phase. */
export interface PhaseState {
  readonly status: 'real' | 'derived' | 'future'
  readonly evidenceSeqs: readonly number[]
}

/** Stations and work areas in the office simulation. */
export type MissionStationId =
  | 'documents'
  | 'knowledge'
  | 'analysis'
  | 'code'
  | 'testing'
  | 'verification'
  | 'report'
  | 'orchestrator'
  | 'cabin'

/** Station classification family for tools. */
export type ToolFamily =
  | 'documents'
  | 'knowledge'
  | 'analysis'
  | 'code'
  | 'testing'
  | 'verification'
  | 'report'
  | 'dispatch'
  | 'unknown'
/** Classification outcome for one tool name. */
export interface ClassifiedTool {
  readonly family: ToolFamily
  readonly station: MissionStationId
  readonly tag: string
}

const EXPLICIT_TOOL_TABLE: Readonly<Record<string, { family: ToolFamily; station: MissionStationId; tag: string }>> = {
  read: { family: 'documents', station: 'documents', tag: 'Read File' },
  read_pdf: { family: 'documents', station: 'documents', tag: 'Read PDF' },
  read_image: { family: 'documents', station: 'documents', tag: 'Read Image' },
  write: { family: 'code', station: 'code', tag: 'Write File' },
  edit: { family: 'code', station: 'code', tag: 'Edit File' },
  str_replace_editor: { family: 'code', station: 'code', tag: 'Editor' },
  bash: { family: 'code', station: 'code', tag: 'Bash' },
  pwsh: { family: 'code', station: 'code', tag: 'PowerShell' },
  glob: { family: 'knowledge', station: 'knowledge', tag: 'Glob Search' },
  grep: { family: 'knowledge', station: 'knowledge', tag: 'Grep Search' },
  web_fetch: { family: 'knowledge', station: 'knowledge', tag: 'Web Fetch' },
  web_search: { family: 'knowledge', station: 'knowledge', tag: 'Web Search' },
  task: { family: 'dispatch', station: 'code', tag: 'Subagents' },
  subagent: { family: 'dispatch', station: 'code', tag: 'Subagent' },
  subagent_fork: { family: 'dispatch', station: 'code', tag: 'Subagent Fork' },
  delegate: { family: 'dispatch', station: 'code', tag: 'Delegate' },
  hub: { family: 'dispatch', station: 'code', tag: 'Hub' },
  eval: { family: 'code', station: 'code', tag: 'Eval' },
  ast_edit: { family: 'code', station: 'code', tag: 'AST Edit' },
  workflow: { family: 'dispatch', station: 'code', tag: 'Workflow' },
  todo_write: { family: 'documents', station: 'documents', tag: 'Todo Plan' },
  skill: { family: 'knowledge', station: 'knowledge', tag: 'Skill Lookup' },
  ask_user_question: { family: 'verification', station: 'verification', tag: 'User Question' },
  lsp: { family: 'analysis', station: 'analysis', tag: 'LSP Analysis' },
  job_output: { family: 'documents', station: 'documents', tag: 'Job Output' },
  send_message: { family: 'dispatch', station: 'report', tag: 'Send Message' },
  test: { family: 'testing', station: 'testing', tag: 'Run Tests' },
  vitest: { family: 'testing', station: 'testing', tag: 'Vitest' },
  jest: { family: 'testing', station: 'testing', tag: 'Jest' },
  pytest: { family: 'testing', station: 'testing', tag: 'Pytest' },
  cargo_test: { family: 'testing', station: 'testing', tag: 'Cargo Test' },
  check: { family: 'testing', station: 'testing', tag: 'Test Check' },
}

/**
 * Sanitizes a string for safe display token usage.
 *
 * @param val - The raw input string.
 * @param maxLen - The maximum allowed length.
 * @returns The clamped, clean token.
 */
function sanitizeTag(val: string, maxLen = 24): string {
  const safe = val.replace(/[\r\n\t]+/g, ' ').trim()
  if (safe.length <= maxLen) return safe
  return `${safe.slice(0, maxLen - 1)}…`
}

/**
 * Classifies a tool name into a functional family, target station, and tag.
 *
 * @param name - The tool name to classify.
 * @returns The structured classification result.
 */
export function classifyTool(name: string): ClassifiedTool {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return { family: 'unknown', station: 'code', tag: 'Unknown' }
  }
  const cleanName = name.trim().toLowerCase()
  const explicit = EXPLICIT_TOOL_TABLE[cleanName]
  if (explicit !== undefined) {
    return explicit
  }

  // Tier 1: verb prefix matching
  if (cleanName.startsWith('read_') || cleanName.startsWith('view_') || cleanName.startsWith('doc_') || cleanName.startsWith('open_')) {
    return { family: 'documents', station: 'documents', tag: sanitizeTag(name) }
  }
  if (cleanName.startsWith('search_') || cleanName.startsWith('fetch_') || cleanName.startsWith('lookup_') || cleanName.startsWith('find_') || cleanName.startsWith('query_')) {
    return { family: 'knowledge', station: 'knowledge', tag: sanitizeTag(name) }
  }
  if (cleanName.startsWith('analyze_') || cleanName.startsWith('lint_') || cleanName.startsWith('check_syntax') || cleanName.startsWith('typecheck') || cleanName.startsWith('lsp_')) {
    return { family: 'analysis', station: 'analysis', tag: sanitizeTag(name) }
  }
  if (cleanName.startsWith('test') || cleanName.startsWith('bench')) {
    return { family: 'testing', station: 'testing', tag: sanitizeTag(name) }
  }
  if (cleanName.startsWith('write_') || cleanName.startsWith('edit_') || cleanName.startsWith('run_') || cleanName.startsWith('exec_') || cleanName.startsWith('compile_') || cleanName.startsWith('build_')) {
    return { family: 'code', station: 'code', tag: sanitizeTag(name) }
  }
  if (cleanName.startsWith('verify_') || cleanName.startsWith('approve_') || cleanName.startsWith('ask_') || cleanName.startsWith('confirm_')) {
    return { family: 'verification', station: 'verification', tag: sanitizeTag(name) }
  }
  if (cleanName.startsWith('report_') || cleanName.startsWith('summary_') || cleanName.startsWith('export_') || cleanName.startsWith('deliver_')) {
    return { family: 'report', station: 'report', tag: sanitizeTag(name) }
  }
  if (cleanName.startsWith('agent_') || cleanName.startsWith('spawn_') || cleanName.startsWith('delegate_')) {
    return { family: 'dispatch', station: 'code', tag: sanitizeTag(name) }
  }

  // Fallback: unknown family preserving raw name capped to 16 chars
  return { family: 'unknown', station: 'code', tag: sanitizeTag(name, 16) }
}

/**
 * Extracts a safe display basename from a file path.
 *
 * @param path - The raw path or filename.
 * @returns The trailing filename component.
 */
export function extractBasename(path: string): string {
  if (typeof path !== 'string' || path.trim().length === 0) return 'file'
  const normalized = path.replace(/\\/g, '/')
  const segments = normalized.split('/').filter(s => s.length > 0)
  const last = segments[segments.length - 1]
  return last !== undefined && last.length > 0 ? last : 'file'
}

/**
 * Generates concise activity bubble text for an agent's current state.
 *
 * @param status - The agent's current status.
 * @param toolOrTag - Optional active tool name or context tag.
 * @param targetOrFile - Optional target filename or cause description.
 * @returns Human-readable bubble text capped at 64 characters.
 */
export function bubbleText(
  status: MissionAgentStatus,
  toolOrTag?: string,
  targetOrFile?: string,
): string {
  const safeTarget = typeof targetOrFile === 'string' && targetOrFile.length > 200
    ? `${targetOrFile.slice(0, 199)}…`
    : targetOrFile

  let result = ''
  switch (status) {
    case 'idle':
      result = 'Ready'
      break
    case 'listening':
      result = 'Listening to instructions…'
      break
    case 'thinking':
      result = 'Analyzing context…'
      break
    case 'planning':
      result = 'Structuring mission plan…'
      break
    case 'delegating':
      result = 'Planning next steps…'
      break
    case 'searching':
      result = 'Retrieving local evidence…'
      break
    case 'working':
    case 'executing': {
      if (toolOrTag !== undefined && toolOrTag.length > 0) {
        const classified = classifyTool(toolOrTag)
        if (classified.family === 'documents' && safeTarget !== undefined && safeTarget.length > 0) {
          result = `Reading ${extractBasename(safeTarget)}…`
        } else if (classified.family === 'knowledge') {
          result = safeTarget !== undefined && safeTarget.length > 0
            ? `Retrieving ${extractBasename(safeTarget)}…`
            : 'Retrieving local evidence…'
        } else if (classified.family === 'testing') {
          result = safeTarget !== undefined && safeTarget.length > 0
            ? `Testing ${extractBasename(safeTarget)}…`
            : 'Testing output…'
        } else if (classified.family === 'verification') {
          result = 'Checking result…'
        } else if (classified.family === 'analysis') {
          result = 'Analyzing findings…'
        } else if (classified.family === 'report') {
          result = 'Generating report…'
        } else if (toolOrTag === 'write' || toolOrTag === 'edit' || toolOrTag === 'str_replace_editor') {
          result = safeTarget !== undefined && safeTarget.length > 0
            ? `Writing ${extractBasename(safeTarget)}…`
            : 'Writing code…'
        } else {
          result = `Running ${classified.tag}…`
        }
      } else {
        result = 'Executing…'
      }
      break
    }
    case 'waiting':
      result = 'Waiting on workers…'
      break
    case 'verifying':
      result = 'Waiting for verification…'
      break
    case 'blocked': {
      const cause = safeTarget !== undefined && safeTarget.trim().length > 0
        ? sanitizeTag(safeTarget, 36)
        : 'cause unavailable'
      result = `Blocked — ${cause}`
      break
    }
    case 'completed': {
      const subject = toolOrTag !== undefined && toolOrTag.trim().length > 0
        ? sanitizeTag(toolOrTag, 30)
        : 'Task'
      result = `${subject} ready`
      break
    }
    case 'failed': {
      const subject = toolOrTag !== undefined && toolOrTag.trim().length > 0
        ? sanitizeTag(toolOrTag, 30)
        : 'Execution'
      result = `${subject} failed`
      break
    }
    default:
      result = 'Processing…'
  }

  if (result.length > 64) {
    return `${result.slice(0, 63)}…`
  }
  return result
}

/**
 * Returns the translation key for a station role.
 *
 * @param station - The station identifier.
 * @returns The locale key for translation.
 */
export function stationRoleKey(station: MissionStationId): `station.${MissionStationId}` {
  return `station.${station}`
}
