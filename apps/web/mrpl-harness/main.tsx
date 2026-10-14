/**
 * MRPL screen harness entry: `?screen=documents|equipment|reports|evidence|mic|mission`,
 * `&theme=light|dark`. Works on the base branch too (no MrplSourceProvider
 * there), which is how the "before" screenshots are taken.
 */
import { createRoot } from 'react-dom/client'
import { useRef, useState, type ReactElement } from 'react'
import base from '../../../packages/client/ui-theme/src/styles/base.css?inline'
import designPlatform from '../../../packages/client/ui-theme/src/styles/design-platform.css?inline'
import { DocumentsOverview } from '../../../packages/client/ui-conversation/src/client/documents/DocumentsOverview.tsx'
import { EquipmentPage } from '../../../packages/client/ui-conversation/src/client/equipment/EquipmentPage.tsx'
import { ReportsOverview } from '../../../packages/client/ui-conversation/src/client/reports/ReportsOverview.tsx'
import { MrplEvidencePanel } from '../../../packages/client/ui-chat/src/client/chat/MrplEvidenceCard.tsx'
import { en } from '../../../packages/client/ui-chat/src/client/locale.ts'

for (const css of [base, designPlatform]) {
  const tag = document.createElement('style')
  tag.textContent = css
  document.head.append(tag)
}

const params = new URLSearchParams(location.search)
const screen = params.get('screen') ?? 'documents'
if (params.get('theme') === 'dark') document.body.dataset.dsDarkTheme = ''
document.body.style.margin = '0'
document.body.style.fontFamily = 'var(--dsw-font-family, system-ui, sans-serif)'
document.body.style.background = 'var(--dsw-alias-bg-base, #fff)'
document.body.style.color = 'var(--dsw-alias-label-primary, #111)'

const dict = en as Record<string, string>
const t = ((key: string, vars?: Record<string, string>) => {
  let text = dict[key] ?? key
  for (const [name, value] of Object.entries(vars ?? {})) text = text.replace(`{${name}}`, value)
  return text
}) as never

const RESULT_PROSE = [
  'MRPL MG 91 Compliance Check',
  'Sample S-001 — demo input, not a refinery certificate.',
  '| Parameter | Specification | Lab Value | Unit | Margin | Verdict | Method | Citation |',
  '|---|---|---|---|---|---|---|---|',
  '| RON | Min 91 | 93 | number | 2 | PASS | IS 1448, P:27 / ISO 5164 / ASTM D 2699 | DOC-010 p.1 |',
  '| MON | Min 81 | 84 | number | 3 | PASS | IS 1448, P:26 / ISO 5163 / ASTM D 2700 | DOC-010 p.1 |',
  '| Density at 15 C | 720-775 | 745 | kg/m3 | 25 | PASS | IS 1448, P:16 | DOC-010 p.1 |',
  '| Sulphur, total | Max 50 | 55 | mg/kg | -5 | **FAIL** | IS 1448, P:34 | DOC-010 p.1 |',
  '| Benzene | Max 1 | 0.6 | vol% | 0.4 | PASS | ASTM D 3606 | DOC-010 p.2 |',
  '| Olefins | Max 21 | 10 | vol% | 11 | PASS | ASTM D 1319 | DOC-010 p.2 |',
  '| VLI | Max 750 (summer) | 760 | index | -10 | **FAIL** | VLI = 10 x RVP + 7 x E70 | DOC-010 p.1 |',
].join('\n')
const TAMPERED_PROSE = RESULT_PROSE.replace('| Benzene | Max 1 |', '| Benzene | Max 0.9 |')

/**
 * `?screen=mic`: the composer's transcribe path without the whole session
 * shell: MediaRecorder on the (fake or real) microphone -> asrTranscribeUrl()
 * (the URL builder InputBar uses) -> /hyperion/asr/transcribe.
 */
function MicProbe() {
  const [state, setState] = useState('idle')
  const [result, setResult] = useState('')
  const [lang, setLang] = useState('auto')
  const recorder = useRef<MediaRecorder | null>(null)
  const start = async (): Promise<void> => {
    const { asrTranscribeUrl } = await import('../../../packages/client/ui-conversation/src/client/skeleton/InputBar.tsx')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const chunks: Blob[] = []
    const rec = new MediaRecorder(stream)
    recorder.current = rec
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    rec.onstop = async () => {
      for (const track of stream.getTracks()) track.stop()
      setState('transcribing')
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const res = await fetch(asrTranscribeUrl(lang), { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'audio/webm' }, body: blob })
      setResult(JSON.stringify({ status: res.status, ...(await res.json() as object) }))
      setState('done')
    }
    rec.start(250)
    setState('recording')
  }
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <select aria-label="Speech language" value={lang} onChange={(e) => { setLang(e.target.value) }}>
        {['auto', 'te', 'hi', 'en'].map(code => <option key={code} value={code}>{code}</option>)}
      </select>
      <button type="button" onClick={() => { void start() }}>Record</button>
      <button type="button" onClick={() => { recorder.current?.stop() }}>Stop</button>
      <output aria-label="Mic state">{state}</output>
      <pre aria-label="Transcript">{result}</pre>
    </div>
  )
}

async function render(): Promise<void> {
  const mrpl = import.meta.glob('../../../packages/client/ui-conversation/src/client/mrpl/api.ts', { eager: true }) as Record<string, { MrplSourceProvider?: (props: { source: unknown; children: ReactElement }) => ReactElement; createHttpMrplSource?: () => unknown }>
  const api = Object.values(mrpl)[0]
  let ui: ReactElement
  if (screen === 'equipment') ui = <EquipmentPage />
  else if (screen === 'reports') ui = <ReportsOverview />
  else if (screen === 'mic') ui = <MicProbe />
  else if (screen === 'evidence') {
    const prose = params.get('variant') === 'tampered' ? TAMPERED_PROSE : RESULT_PROSE
    ui = (
      <div style={{ maxWidth: 760, margin: '24px auto', fontFamily: 'system-ui', fontSize: 14 }}>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{prose}</pre>
        <MrplEvidencePanel blocks={[{ kind: 'text', text: prose }] as never} t={t} />
      </div>
    )
  } else ui = <DocumentsOverview />
  if (api?.MrplSourceProvider !== undefined && api.createHttpMrplSource !== undefined) {
    ui = <api.MrplSourceProvider source={api.createHttpMrplSource()}>{ui}</api.MrplSourceProvider>
  }
  createRoot(document.getElementById('root')!).render(ui)
}

void render()
