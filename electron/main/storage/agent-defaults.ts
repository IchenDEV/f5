import type { AgentConfig, AgentsFile } from '../../../src/shared/types';

export const defaultAgent: AgentConfig = {
  id: 'codex-cli-real',
  name: 'Codex',
  kind: 'codex-cli',
  command: 'codex',
  args: ['exec', '--json', '--sandbox', 'read-only', '--skip-git-repo-check'],
  cwd: '.',
  enabled: true,
  availability: 'available',
  protocolVersion: 'Codex CLI',
  description: 'Real Codex CLI agent used when an ACP adapter is not installed.',
  verification: 'real-codex-cli',
};

export const defaultAgentsFile: AgentsFile = {
  schema: 'f5.agents.v1',
  defaultAgentId: defaultAgent.id,
  agents: [
    defaultAgent,
    {
      id: 'codex-acp-real',
      name: 'Codex ACP',
      kind: 'acp-stdio',
      command: 'codex-acp',
      args: [],
      cwd: '.',
      enabled: false,
      availability: 'disabled',
      protocolVersion: 'ACP v1.0',
      description: 'Real Codex ACP adapter. Enable after a runnable command is installed.',
      verification: 'required-for-acp-execution',
    },
    {
      id: 'claude-code',
      name: 'Claude Code',
      kind: 'acp-stdio',
      command: 'claude-code-acp',
      args: [],
      cwd: '.',
      enabled: false,
      availability: 'disabled',
      description: 'Optional real ACP adapter. Enable only when the command exists locally.',
    },
  ],
};

export function migrateAgentsFile(file: AgentsFile): { file: AgentsFile; changed: boolean } {
  let changed = false;
  const agents = file.agents.map((agent) => {
    if (agent.id !== defaultAgent.id) return agent;
    const args = migrateCodexCliArgs(agent.args);
    if (args.join('\u0000') !== agent.args.join('\u0000')) changed = true;
    return { ...agent, args };
  });
  if (!agents.some((agent) => agent.id === defaultAgent.id)) {
    changed = true;
    agents.unshift(defaultAgent);
  }
  return { file: { ...file, agents }, changed };
}

function migrateCodexCliArgs(input: string[]): string[] {
  const args: string[] = [];
  for (let index = 0; index < input.length; index += 1) {
    if (input[index] === '--ask-for-approval') {
      index += 1;
      continue;
    }
    if (input[index] !== '--json') args.push(input[index]);
  }
  if (!args.includes('exec')) args.unshift('exec');
  args.splice(args.indexOf('exec') + 1, 0, '--json');
  if (!args.includes('--sandbox')) args.push('--sandbox', 'read-only');
  if (!args.includes('--skip-git-repo-check')) args.push('--skip-git-repo-check');
  return args;
}
