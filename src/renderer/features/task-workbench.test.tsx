import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type {
  AgentConfig,
  ConversationListItem,
  DocumentListItem,
  TaskListItem,
  TaskListSummary,
  UserProfile,
  WorkspaceSnapshot,
} from '../../shared/types';
import { TaskWorkbenchPage } from './task-workbench';

const createdAt = '2026-05-11T00:00:00.000Z';
const updatedAt = '2026-05-11T00:05:00.000Z';

const codexAgent: AgentConfig = {
  id: 'codex-cli-real',
  name: 'Codex',
  kind: 'codex-cli',
  command: 'codex',
  args: [],
  cwd: '.',
  enabled: true,
  availability: 'available',
};

function profile(): UserProfile {
  return {
    schema: 'f5.profile.v1',
    displayName: 'idevlab',
    defaultAgentId: codexAgent.id,
    workspacePath: '/tmp/f5',
    theme: 'light',
    iconTheme: 'system',
  };
}

function taskList(): TaskListSummary {
  return {
    schema: 'f5.task-list.v1',
    id: 'tasklist_aaaaaaaaaaaaaaaaaaaaaaaa',
    title: 'Personal',
    createdAt,
    updatedAt,
    order: 1,
    repairStatus: 'ok',
    taskCount: 1,
    openCount: 1,
  };
}

function task(): TaskListItem {
  return {
    schema: 'f5.task.v1',
    id: 'task_aaaaaaaaaaaaaaaaaaaaaaaa',
    listId: 'tasklist_aaaaaaaaaaaaaaaaaaaaaaaa',
    title: 'Draft launch note',
    status: 'todo',
    agentId: codexAgent.id,
    createdAt,
    updatedAt,
    completedAt: '',
    order: 1,
    body: 'Summarize the current release work.',
    repairStatus: 'ok',
  };
}

function conversation(taskId: string): ConversationListItem {
  return {
    schema: 'f5.conversation.v1',
    id: 'conv_aaaaaaaaaaaaaaaaaaaaaaaa',
    taskId,
    title: 'Draft launch note',
    agentId: codexAgent.id,
    status: 'active',
    starred: false,
    createdAt,
    updatedAt,
    lastMessageAt: updatedAt,
    messageCount: 2,
    agentName: codexAgent.name,
    agentStatus: 'available',
    preview: 'Working on a first draft.',
  };
}

function document(taskId: string): DocumentListItem {
  return {
    schema: 'f5.document.v1',
    id: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
    taskId,
    title: 'Draft launch note',
    createdAt,
    updatedAt,
    repairStatus: 'ok',
  };
}

function snapshot(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  const item = task();
  return {
    workspacePath: '/tmp/f5',
    profile: profile(),
    agents: [codexAgent],
    conversations: [conversation(item.id)],
    taskLists: [taskList()],
    tasks: [item],
    documents: [document(item.id)],
    documentComments: [],
    entityReferences: [],
    ...overrides,
  };
}

describe('TaskWorkbenchPage', () => {
  it('shows linked chat and docs, then routes task actions', async () => {
    const user = userEvent.setup();
    const openConversation = vi.fn();
    const startChat = vi.fn();
    const createDocument = vi.fn();
    render(
      <TaskWorkbenchPage
        snapshot={snapshot()}
        taskId="task_aaaaaaaaaaaaaaaaaaaaaaaa"
        onBack={vi.fn()}
        onOpenConversation={openConversation}
        onStartChat={startChat}
        onCreateDocument={createDocument}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Draft launch note' })).toBeInTheDocument();
    expect(screen.getByText('Assignee: Codex')).toBeInTheDocument();
    expect(screen.getByText('Summarize the current release work.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open chat Draft launch note/ })).toBeInTheDocument();
    expect(screen.getByText('Task document')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Open chat Draft launch note/ }));
    expect(openConversation).toHaveBeenCalledWith('conv_aaaaaaaaaaaaaaaaaaaaaaaa');
    await user.click(screen.getByRole('button', { name: 'Start chat' }));
    expect(startChat).toHaveBeenCalledWith('task_aaaaaaaaaaaaaaaaaaaaaaaa');
    await user.click(screen.getByRole('button', { name: 'New doc' }));
    expect(createDocument).toHaveBeenCalledWith('task_aaaaaaaaaaaaaaaaaaaaaaaa');
  });
});
