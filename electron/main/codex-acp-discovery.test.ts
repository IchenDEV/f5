import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AgentConfig } from '../../src/shared/types';
import { AcpStdioClient } from './acp-client';
import { discoverCodexAcp, type CodexDiscoveryRuntime } from './codex-acp-discovery';

describe('discoverCodexAcp', () => {
  it('uses deterministic candidate ordering and treats editor registry as evidence', async () => {
    const results = await discoverCodexAcp([], runtimeWith({ zedSettings: '{ "codex-acp": {} }' }));
    expect(results.map((result) => result.source)).toEqual([
      'codex-acp',
      'codex-cli',
      'zed-registry',
    ]);
    expect(results.at(-1)?.detail).toContain('evidence');
  });

  it('places user configured Codex agents before discovered commands', async () => {
    const configured: AgentConfig = {
      id: 'codex-acp-custom',
      name: 'Codex ACP Custom',
      kind: 'acp-stdio',
      command: 'custom-codex-acp',
      args: ['--stdio'],
      cwd: '.',
      enabled: true,
    };
    const results = await discoverCodexAcp(
      [configured],
      runtimeWith({ commands: new Set(['custom-codex-acp']) }),
    );
    expect(results[0]).toMatchObject({
      source: 'user_config',
      command: 'custom-codex-acp',
      status: 'found',
    });
  });

  it('reports Codex CLI as unsupported when help has no ACP mode', async () => {
    const results = await discoverCodexAcp(
      [],
      runtimeWith({ commands: new Set(['codex']), codexHelp: 'Usage: codex exec' }),
    );
    expect(results.find((result) => result.source === 'codex-cli')?.status).toBe('unsupported');
  });

  it('reports a runnable codex-acp command when present', async () => {
    const results = await discoverCodexAcp([], runtimeWith({ commands: new Set(['codex-acp']) }));
    expect(results.find((result) => result.source === 'codex-acp')?.status).toBe('found');
  });

  it('completes initialize, session, prompt, and cancel against a local ACP fixture process', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'f5-acp-fixture-'));
    const fixturePath = join(dir, 'fixture-acp-agent.mjs');
    await writeFile(
      fixturePath,
      `
import { createInterface } from 'node:readline';
const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  const request = JSON.parse(line);
  if (request.method === 'initialize') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { protocolVersion: 'ACP v1.0', capabilities: { prompt: true } } }) + '\\n');
  }
  if (request.method === 'session/new') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { sessionId: 'session_fixture' } }) + '\\n');
  }
  if (request.method === 'session/prompt') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', method: 'session/update', params: { kind: 'message', text: 'connected' } }) + '\\n');
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { stopReason: 'complete' } }) + '\\n');
  }
  if (request.method === 'session/cancel') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { cancelled: true } }) + '\\n');
  }
}
`,
      'utf8',
    );
    const client = new AcpStdioClient(process.execPath, [fixturePath], dir);
    const updates: string[] = [];
    client.onUpdate((update) => updates.push(update.method));
    const init = await client.initialize();
    const session = await client.createSession();
    const prompt = await client.prompt({
      sessionId: session.sessionId,
      turnId: 'turn_fixture',
      prompt: 'ping',
    });
    const cancel = await client.cancel(session.sessionId);
    client.dispose();

    expect(init.protocolVersion).toBe('ACP v1.0');
    expect(session.sessionId).toBe('session_fixture');
    expect(prompt.stopReason).toBe('complete');
    expect(cancel.cancelled).toBe(true);
    expect(updates).toContain('session/update');
  });

  it('rejects malformed ACP stdout without crashing the client', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'f5-acp-malformed-fixture-'));
    const fixturePath = join(dir, 'fixture-acp-malformed.mjs');
    await writeFile(
      fixturePath,
      `
process.stdout.write('not json\\n');
setTimeout(() => {}, 1000);
`,
      'utf8',
    );
    const client = new AcpStdioClient(process.execPath, [fixturePath], dir);

    await expect(client.initialize()).rejects.toThrow(/Invalid ACP JSON/);
    client.dispose();
  });
});

function runtimeWith(options: {
  commands?: Set<string>;
  codexHelp?: string;
  zedSettings?: string;
}): CodexDiscoveryRuntime {
  const commands = options.commands ?? new Set<string>();
  return {
    commandExists(command) {
      return commands.has(command);
    },
    commandOutput(command) {
      return command === 'codex --help' ? (options.codexHelp ?? '') : '';
    },
    async readZedSettings() {
      return options.zedSettings;
    },
  };
}
