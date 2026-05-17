import type { AgentConfig } from '../../../shared/types';

export function connectionState(agent: AgentConfig): { label: string; dotClass: string } {
  if (!agent.enabled || agent.availability === 'disabled') {
    return { label: 'Disabled', dotClass: 'bg-muted-foreground/50' };
  }
  if (agent.availability === 'available') {
    return {
      label: agent.kind === 'codex-cli' ? 'Codex CLI Ready' : 'ACP Connected',
      dotClass: 'bg-[color:var(--status-connected)]',
    };
  }
  return { label: 'Not connected', dotClass: 'bg-destructive' };
}
