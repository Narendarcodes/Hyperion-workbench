/** Pure archive-format, pair, and immutable-manifest helpers. */

import { createHash } from 'node:crypto'
import { basename } from 'node:path'
import { AGENT_NOTE_CLASSES } from './agent-note-tree.ts'

/** Versioned fields in the frozen-content manifest. */
export interface ArchiveManifest {
  version: 1
  files: Readonly<Record<string, string>>
}

/** Hash one archived artifact independently of the repository's Git object format. */
export function archiveContentHash(content: Buffer): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`
}

/** Compute the SHA-1 Git blob id used by bilingual consistency sidecars. */
export function gitBlobHash(content: Buffer): string {
  const hash = createHash('sha1')
  hash.update(`blob ${content.byteLength}\0`)
  hash.update(content)
  return hash.digest('hex')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Parse the archive manifest and reject fields or hashes outside its closed schema. */
export function parseArchiveManifest(content: string): ArchiveManifest {
  const value: unknown = JSON.parse(content)
  if (!isRecord(value)) throw new Error('expected a JSON object')
  const fields = Object.keys(value).sort()
  if (fields.join(',') !== 'files,version') throw new Error('expected exactly the fields `version` and `files`')
  if (value.version !== 1) throw new Error('unsupported manifest version (expected 1)')
  if (!isRecord(value.files)) throw new Error('`files` must be an object')
  const files: Record<string, string> = {}
  for (const [path, hash] of Object.entries(value.files)) {
    if (typeof hash !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(hash)) {
      throw new Error(`invalid content hash for ${path}`)
    }
    files[path] = hash
  }
  return { version: 1, files }
}

/** Render the archive manifest with deterministic path ordering. */
export function renderArchiveManifest(files: Readonly<Record<string, string>>): string {
  return `${JSON.stringify({
    version: 1,
    files: Object.fromEntries(Object.entries(files).sort(([left], [right]) => left.localeCompare(right))),
  }, null, 2)}\n`
}

/** Reject changes or removals of entries sealed by a prior manifest. */
export function validateArchiveManifestExtension(
  baseline: ArchiveManifest,
  current: ArchiveManifest,
): string[] {
  const errors: string[] = []
  for (const [path, expected] of Object.entries(baseline.files)) {
    const actual = current.files[path]
    if (actual === undefined) errors.push(`${path}: sealed manifest entry is missing`)
    else if (actual !== expected) errors.push(`${path}: sealed manifest hash changed`)
  }
  return errors
}

function validDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match === null) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

interface Pair {
  source?: Buffer
  meta?: Buffer
}

function pairMeta(content: string): Map<string, string> | undefined {
  const entries = new Map<string, string>()
  for (const line of content.split('\n')) {
    if (line === '' || line.startsWith('#')) continue
    const match = /^([^:#]+\.md): ([0-9a-f]{40})$/.exec(line)
    if (match?.[1] === undefined || match[2] === undefined) return undefined
    entries.set(match[1], match[2])
  }
  return entries
}

function validateHeader(path: string, content: Buffer, sourceBase: string): string[] {
  const errors: string[] = []
  const lines = content.toString('utf8').split('\n')
  if (!/^# Agent Note: \S/.test(lines[0] ?? '')) errors.push(`${path}: line 1 must be \`# Agent Note: <title>\``)
  if (lines[1] !== '') errors.push(`${path}: line 2 must be blank`)
  if (lines[2] !== 'Status: implemented') errors.push(`${path}: line 3 must be \`Status: implemented\``)
  const archived = /^Archived: (\d{4}-\d{2}-\d{2})$/.exec(lines[3] ?? '')?.[1]
  if (archived === undefined || !validDate(archived)) {
    errors.push(`${path}: line 4 must be \`Archived: YYYY-MM-DD\` with a valid date`)
  } else if (archived < sourceBase.slice(0, 10)) {
    errors.push(`${path}: archive date ${archived} predates the note filename`)
  }
  if (lines[4] !== '') errors.push(`${path}: line 5 must be blank`)
  // Line 6 once carried the bilingual switcher; legacy notes keep that line
  // frozen, so it is not validated here.
  return errors
}

/** Validate the closed kind tree, implemented/archive headers, and complete source+record pairs. */
export function validateArchiveArtifacts(artifacts: ReadonlyMap<string, Buffer>): string[] {
  const errors: string[] = []
  const pairs = new Map<string, Pair>()
  for (const [path, content] of artifacts) {
    const match = /^([^/]+)\/(\d{4}-\d{2}-\d{2}-.+?)(\.i18n\.yaml|\.md)$/.exec(path)
    if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined) {
      errors.push(`${path}: expected {kind}/yyyy-mm-dd-topic.{md,i18n.yaml}`)
      continue
    }
    if (!(AGENT_NOTE_CLASSES as readonly string[]).includes(match[1])) {
      errors.push(`${path}: unknown Agent Note kind ${JSON.stringify(match[1])}`)
      continue
    }
    const key = `${match[1]}/${match[2]}`
    const pair = pairs.get(key) ?? {}
    if (match[3] === '.md') pair.source = content
    else pair.meta = content
    pairs.set(key, pair)
  }

  for (const [key, pair] of [...pairs].sort(([left], [right]) => left.localeCompare(right))) {
    const sourcePath = `${key}.md`
    const metaPath = `${key}.i18n.yaml`
    const { source, meta } = pair
    if (source === undefined) {
      errors.push(`${key}: incomplete archived pair; missing ${sourcePath}`)
      continue
    }
    const sourceBase = basename(key)
    errors.push(...validateHeader(sourcePath, source, sourceBase))
    if (meta === undefined) continue
    const record = pairMeta(meta.toString('utf8'))
    if (record === undefined || record.size !== 1
      || record.get(`${sourceBase}.md`) !== gitBlobHash(source)) {
      errors.push(`${metaPath}: consistency record must contain the current Git blob hash of the archived note`)
    }
  }
  return errors
}

/** Preserve every sealed path/hash and append hashes for newly archived artifacts. */
export function extendArchiveManifest(
  existing: ArchiveManifest,
  artifacts: ReadonlyMap<string, Buffer>,
): { files: Record<string, string>; added: string[]; errors: string[] } {
  const errors: string[] = []
  const files: Record<string, string> = { ...existing.files }
  for (const [path, expected] of Object.entries(existing.files)) {
    const content = artifacts.get(path)
    if (content === undefined) errors.push(`${path}: sealed artifact is missing`)
    else if (archiveContentHash(content) !== expected) errors.push(`${path}: sealed content hash changed`)
  }
  const added: string[] = []
  for (const [path, content] of [...artifacts].sort(([left], [right]) => left.localeCompare(right))) {
    if (files[path] !== undefined) continue
    files[path] = archiveContentHash(content)
    added.push(path)
  }
  return { files, added, errors }
}
