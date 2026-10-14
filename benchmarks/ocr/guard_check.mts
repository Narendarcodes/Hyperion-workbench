// Re-score engine outputs after the read_pdf OCR guard: npx tsx benchmarks/ocr/guard_check.mts <runs/engine> <runs/engine+guard>
import { guardOcrPage } from '../../packages/fs/tool-fs/src/ocr-provider.ts'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
const [dir, out] = process.argv.slice(2) as [string, string]
mkdirSync(out, { recursive: true })
let rep = 0, run = 0, dup = 0, n = 0
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.json') || f.startsWith('_') || f === 'scores.json') continue
  const r = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as { text?: string }
  const g = guardOcrPage(r.text ?? '', 1)
  n++; if (g.guard.repetitionDetected) rep++; if (g.guard.runawaySequenceDetected) run++; dup += g.guard.duplicateCount
  writeFileSync(`${out}/${f}`, JSON.stringify({ ...r, text: g.text, guard: g.guard }))
}
writeFileSync(`${out}/_run.json`, readFileSync(`${dir}/_run.json`))
console.log(JSON.stringify({ dir, n, repetitionPages: rep, runawayPages: run, duplicatesDropped: dup }))
