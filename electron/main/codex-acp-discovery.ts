import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import type { AgentConfig, CodexCandidateResult } from '../../src/shared/types';

export interface CodexDiscoveryRuntime {
  commandExists(command: string): boolean;
  commandOutput(command: string): string;
  readZedSettings(): Promise<string | undefined>;
}

const nodeRuntime: CodexDiscoveryRuntime = {
  commandExists,
  commandOutput,
  async readZedSettings() {
    const zedSettingsPath = `${process.env.HOME ?? ''}/.config/zed/settings.json`;
    try {
      await access(zedSettingsPath, constants.F_OK);
      return readFile(zedSettingsPath, 'utf8');
    } catch {
      return undefined;
    }
  },
};

export async function discoverCodexAcp(
  userAgents: AgentConfig[] = [],
  runtime: CodexDiscoveryRuntime = nodeRuntime,
): Promise<CodexCandidateResult[]> {
  const results: CodexCandidateResult[] = [];
  const configured = userAgents.find((agent) => agent.id.includes('codex') && agent.enabled);
  if (configured) {
    const exists = runtime.commandExists(configured.command);
    results.push({
      source: 'user_config',
      command: configured.command,
      args: configured.args,
      status: exists ? 'found' : 'missing',
      detail: exists
        ? 'User-configured Codex ACP command exists.'
        : 'User-configured Codex ACP command was not found on PATH.',
    });
  }

  results.push(discoverCommand('codex-acp', 'codex-acp', runtime));
  results.push(discoverCodexCli(runtime));
  results.push(await discoverZedRegistry(runtime));
  return results;
}

function discoverCommand(
  source: 'codex-acp',
  command: string,
  runtime: CodexDiscoveryRuntime,
): CodexCandidateResult {
  const exists = runtime.commandExists(command);
  return {
    source,
    command,
    args: [],
    status: exists ? 'found' : 'missing',
    detail: exists ? `\`${command}\` exists on PATH.` : `\`${command}\` was not found on PATH.`,
  };
}

function discoverCodexCli(runtime: CodexDiscoveryRuntime): CodexCandidateResult {
  if (!runtime.commandExists('codex')) {
    return {
      source: 'codex-cli',
      command: 'codex',
      args: ['--help'],
      status: 'missing',
      detail: '`codex` was not found on PATH.',
    };
  }
  const help = runtime.commandOutput('codex --help');
  return {
    source: 'codex-cli',
    command: 'codex',
    args: ['--help'],
    status: help.toLowerCase().includes('acp') ? 'found' : 'unsupported',
    detail: help.toLowerCase().includes('acp')
      ? '`codex --help` mentions ACP.'
      : '`codex --help` does not expose an ACP-compatible mode.',
  };
}

async function discoverZedRegistry(runtime: CodexDiscoveryRuntime): Promise<CodexCandidateResult> {
  const zedSettingsPath = `${process.env.HOME ?? ''}/.config/zed/settings.json`;
  const zedSettings = await runtime.readZedSettings();
  if (zedSettings) {
    return {
      source: 'zed-registry',
      command: zedSettingsPath,
      args: [],
      status: zedSettings.includes('codex-acp') ? 'found' : 'missing',
      detail: zedSettings.includes('codex-acp')
        ? 'Zed settings include a codex-acp registry hint. This is evidence only, not a runnable command.'
        : 'Zed settings do not include a codex-acp registry hint.',
    };
  }
  return {
    source: 'zed-registry',
    command: zedSettingsPath,
    args: [],
    status: 'missing',
    detail: 'Zed settings file was not found.',
  };
}

function commandExists(command: string): boolean {
  const result = spawnSync('zsh', ['-lc', `command -v ${command}`], { encoding: 'utf8' });
  return result.status === 0 && Boolean(result.stdout.trim());
}

function commandOutput(command: string): string {
  const result = spawnSync('zsh', ['-lc', command], { encoding: 'utf8' });
  return `${result.stdout}${result.stderr}`.trim();
}
