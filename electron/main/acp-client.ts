import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number;
  result?: unknown;
  error?: { code: number; message: string };
  method?: string;
  params?: unknown;
}

export interface AcpUpdate {
  method: string;
  params: unknown;
}

export class AcpStdioClient {
  private child?: ChildProcessWithoutNullStreams;
  private requestId = 0;
  private readonly pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  private readonly updates = new Set<(update: AcpUpdate) => void>();

  constructor(
    private readonly command: string,
    private readonly args: string[] = [],
    private readonly cwd = process.cwd(),
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  start(): void {
    if (this.child) return;
    this.child = spawn(this.command, this.args, { cwd: this.cwd, env: this.env });
    const lines = createInterface({ input: this.child.stdout, crlfDelay: Infinity });
    lines.on('line', (line) => this.handleLine(line));
    this.child.on('exit', () => {
      for (const pending of this.pending.values()) pending.reject(new Error('ACP process exited'));
      this.pending.clear();
      this.child = undefined;
    });
  }

  onUpdate(callback: (update: AcpUpdate) => void): () => void {
    this.updates.add(callback);
    return () => this.updates.delete(callback);
  }

  request<T>(method: string, params?: unknown, timeoutMs = 5000): Promise<T> {
    this.start();
    if (!this.child) return Promise.reject(new Error('ACP process did not start'));
    const id = ++this.requestId;
    const request: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };
    this.child.stdin.write(`${JSON.stringify(request)}\n`);
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`ACP request timed out: ${method}`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value as T);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
    });
  }

  initialize(): Promise<{ protocolVersion: string; capabilities: Record<string, unknown> }> {
    return this.request('initialize');
  }

  createSession(): Promise<{ sessionId: string }> {
    return this.request('session/new');
  }

  prompt(params: {
    sessionId: string;
    turnId: string;
    prompt: string;
    slow?: boolean;
  }): Promise<{ stopReason: string }> {
    return this.request('session/prompt', params, 10000);
  }

  cancel(sessionId: string): Promise<{ cancelled: boolean }> {
    return this.request('session/cancel', { sessionId });
  }

  dispose(): void {
    this.child?.kill();
    this.child = undefined;
  }

  private handleLine(line: string): void {
    if (!line.trim()) return;
    const message = JSON.parse(line) as JsonRpcResponse;
    if (message.id && this.pending.has(message.id)) {
      const pending = this.pending.get(message.id)!;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
      return;
    }
    if (message.method) {
      for (const callback of this.updates)
        callback({ method: message.method, params: message.params });
    }
  }
}
