import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HUMAN_ASSIGNEE_ID } from '../../shared/types';
import type {
  AgentConfig,
  ConversationMeta,
  ConversationState,
  MessageRecord,
  OpenConversation,
  TaskListItem,
  TaskListSummary,
  UserProfile,
  WorkspaceSnapshot,
} from '../../shared/types';
import { WorkspaceBoardPage } from './workspace-board';

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

const disabledAgent: AgentConfig = {
  id: 'claude-code',
  name: 'Claude Code',
  kind: 'acp-stdio',
  command: 'claude-code-acp',
  args: [],
  cwd: '.',
  enabled: false,
  availability: 'disabled',
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

function taskList(overrides: Partial<TaskListSummary> = {}): TaskListSummary {
  return {
    schema: 'f5.task-list.v1',
    id: 'tasklist_aaaaaaaaaaaaaaaaaaaaaaaa',
    title: 'Personal',
    createdAt,
    updatedAt,
    order: 1,
    repairStatus: 'ok',
    taskCount: 2,
    openCount: 2,
    ...overrides,
  };
}

function task(overrides: Partial<TaskListItem> = {}): TaskListItem {
  return {
    schema: 'f5.task.v1',
    id: 'task_aaaaaaaaaaaaaaaaaaaaaaaa',
    listId: 'tasklist_aaaaaaaaaaaaaaaaaaaaaaaa',
    title: 'Wire persistence',
    status: 'todo',
    agentId: codexAgent.id,
    createdAt,
    updatedAt,
    completedAt: '',
    order: 1,
    body: 'Use the existing Markdown task store.',
    repairStatus: 'ok',
    ...overrides,
  };
}

function activeConversation(): OpenConversation {
  const conversation: ConversationMeta = {
    schema: 'f5.conversation.v1',
    id: 'conv_aaaaaaaaaaaaaaaaaaaaaaaa',
    taskId: 'task_aaaaaaaaaaaaaaaaaaaaaaaa',
    title: 'Build workspace board',
    agentId: codexAgent.id,
    status: 'active',
    starred: false,
    createdAt,
    updatedAt,
    lastMessageAt: updatedAt,
    messageCount: 1,
  };
  const state: ConversationState = {
    schema: 'f5.state.v1',
    conversationId: conversation.id,
    acpSessionId: '',
    activeTurnId: 'turn_aaaaaaaaaaaaaaaaaaaaaaaa',
    queue: [],
    plan: [{ id: 'plan-1', title: 'Implement board view', status: 'active' }],
    tools: [{ id: 'tool-1', name: 'apply_patch', status: 'running', elapsedSeconds: 12 }],
  };
  const messages: MessageRecord[] = [
    {
      meta: {
        schema: 'f5.message.v1',
        id: 'msg_aaaaaaaaaaaaaaaaaaaaaaaa',
        conversationId: conversation.id,
        sequence: 1,
        role: 'assistant',
        agentId: codexAgent.id,
        turnId: state.activeTurnId,
        parentId: '',
        status: 'streaming',
        createdAt,
        updatedAt,
        errorCode: '',
        errorMessage: '',
      },
      body: 'Working on it.',
    },
  ];
  return { conversation, messages, state, agent: codexAgent };
}

function snapshot(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  return {
    workspacePath: '/tmp/f5',
    profile: profile(),
    agents: [codexAgent, disabledAgent],
    conversations: [],
    taskLists: [taskList()],
    tasks: [
      task(),
      task({
        id: 'task_bbbbbbbbbbbbbbbbbbbbbbbb',
        title: 'Review copy',
        body: 'Human review before release.',
        agentId: HUMAN_ASSIGNEE_ID,
        order: 2,
      }),
    ],
    documents: [],
    documentComments: [],
    entityReferences: [],
    activeConversation: activeConversation(),
    ...overrides,
  };
}

describe('WorkspaceBoardPage', () => {
  it('shows active AI work, human assignments, and not-started tasks', () => {
    render(
      <WorkspaceBoardPage
        snapshot={snapshot()}
        query=""
        onOpenTask={vi.fn()}
        onOpenTasks={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Board' })).toBeInTheDocument();
    expect(screen.getByText('Wire persistence')).toBeInTheDocument();
    expect(screen.getByText('Plan: Implement board view')).toBeInTheDocument();
    expect(screen.getByText('Tool running: apply_patch')).toBeInTheDocument();
    expect(screen.getByText('Review copy')).toBeInTheDocument();
    expect(screen.getAllByText('idevlab').length).toBeGreaterThan(0);
  });

  it('filters board cards and opens TODO from the board action', async () => {
    const user = userEvent.setup();
    const openTasks = vi.fn();
    render(
      <WorkspaceBoardPage
        snapshot={snapshot()}
        query="review"
        onQueryChange={vi.fn()}
        onOpenTask={vi.fn()}
        onOpenTasks={openTasks}
      />,
    );

    expect(screen.getByText('Review copy')).toBeInTheDocument();
    expect(screen.queryByText('Wire persistence')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open TODO' }));
    expect(openTasks).toHaveBeenCalled();
  });

  it('opens the task workbench from a board card', async () => {
    const user = userEvent.setup();
    const openTask = vi.fn();
    render(
      <WorkspaceBoardPage
        snapshot={snapshot()}
        query=""
        onOpenTask={openTask}
        onOpenTasks={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Open Wire persistence/ }));
    expect(openTask).toHaveBeenCalledWith('task_aaaaaaaaaaaaaaaaaaaaaaaa');
  });
});
