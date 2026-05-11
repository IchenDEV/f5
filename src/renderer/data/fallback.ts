import type { WorkspaceSnapshot } from '../../shared/types';

export const fallbackSnapshot: WorkspaceSnapshot = {
  workspacePath: 'Loading workspace...',
  profile: {
    schema: 'f5.profile.v1',
    displayName: 'You',
    defaultAgentId: 'codex-cli-real',
    workspacePath: 'Loading workspace...',
    theme: 'light',
    iconTheme: 'system',
  },
  agents: [],
  conversations: [],
  taskLists: [],
  tasks: [],
  documents: [],
};
