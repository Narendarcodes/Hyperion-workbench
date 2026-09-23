import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as readline from 'readline';

export interface LayaRoutingResult {
  task_type: 'coding' | 'reasoning' | 'qa' | 'creative' | 'other';
  task_type_confidence: number;
  complexity: number;
  routing_model: string;
}

export class LayaClient {
  private proc?: ChildProcess;
  private pendingRequests: Map<string, { resolve: (val: any) => void, reject: (err: any) => void }> = new Map();
  private reqIdCounter = 0;
  private readyPromise: Promise<void>;

  constructor() {
    this.readyPromise = this.startDaemon();
  }

  private startDaemon(): Promise<void> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, '..', 'python', 'laya_daemon.py');
      // Assume python is in PATH or venv is active
      this.proc = spawn('python', [scriptPath], {
        stdio: ['pipe', 'pipe', 'inherit']
      });

      if (!this.proc.stdout) {
        reject(new Error("Failed to open stdout for Laya daemon"));
        return;
      }

      const rl = readline.createInterface({ input: this.proc.stdout });
      
      let isReady = false;
      rl.on('line', (line) => {
        try {
          const res = JSON.parse(line);
          if (!isReady && res.ready) {
            isReady = true;
            resolve();
            return;
          }
          if (!isReady && res.error) {
            reject(new Error(`Laya daemon failed to start: ${res.error}`));
            return;
          }

          if (res.id && this.pendingRequests.has(res.id)) {
            const p = this.pendingRequests.get(res.id)!;
            this.pendingRequests.delete(res.id);
            if (res.error) p.reject(new Error(res.error));
            else p.resolve(res);
          }
        } catch (e) {
          console.error("[LayaClient] Error parsing Laya output:", line);
        }
      });

      this.proc.on('close', (code) => {
        if (!isReady) reject(new Error(`Laya daemon exited with code ${code} before ready`));
      });
      this.proc.on('error', (err) => {
        if (!isReady) reject(err);
      });
    });
  }

  async characterize(text: string): Promise<LayaRoutingResult> {
    await this.readyPromise;
    if (!this.proc || !this.proc.stdin) {
      throw new Error("Laya daemon is not running");
    }

    const id = (this.reqIdCounter++).toString();
    const p = new Promise<LayaRoutingResult>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    const req = JSON.stringify({ id, text }) + "\n";
    this.proc.stdin.write(req);

    // Timeout fallback
    setTimeout(() => {
      if (this.pendingRequests.has(id)) {
        this.pendingRequests.get(id)!.reject(new Error("Laya task timed out"));
        this.pendingRequests.delete(id);
      }
    }, 5000);

    return p;
  }
  
  shutdown() {
    if (this.proc) {
      this.proc.kill();
      this.proc = undefined;
    }
  }
}
