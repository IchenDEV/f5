import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ChatComposer } from './App';
import type { OpenConversation, WorkspaceEntity } from '../shared/types';

const updatedAt = '2026-05-17T00:00:00.000Z';

const activeConversation: OpenConversation = {
  conversation: {
    schema: 'f5.conversation.v1',
    id: 'conv_aaaaaaaaaaaaaaaaaaaaaaaa',
    taskId: '',
    title: 'Entity chat',
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
  },
};

const mentionEntities: WorkspaceEntity[] = [
  {
    kind: 'document',
    id: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
    label: 'Entity design',
    uri: 'f5://document/doc_aaaaaaaaaaaaaaaaaaaaaaaa',
    subtitle: 'Markdown document',
    searchText: 'document entity design markdown document',
  },
  {
    kind: 'todo',
    id: 'task_aaaaaaaaaaaaaaaaaaaaaaaa',
    label: 'Ship entity mention',
    uri: 'f5://todo/task_aaaaaaaaaaaaaaaaaaaaaaaa',
    subtitle: 'Open in Inbox',
    searchText: 'todo ship entity mention open in inbox',
  },
];

describe('ChatComposer', () => {
  it('inserts selected workspace entity mentions into the draft', async () => {
    const user = userEvent.setup();
    const onDraftChange = vi.fn();
    render(
      <TooltipProvider>
        <ChatComposer
          active={activeConversation}
          draft=""
          mentionEntities={mentionEntities}
          onDraftChange={onDraftChange}
          onSend={vi.fn()}
          onRevealFiles={vi.fn()}
          onTogglePanel={vi.fn()}
          onAgentProfile={vi.fn()}
        />
      </TooltipProvider>,
    );

    await user.click(screen.getByLabelText('Mention entity'));
    await user.click(screen.getByRole('button', { name: /Entity design/ }));

    expect(onDraftChange).toHaveBeenCalledWith(
      '@[Entity design](f5://document/doc_aaaaaaaaaaaaaaaaaaaaaaaa) ',
    );
  });
});
