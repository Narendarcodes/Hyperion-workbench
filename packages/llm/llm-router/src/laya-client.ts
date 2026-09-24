import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as readline from 'readline'
import { fileURLToPath } from 'url'

import { LayaQuestion } from './config.ts'

export interface LayaRoutingResult {
  answers: Record<string, { choice?: string; confidence?: number; score?: number }>
  routing_model: string
}

interface DaemonMessage {
  ready?: boolean
  error?: string
  id?: string
  answers?: Record<string, { choice?: string; confidence?: number; score?: number }>
  routing_model?: string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class LayaClient {
  private proc: ChildProcess | undefined
  private pendingRequests = new Map<string, { resolve: (val: LayaRoutingResult) => void; reject: (err: Error) => void }>()
  private reqIdCounter = 0
  private readyPromise: Promise<void> | undefined
  private isShuttingDown = false

  constructor() {
    // Preload Laya daemon into memory immediately
    void this.ensureDaemon()
  }

  private ensureDaemon(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = this.startDaemon()
      this.readyPromise.catch(() => {})
    }
    return this.readyPromise
  }

  private startDaemon(): Promise<void> {
    const { promise, resolve, reject } = Promise.withResolvers<void>()

    const scriptPath = path.join(__dirname, '..', 'python', 'laya_daemon.py')
    this.proc = spawn('python', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    this.proc.unref()

    if (!this.proc.stdout) {
      reject(new Error('Failed to open stdout for Laya daemon'))
      return promise
    }

    // Silence daemon stderr (model loading progress bars, warnings)
    this.proc.stderr?.on('data', () => {})

    const rl = readline.createInterface({ input: this.proc.stdout })

    let isReady = false
    rl.on('line', (line) => {
      try {
        const res = JSON.parse(line) as DaemonMessage
        if (!isReady && res.ready) {
          isReady = true
          resolve()
          return
        }
        if (!isReady && res.error) {
          reject(new Error(`Laya daemon failed to start: ${res.error}`))
          return
        }

        if (res.id && this.pendingRequests.has(res.id)) {
          const p = this.pendingRequests.get(res.id)
          if (!p) return
          this.pendingRequests.delete(res.id)
          if (res.error) p.reject(new Error(res.error))
          else p.resolve(res as LayaRoutingResult)
        }
      } catch {
        console.error('[LayaClient] Error parsing Laya output:', line)
      }
    })

    this.proc.on('close', (code) => {
      if (this.isShuttingDown) return
      if (!isReady) reject(new Error(`Laya daemon exited with code ${code} before ready`))
    })
    this.proc.on('error', (err) => {
      if (this.isShuttingDown) return
      if (!isReady) reject(err)
    })

    return promise
  }

  async characterize(text: string, questions: Record<string, LayaQuestion>): Promise<LayaRoutingResult> {
    await this.ensureDaemon()
    if (!this.proc || !this.proc.stdin) {
      throw new Error('Laya daemon is not running')
    }

    const id = (this.reqIdCounter++).toString()
    const { promise, resolve, reject } = Promise.withResolvers<LayaRoutingResult>()
    this.pendingRequests.set(id, { resolve, reject })

    const req = JSON.stringify({ id, text, questions }) + '\n'
    this.proc.stdin.write(req)

    // Timeout fallback (15s accommodates CPU execution and high-load environments)
    setTimeout(() => {
      if (this.pendingRequests.has(id)) {
        this.pendingRequests.get(id)?.reject(new Error('Laya task timed out'))
        this.pendingRequests.delete(id)
      }
    }, 15000)

    return promise
  }

  shutdown() {
    this.isShuttingDown = true
    if (this.proc) {
      this.proc.kill()
      this.proc = undefined
    }
  }
}
