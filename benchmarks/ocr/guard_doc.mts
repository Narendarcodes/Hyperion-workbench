// Apply the read_pdf OCR guard to sidecar JSON and write page-marked text:
//   npx tsx benchmarks/ocr/guard_doc.mts <sidecar_json_dir_or_file> <out_dir>
import { guardOcrPage } from '../../packages/fs/tool-fs/src/ocr-provider.ts'
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
interface SidecarDoc { doc: string; model: string; preset: string; page_count: number; pages: Array<{ number: number; text: string }> }
const [src, out] = process.argv.slice(2) as [string, string]
mkdirSync(out, { recursive: true })
const files = statSync(src).isDirectory() ? readdirSync(src).filter(f => f.endsWith('.json') && !f.startsWith('_')).map(f => join(src, f)) : [src]
const report: Record<string, unknown> = {}
for (const f of files) {
  const d = JSON.parse(readFileSync(f, 'utf8')) as SidecarDoc
  const pages = d.pages.map(p => guardOcrPage(p.text, p.number))
  const head = `<!-- ${d.doc} | OCR: ${d.preset} preset (${d.model}) via Hyperion OCR sidecar + OCR guard | ${d.page_count} pages | machine transcription of a scanned rendering; verify critical values -->\n`
  writeFileSync(join(out, `${basename(f, '.json')}.md`), head + pages.map(p => `\n--- page ${p.number} ---\n${p.text}\n`).join(''))
  report[d.doc] = { pages: d.page_count, guarded: pages.filter(p => p.guard.repetitionDetected || p.guard.runawaySequenceDetected).length, empty: pages.filter(p => !p.guard.valid).length }
}
writeFileSync(join(out, '_guard_report.json'), JSON.stringify(report, null, 1))
console.log(JSON.stringify({ docs: files.length }))
