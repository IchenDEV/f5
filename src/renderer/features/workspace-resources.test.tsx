import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DocumentsPage, MarkdownPreview, TasksPage } from './workspace-resources';
import type {
  AgentConfig,
  DocumentListItem,
  DocumentRecord,
  TaskListItem,
  TaskListSummary,
} from '../../shared/types';

const createdAt = '2026-05-11T00:00:00.000Z';
const updatedAt = '2026-05-11T00:00:00.000Z';
const defaultTaskListId = 'tasklist_aaaaaaaaaaaaaaaaaaaaaaaa';

const agents: AgentConfig[] = [
  {
    id: 'codex-cli-real',
    name: 'Codex',
    kind: 'codex-cli',
    command: 'codex',
    args: [],
    cwd: '.',
    enabled: true,
    availability: 'available',
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
  },
];

function taskList(overrides: Partial<TaskListSummary> = {}): TaskListSummary {
  return {
    schema: 'f5.task-list.v1',
    id: defaultTaskListId,
    title: 'Inbox',
    createdAt,
    updatedAt,
    order: 1,
    repairStatus: 'ok',
    taskCount: 1,
    openCount: 1,
    ...overrides,
  };
}

function task(overrides: Partial<TaskListItem> = {}): TaskListItem {
  return {
    schema: 'f5.task.v1',
    id: 'task_aaaaaaaaaaaaaaaaaaaaaaaa',
    listId: defaultTaskListId,
    title: 'Open task',
    status: 'todo',
    agentId: 'codex-cli-real',
    createdAt,
    updatedAt,
    completedAt: '',
    order: 1,
    body: 'Task notes',
    repairStatus: 'ok',
    ...overrides,
  };
}

function documentListItem(overrides: Partial<DocumentListItem> = {}): DocumentListItem {
  return {
    schema: 'f5.document.v1',
    id: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
    title: 'Project doc',
    createdAt,
    updatedAt,
    repairStatus: 'ok',
    ...overrides,
  };
}

function documentRecord(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    schema: 'f5.document.v1',
    id: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
    title: 'Project doc',
    createdAt,
    updatedAt,
    body: '# Project doc\n\nHello',
    ...overrides,
  };
}

