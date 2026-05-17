import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WorkspaceApp } from '@/app/workspace-app';
import type { OpenConversation, WorkspaceSnapshot } from '../../shared/types';

const updatedAt = '2026-05-18T00:00:00.000Z';

const activeConversation: OpenConversation = {
  conversation: {
    schema: 'f5.conversation.v1',
    id: 'conv_aaaaaaaaaaaaaaaaaaaaaaaa',
    taskId: '',
    title: 'Shell test chat',
    agentId: 'codex-cli-real',
    status: 'active',
    starred: false,
    createdAt: updatedAt,
    updatedAt,
    lastMessageAt: updatedAt,
    messageCount: 0,
  },
  messages: [],
  state: {
    schema: 'f5.state.v1',
    conversationId: 'conv_aaaaaaaaaaaaaaaaaaaaaaaa',
    acpSessionId: '',
    activeTurnId: '',
    queue: [],
    plan: [],
    tools: [],
  },
  agent: {
    id: 'codex-cli-real',
    name: 'Codex',
    kind: 'codex-cli',
    command: 'codex',
    args: [],
    cwd: '.',
    enabled: true,
    availability: 'available',
    description: 'Real Codex CLI agent.',
  },
};

const snapshot: WorkspaceSnapshot = {
  workspacePath: '/tmp/f5-workspace-v2',
  profile: {
    schema: 'f5.profile.v1',
    displayName: 'Local User',
    defaultAgentId: 'codex-cli-real',
    workspacePath: '/tmp/f5-workspace-v2',
    theme: 'light',
    iconTheme: 'system',
  },
  agents: [activeConversation.agent],
  conversations: [
    {
      ...activeConversation.conversation,
      agentName: 'Codex',
      agentStatus: 'available',
      preview: 'Ready',
    },
  ],
  taskLists: [],
  tasks: [],
  documents: [],
  documentComments: [],
  entityReferences: [],
  activeConversation,
};

function installMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

function installF5Api(getSnapshot = vi.fn().mockResolvedValue(snapshot)) {
  const send = vi.fn().mockResolvedValue(snapshot);
  const subscribe = vi.fn(() => vi.fn());
  Object.defineProperty(window, 'f5', {
    writable: true,
    value: {
      platform: 'darwin',
      workspace: {
        getSnapshot,
        subscribe,
        reveal: vi.fn(),
      },
      conversations: {
        create: vi.fn(),
        createTask: vi.fn().mockResolvedValue(snapshot),
        open: vi.fn(),
        send,
        rename: vi.fn().mockResolvedValue(snapshot),
        star: vi.fn().mockResolvedValue(snapshot),
        archive: vi.fn().mockResolvedValue(snapshot),
        delete: vi.fn().mockResolvedValue(snapshot),
        cancelQueued: vi.fn().mockResolvedValue(snapshot),
        cancelActive: vi.fn().mockResolvedValue(snapshot),
        reveal: vi.fn(),
        export: vi.fn(),
      },
      tasks: {
        create: vi.fn().mockResolvedValue(snapshot),
        update: vi.fn().mockResolvedValue(snapshot),
        delete: vi.fn().mockResolvedValue(snapshot),
        createList: vi.fn().mockResolvedValue(snapshot),
        updateList: vi.fn().mockResolvedValue(snapshot),
        deleteList: vi.fn().mockResolvedValue(snapshot),
      },
      documents: {
        create: vi.fn(),
        open: vi.fn(),
        update: vi.fn(),
        delete: vi.fn().mockResolvedValue(snapshot),
        reveal: vi.fn(),
        comments: {
          create: vi.fn().mockResolvedValue(snapshot),
          update: vi.fn().mockResolvedValue(snapshot),
          delete: vi.fn().mockResolvedValue(snapshot),
        },
      },
      profile: {
        update: vi.fn().mockResolvedValue(snapshot),
      },
      agents: {
        testConnection: vi.fn(),
      },
    },
  });
  return { getSnapshot, send, subscribe };
}

function renderWorkspace(): void {
  render(
    <TooltipProvider>
      <WorkspaceApp />
    </TooltipProvider>,
  );
}

describe('WorkspaceApp shell', () => {
  it('navigates between workspace sections through the rail', async () => {
    installMatchMedia();
    installF5Api();
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(await screen.findByLabelText('Docs'));

    expect(screen.getAllByLabelText('Search docs')[0]).toBeInTheDocument();
  });

  it('shows workspace load errors with a retry action', async () => {
    installMatchMedia();
    installF5Api(vi.fn().mockRejectedValue(new Error('load failed')));
    renderWorkspace();

    expect(await screen.findByText('load failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('sends the composer draft through the v2 conversation API', async () => {
    installMatchMedia();
    const api = installF5Api();
    const user = userEvent.setup();
    renderWorkspace();

    await user.type(await screen.findByLabelText('Message composer'), 'hello agent');
    await user.click(screen.getByLabelText('Send message'));

    await waitFor(() =>
      expect(api.send).toHaveBeenCalledWith({
        conversationId: activeConversation.conversation.id,
        content: 'hello agent',
      }),
    );
  });

  it('toggles the agent inspector from the chat surface', async () => {
    installMatchMedia();
    installF5Api();
    const user = userEvent.setup();
    renderWorkspace();

    expect(await screen.findByText('ACP Session')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Close agent panel'));

    expect(screen.queryByText('ACP Session')).not.toBeInTheDocument();
  });
});