describe('workspace resources UI', () => {
  it('creates, filters, and completes TODO items', async () => {
    const user = userEvent.setup();
    const createTask = vi.fn(async () => undefined);
    const updateTask = vi.fn(async () => undefined);
    const deleteTask = vi.fn(async () => undefined);
    render(
      <TasksPage
        taskLists={[taskList({ taskCount: 2, openCount: 1 })]}
        tasks={[
          task(),
          task({
            id: 'task_bbbbbbbbbbbbbbbbbbbbbbbb',
            title: 'Finished task',
            status: 'done',
            completedAt: updatedAt,
            order: 2,
          }),
        ]}
        agents={agents}
        defaultAgentId="codex-cli-real"
        query=""
        onBack={vi.fn()}
        onCreateTaskList={vi.fn(async () => undefined)}
        onUpdateTaskList={vi.fn(async () => undefined)}
        onDeleteTaskList={vi.fn(async () => undefined)}
        onCreateTask={createTask}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
      />,
    );

    await user.type(screen.getByLabelText('Task title'), 'New task');
    await user.type(screen.getByLabelText('Task notes'), 'New notes');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(createTask).toHaveBeenCalledWith({
      taskListId: defaultTaskListId,
      title: 'New task',
      body: 'New notes',
      agentId: 'codex-cli-real',
    });

    await user.click(screen.getByLabelText('Mark Open task complete'));
    expect(updateTask).toHaveBeenCalledWith({
      taskId: 'task_aaaaaaaaaaaaaaaaaaaaaaaa',
      title: 'Open task',
      body: 'Task notes',
      status: 'done',
      agentId: 'codex-cli-real',
    });

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByText('Open task')).not.toBeInTheDocument();
    expect(screen.getByText('Finished task')).toBeInTheDocument();
  });

  it('edits, cancels, and deletes TODO items', async () => {
    const user = userEvent.setup();
    const updateTask = vi.fn(async () => undefined);
    const deleteTask = vi.fn(async () => undefined);
    render(
      <TasksPage
        taskLists={[taskList()]}
        tasks={[task()]}
        agents={agents}
        defaultAgentId="codex-cli-real"
        query="Open"
        onBack={vi.fn()}
        onCreateTaskList={vi.fn(async () => undefined)}
        onUpdateTaskList={vi.fn(async () => undefined)}
        onDeleteTaskList={vi.fn(async () => undefined)}
        onCreateTask={vi.fn(async () => undefined)}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
      />,
    );

    expect(screen.getByLabelText('Search TODO')).toHaveValue('Open');
    await user.click(screen.getByLabelText('Edit task'));
    await user.clear(screen.getByLabelText('Edit task title'));
    await user.type(screen.getByLabelText('Edit task title'), 'Edited task');
    await user.clear(screen.getByLabelText('Edit task notes'));
    await user.type(screen.getByLabelText('Edit task notes'), 'Edited notes');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Open task')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Edit task'));
    await user.clear(screen.getByLabelText('Edit task title'));
    await user.type(screen.getByLabelText('Edit task title'), 'Edited task');
    await user.clear(screen.getByLabelText('Edit task notes'));
    await user.type(screen.getByLabelText('Edit task notes'), 'Edited notes');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateTask).toHaveBeenCalledWith({
      taskId: 'task_aaaaaaaaaaaaaaaaaaaaaaaa',
      title: 'Edited task',
      body: 'Edited notes',
      status: 'todo',
      agentId: 'codex-cli-real',
    });

    await user.click(screen.getByLabelText('Delete task'));
    expect(
      screen.getByText('This removes the task Markdown file from local storage.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleteTask).toHaveBeenCalledWith({ taskId: 'task_aaaaaaaaaaaaaaaaaaaaaaaa' });
  });

  it('shows TODO empty and repair states', () => {
    const { rerender } = render(
      <TasksPage
        taskLists={[taskList({ taskCount: 0, openCount: 0 })]}
        tasks={[]}
        agents={agents}
        defaultAgentId="codex-cli-real"
        query=""
        onBack={vi.fn()}
        onCreateTaskList={vi.fn(async () => undefined)}
        onUpdateTaskList={vi.fn(async () => undefined)}
        onDeleteTaskList={vi.fn(async () => undefined)}
        onCreateTask={vi.fn(async () => undefined)}
        onUpdateTask={vi.fn(async () => undefined)}
        onDeleteTask={vi.fn(async () => undefined)}
      />,
    );
    expect(screen.getByText('No tasks found.')).toBeInTheDocument();

    rerender(
      <TasksPage
        taskLists={[taskList()]}
        tasks={[task({ repairStatus: 'needs_repair', body: '' })]}
        agents={agents}
        defaultAgentId="codex-cli-real"
        query=""
        onBack={vi.fn()}
        onCreateTaskList={vi.fn(async () => undefined)}
        onUpdateTaskList={vi.fn(async () => undefined)}
        onDeleteTaskList={vi.fn(async () => undefined)}
        onCreateTask={vi.fn(async () => undefined)}
        onUpdateTask={vi.fn(async () => undefined)}
        onDeleteTask={vi.fn(async () => undefined)}
      />,
    );
    expect(screen.getByText('Needs repair')).toBeInTheDocument();
  });

  it('switches TODO lists and creates tasks in the active list', async () => {
    const user = userEvent.setup();
    const createTask = vi.fn(async () => undefined);
    const createTaskList = vi.fn(async () => undefined);
    const personal = taskList({
      id: defaultTaskListId,
      title: 'Personal',
      taskCount: 1,
      openCount: 1,
    });
    const launch = taskList({
      id: 'tasklist_bbbbbbbbbbbbbbbbbbbbbbbb',
      title: 'Launch',
      order: 2,
      taskCount: 1,
      openCount: 1,
    });
    render(
      <TasksPage
        taskLists={[personal, launch]}
        tasks={[
          task({ title: 'Buy keyboard', listId: personal.id }),
          task({
            id: 'task_bbbbbbbbbbbbbbbbbbbbbbbb',
            title: 'Ship release notes',
            listId: launch.id,
          }),
        ]}
        agents={agents}
        defaultAgentId="codex-cli-real"
        query=""
        onBack={vi.fn()}
        onCreateTaskList={createTaskList}
        onUpdateTaskList={vi.fn(async () => undefined)}
        onDeleteTaskList={vi.fn(async () => undefined)}
        onCreateTask={createTask}
        onUpdateTask={vi.fn(async () => undefined)}
        onDeleteTask={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText('Buy keyboard')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Launch/ }));
    expect(screen.queryByText('Buy keyboard')).not.toBeInTheDocument();
    expect(screen.getByText('Ship release notes')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Task title'), 'Launch checklist');
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(createTask).toHaveBeenCalledWith({
      taskListId: launch.id,
      title: 'Launch checklist',
      body: '',
      agentId: 'codex-cli-real',
    });

    await user.click(screen.getByRole('button', { name: 'New list' }));
    expect(createTaskList).toHaveBeenCalledWith({ title: 'New list' });
  });

  it('assigns TODO items to agents from the create and edit controls', async () => {
    const user = userEvent.setup();
    const createTask = vi.fn(async () => undefined);
    const updateTask = vi.fn(async () => undefined);
    render(
      <TasksPage
        taskLists={[taskList()]}
        tasks={[task()]}
        agents={agents}
        defaultAgentId="codex-cli-real"
        query=""
        onBack={vi.fn()}
        onCreateTaskList={vi.fn(async () => undefined)}
        onUpdateTaskList={vi.fn(async () => undefined)}
        onDeleteTaskList={vi.fn(async () => undefined)}
        onCreateTask={createTask}
        onUpdateTask={updateTask}
        onDeleteTask={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText('Agent: Codex')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Task agent'));
    await user.click(await screen.findByRole('option', { name: 'Claude Code' }));
    await user.type(screen.getByLabelText('Task title'), 'Agent task');
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(createTask).toHaveBeenCalledWith({
      taskListId: defaultTaskListId,
      title: 'Agent task',
      body: '',
      agentId: 'claude-code',
    });

    await user.click(screen.getByLabelText('Edit task'));
    await user.click(screen.getByLabelText('Edit task agent'));
    await user.click(await screen.findByRole('option', { name: 'Claude Code' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateTask).toHaveBeenCalledWith({
      taskId: 'task_aaaaaaaaaaaaaaaaaaaaaaaa',
      title: 'Open task',
      body: 'Task notes',
      status: 'todo',
      agentId: 'claude-code',
    });
  });

  it('opens, previews, edits, and autosaves Markdown documents', async () => {
    const user = userEvent.setup();
    const opened = documentRecord();
    const openDocument = vi.fn(async () => opened);
    const updateDocument = vi.fn(async (input) =>
      documentRecord({ title: input.title, body: input.body }),
    );
    render(
      <DocumentsPage
        documents={[documentListItem()]}
        query=""
        onBack={vi.fn()}
        onCreateDocument={vi.fn(async () => opened)}
        onOpenDocument={openDocument}
        onUpdateDocument={updateDocument}
        onDeleteDocument={vi.fn(async () => undefined)}
        onRevealDocument={vi.fn(async () => undefined)}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Project doc' }));
    expect(await screen.findByDisplayValue('Project doc')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Project doc' })).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Document title'));
    await user.type(screen.getByLabelText('Document title'), 'Project doc v2');
    await user.clear(screen.getByLabelText('Document markdown'));
    await user.type(screen.getByLabelText('Document markdown'), '# Updated doc\\n\\n- Saved item');

    await waitFor(
      () =>
        expect(updateDocument).toHaveBeenCalledWith({
          documentId: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
          title: 'Project doc v2',
          body: '# Updated doc\\n\\n- Saved item',
        }),
      { timeout: 1500 },
    );
  });

  it('autosaves Markdown document drafts after typing pauses', async () => {
    const user = userEvent.setup();
    const opened = documentRecord();
    const openDocument = vi.fn(async () => opened);
    const updateDocument = vi.fn(async (input) =>
      documentRecord({ title: input.title, body: input.body }),
    );
    render(
      <DocumentsPage
        documents={[documentListItem()]}
        query=""
        onBack={vi.fn()}
        onCreateDocument={vi.fn(async () => opened)}
        onOpenDocument={openDocument}
        onUpdateDocument={updateDocument}
        onDeleteDocument={vi.fn(async () => undefined)}
        onRevealDocument={vi.fn(async () => undefined)}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Project doc' }));
    await user.clear(screen.getByLabelText('Document title'));
    await user.type(screen.getByLabelText('Document title'), 'Autosaved doc');
    await user.clear(screen.getByLabelText('Document markdown'));
    await user.type(screen.getByLabelText('Document markdown'), '# Autosaved doc');

    expect(screen.getByText('Autosaves after you pause')).toBeInTheDocument();
    await waitFor(
      () =>
        expect(updateDocument).toHaveBeenCalledWith({
          documentId: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
          title: 'Autosaved doc',
          body: '# Autosaved doc',
        }),
      { timeout: 1500 },
    );
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('creates, reveals, and deletes Markdown documents', async () => {
    const user = userEvent.setup();
    const created = documentRecord({
      id: 'doc_bbbbbbbbbbbbbbbbbbbbbbbb',
      title: 'Untitled document',
      body: '# Untitled document\n',
    });
    const createDocument = vi.fn(async () => created);
    const deleteDocument = vi.fn(async () => undefined);
    const revealDocument = vi.fn(async () => undefined);
    render(
      <DocumentsPage
        documents={[
          documentListItem(),
          documentListItem({
            id: 'doc_bbbbbbbbbbbbbbbbbbbbbbbb',
            title: 'Repair doc',
            repairStatus: 'needs_repair',
          }),
        ]}
        query="Project"
        onBack={vi.fn()}
        onCreateDocument={createDocument}
        onOpenDocument={vi.fn(async (documentId) =>
          documentRecord({
            id: documentId,
            title: documentId.endsWith('bbbbbbbbbbbbbbbbbbbbbbbb') ? 'Repair doc' : 'Project doc',
          }),
        )}
        onUpdateDocument={vi.fn(async (input) =>
          documentRecord({ id: input.documentId, title: input.title, body: input.body }),
        )}
        onDeleteDocument={deleteDocument}
        onRevealDocument={revealDocument}
      />,
    );

    expect(screen.getByLabelText('Search docs')).toHaveValue('Project');
    expect(screen.getByText('Repair')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New' }));
    expect(createDocument).toHaveBeenCalledWith({
      title: 'Untitled document',
      body: '# Untitled document\n',
    });
    expect(await screen.findByDisplayValue('Untitled document')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show file' }));
    expect(revealDocument).toHaveBeenCalledWith('doc_bbbbbbbbbbbbbbbbbbbbbbbb');

    await user.click(screen.getByLabelText('Delete document'));
    expect(
      screen.getByText('This removes the document Markdown file from local storage.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleteDocument).toHaveBeenCalledWith({ documentId: 'doc_bbbbbbbbbbbbbbbbbbbbbbbb' });
  });

  it('shows document empty state and empty Markdown preview', () => {
    render(
      <>
        <DocumentsPage
          documents={[]}
          query=""
          onBack={vi.fn()}
          onCreateDocument={vi.fn(async () => documentRecord())}
          onOpenDocument={vi.fn(async () => documentRecord())}
          onUpdateDocument={vi.fn(async () => documentRecord())}
          onDeleteDocument={vi.fn(async () => undefined)}
          onRevealDocument={vi.fn(async () => undefined)}
        />
        <MarkdownPreview body="" />
      </>,
    );

    expect(screen.getByText('No documents found.')).toBeInTheDocument();
    expect(screen.getByText('Create or select a document.')).toBeInTheDocument();
    expect(screen.getByText('Empty document')).toBeInTheDocument();
  });
});
