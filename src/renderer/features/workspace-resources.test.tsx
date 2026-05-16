import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DocumentsPage, MarkdownPreview, TasksPage } from './workspace-resources';
import { HUMAN_ASSIGNEE_ID } from '../../shared/types';
import type {
  AgentConfig,
  DocumentCommentListItem,
  DocumentListItem,
  DocumentRecord,
  TaskListItem,
  TaskListSummary,
  WorkspaceEntity,
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
    id: 'task_bbbbbbbbbbbbbbbbbbbbbbbb',
    label: 'Launch checklist',
    uri: 'f5://todo/task_bbbbbbbbbbbbbbbbbbbbbbbb',
    subtitle: 'Open in Inbox',
    searchText: 'todo launch checklist open in inbox',
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
    taskId: '',
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
    taskId: '',
    title: 'Project doc',
    createdAt,
    updatedAt,
    body: '# Project doc\n\nHello',
    ...overrides,
  };
}

function documentComment(
  overrides: Partial<DocumentCommentListItem> = {},
): DocumentCommentListItem {
  return {
    schema: 'f5.document-comment.v1',
    id: 'comment_aaaaaaaaaaaaaaaaaaaaaaaa',
    documentId: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
    anchorText: '',
    anchorStart: 0,
    anchorEnd: 0,
    authorName: 'You',
    status: 'open',
    createdAt,
    updatedAt,
    body: 'Please clarify this section.',
    repairStatus: 'ok',
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

  it('creates TODO items assigned to the human profile', async () => {
    const user = userEvent.setup();
    const createTask = vi.fn(async () => undefined);
    render(
      <TasksPage
        taskLists={[taskList()]}
        tasks={[]}
        agents={agents}
        defaultAgentId="codex-cli-real"
        profileDisplayName="idevlab"
        query=""
        onBack={vi.fn()}
        onCreateTaskList={vi.fn(async () => undefined)}
        onUpdateTaskList={vi.fn(async () => undefined)}
        onDeleteTaskList={vi.fn(async () => undefined)}
        onCreateTask={createTask}
        onUpdateTask={vi.fn(async () => undefined)}
        onDeleteTask={vi.fn(async () => undefined)}
      />,
    );

    await user.click(screen.getByLabelText('Task assignee'));
    await user.click(screen.getByRole('option', { name: 'idevlab' }));
    await user.type(screen.getByLabelText('Task title'), 'Human review');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(createTask).toHaveBeenCalledWith({
      taskListId: defaultTaskListId,
      title: 'Human review',
      body: '',
      agentId: HUMAN_ASSIGNEE_ID,
    });
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

    expect(screen.getByText('Assignee: Codex')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Task assignee'));
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
    await user.click(screen.getByLabelText('Edit task assignee'));
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

  it('inserts workspace entity mentions into TODO notes', async () => {
    const user = userEvent.setup();
    const createTask = vi.fn(async () => undefined);
    render(
      <TasksPage
        taskLists={[taskList()]}
        tasks={[]}
        agents={agents}
        defaultAgentId="codex-cli-real"
        mentionEntities={mentionEntities}
        query=""
        onBack={vi.fn()}
        onCreateTaskList={vi.fn(async () => undefined)}
        onUpdateTaskList={vi.fn(async () => undefined)}
        onDeleteTaskList={vi.fn(async () => undefined)}
        onCreateTask={createTask}
        onUpdateTask={vi.fn(async () => undefined)}
        onDeleteTask={vi.fn(async () => undefined)}
      />,
    );

    await user.type(screen.getByLabelText('Task title'), 'Mention task');
    await user.click(screen.getByLabelText('Mention entity'));
    await user.click(screen.getByRole('button', { name: /Entity design/ }));
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(createTask).toHaveBeenCalledWith({
      taskListId: defaultTaskListId,
      title: 'Mention task',
      body: '@[Entity design](f5://document/doc_aaaaaaaaaaaaaaaaaaaaaaaa) ',
      agentId: 'codex-cli-real',
    });
  });

  it('renders workspace entity mentions inside TODO rows as openable chips', () => {
    const openEntity = vi.fn();
    render(
      <TasksPage
        taskLists={[taskList()]}
        tasks={[
          task({
            body: 'Read @[Entity design](f5://document/doc_aaaaaaaaaaaaaaaaaaaaaaaa).',
          }),
        ]}
        agents={agents}
        defaultAgentId="codex-cli-real"
        mentionEntities={mentionEntities}
        query=""
        onBack={vi.fn()}
        onCreateTaskList={vi.fn(async () => undefined)}
        onUpdateTaskList={vi.fn(async () => undefined)}
        onDeleteTaskList={vi.fn(async () => undefined)}
        onCreateTask={vi.fn(async () => undefined)}
        onUpdateTask={vi.fn(async () => undefined)}
        onDeleteTask={vi.fn(async () => undefined)}
        onOpenEntity={openEntity}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Document: Entity design' }));

    expect(openEntity).toHaveBeenCalledWith({
      kind: 'document',
      id: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
      label: 'Entity design',
      uri: 'f5://document/doc_aaaaaaaaaaaaaaaaaaaaaaaa',
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

  it('shows document task source markers', () => {
    render(
      <DocumentsPage
        documents={[
          documentListItem({ taskId: 'task_aaaaaaaaaaaaaaaaaaaaaaaa' }),
          documentListItem({
            id: 'doc_bbbbbbbbbbbbbbbbbbbbbbbb',
            title: 'Unlinked doc',
          }),
        ]}
        tasks={[task()]}
        query=""
        onBack={vi.fn()}
        onCreateDocument={vi.fn(async () => documentRecord())}
        onOpenDocument={vi.fn(async () => documentRecord())}
        onUpdateDocument={vi.fn(async () => documentRecord())}
        onDeleteDocument={vi.fn(async () => undefined)}
        onRevealDocument={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText('Open task')).toBeInTheDocument();
    expect(screen.getByText('Unlinked')).toBeInTheDocument();
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

  it('inserts workspace entity mentions into Markdown documents', async () => {
    const user = userEvent.setup();
    const opened = documentRecord({ body: '# Project doc\n\n' });
    const openDocument = vi.fn(async () => opened);
    const updateDocument = vi.fn(async (input) =>
      documentRecord({ title: input.title, body: input.body }),
    );
    render(
      <DocumentsPage
        documents={[documentListItem()]}
        mentionEntities={mentionEntities}
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
    await user.click(screen.getByLabelText('Mention entity'));
    await user.click(screen.getByRole('button', { name: /Launch checklist/ }));

    await waitFor(
      () =>
        expect(updateDocument).toHaveBeenCalledWith({
          documentId: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
          title: 'Project doc',
          body: '# Project doc\n\n@[Launch checklist](f5://todo/task_bbbbbbbbbbbbbbbbbbbbbbbb) ',
        }),
      { timeout: 1500 },
    );
  });

  it('renders workspace entity mentions inside Markdown previews as openable chips', () => {
    const openEntity = vi.fn();
    render(
      <MarkdownPreview
        body="Review @[Launch checklist](f5://todo/task_bbbbbbbbbbbbbbbbbbbbbbbb)."
        mentionEntities={mentionEntities}
        onOpenEntity={openEntity}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open TODO: Launch checklist' }));

    expect(openEntity).toHaveBeenCalledWith({
      kind: 'todo',
      id: 'task_bbbbbbbbbbbbbbbbbbbbbbbb',
      label: 'Launch checklist',
      uri: 'f5://todo/task_bbbbbbbbbbbbbbbbbbbbbbbb',
    });
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

  it('adds, resolves, edits, and deletes Markdown document comments', async () => {
    const user = userEvent.setup();
    const opened = documentRecord();
    const createComment = vi.fn(async () => undefined);
    const updateComment = vi.fn(async () => undefined);
    const deleteComment = vi.fn(async () => undefined);
    render(
      <DocumentsPage
        documents={[documentListItem()]}
        comments={[documentComment()]}
        query=""
        onBack={vi.fn()}
        onCreateDocument={vi.fn(async () => opened)}
        onOpenDocument={vi.fn(async () => opened)}
        onUpdateDocument={vi.fn(async () => opened)}
        onDeleteDocument={vi.fn(async () => undefined)}
        onRevealDocument={vi.fn(async () => undefined)}
        onCreateDocumentComment={createComment}
        onUpdateDocumentComment={updateComment}
        onDeleteDocumentComment={deleteComment}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Project doc' }));
    expect(await screen.findByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Please clarify this section.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('New document comment'), 'Looks good after edits.');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));
    expect(createComment).toHaveBeenCalledWith({
      documentId: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
      body: 'Looks good after edits.',
    });

    await user.click(screen.getByLabelText('Resolve comment'));
    expect(updateComment).toHaveBeenCalledWith({
      commentId: 'comment_aaaaaaaaaaaaaaaaaaaaaaaa',
      body: 'Please clarify this section.',
      status: 'resolved',
    });

    await user.click(screen.getByLabelText('Edit comment'));
    await user.clear(screen.getByLabelText('Edit document comment'));
    await user.type(screen.getByLabelText('Edit document comment'), 'Resolved after rewrite.');
    await user.click(screen.getByRole('button', { name: 'Save comment' }));
    expect(updateComment).toHaveBeenCalledWith({
      commentId: 'comment_aaaaaaaaaaaaaaaaaaaaaaaa',
      body: 'Resolved after rewrite.',
      status: 'open',
    });

    await user.click(screen.getByLabelText('Delete comment'));
    expect(deleteComment).toHaveBeenCalledWith({ commentId: 'comment_aaaaaaaaaaaaaaaaaaaaaaaa' });
  });

  it('creates Markdown document comments for selected editor text', async () => {
    const user = userEvent.setup();
    const opened = documentRecord();
    const createComment = vi.fn(async () => undefined);
    render(
      <DocumentsPage
        documents={[documentListItem()]}
        comments={[]}
        query=""
        onBack={vi.fn()}
        onCreateDocument={vi.fn(async () => opened)}
        onOpenDocument={vi.fn(async () => opened)}
        onUpdateDocument={vi.fn(async () => opened)}
        onDeleteDocument={vi.fn(async () => undefined)}
        onRevealDocument={vi.fn(async () => undefined)}
        onCreateDocumentComment={createComment}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Project doc' }));
    const editor = await screen.findByLabelText('Document markdown');
    (editor as HTMLTextAreaElement).setSelectionRange(2, 13);
    fireEvent.select(editor);
    fireEvent.mouseUp(editor);

    expect(screen.getByText('Selected text')).toBeInTheDocument();

    await user.type(screen.getByLabelText('New document comment'), 'Can this be clearer?');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));
    expect(createComment).toHaveBeenCalledWith({
      documentId: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
      anchorText: 'Project doc',
      anchorStart: 2,
      anchorEnd: 13,
      body: 'Can this be clearer?',
    });
  });

  it('creates Markdown document comments for selected preview text', async () => {
    const user = userEvent.setup();
    const opened = documentRecord();
    const createComment = vi.fn(async () => undefined);
    const getSelection = vi.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => 'Hello',
    } as Selection);
    render(
      <DocumentsPage
        documents={[documentListItem()]}
        comments={[]}
        query=""
        onBack={vi.fn()}
        onCreateDocument={vi.fn(async () => opened)}
        onOpenDocument={vi.fn(async () => opened)}
        onUpdateDocument={vi.fn(async () => opened)}
        onDeleteDocument={vi.fn(async () => undefined)}
        onRevealDocument={vi.fn(async () => undefined)}
        onCreateDocumentComment={createComment}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Project doc' }));
    fireEvent.mouseUp(await screen.findByText('Hello'));
    await user.type(screen.getByLabelText('New document comment'), 'Preview note.');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    expect(createComment).toHaveBeenCalledWith({
      documentId: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
      anchorText: 'Hello',
      anchorStart: 15,
      anchorEnd: 20,
      body: 'Preview note.',
    });
    getSelection.mockRestore();
  });

  it('shows anchored comments in the preview and locates them in the editor', async () => {
    const user = userEvent.setup();
    const opened = documentRecord();
    render(
      <DocumentsPage
        documents={[documentListItem()]}
        comments={[
          documentComment({
            anchorText: 'Hello',
            anchorStart: 15,
            anchorEnd: 20,
          }),
        ]}
        query=""
        onBack={vi.fn()}
        onCreateDocument={vi.fn(async () => opened)}
        onOpenDocument={vi.fn(async () => opened)}
        onUpdateDocument={vi.fn(async () => opened)}
        onDeleteDocument={vi.fn(async () => undefined)}
        onRevealDocument={vi.fn(async () => undefined)}
        onCreateDocumentComment={vi.fn(async () => undefined)}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Project doc' }));
    expect(await screen.findByLabelText('Commented text: Hello')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Show comment anchor'));
    const editor = screen.getByLabelText('Document markdown') as HTMLTextAreaElement;
    expect(editor.selectionStart).toBe(15);
    expect(editor.selectionEnd).toBe(20);
  });

  it('sends Markdown documents to the active Agent', async () => {
    const user = userEvent.setup();
    const opened = documentRecord();
    const sendToAgent = vi.fn(async () => undefined);
    render(
      <DocumentsPage
        documents={[documentListItem()]}
        comments={[]}
        query=""
        agentName="Codex"
        canSendToAgent
        onBack={vi.fn()}
        onCreateDocument={vi.fn(async () => opened)}
        onOpenDocument={vi.fn(async () => opened)}
        onUpdateDocument={vi.fn(async () => opened)}
        onDeleteDocument={vi.fn(async () => undefined)}
        onRevealDocument={vi.fn(async () => undefined)}
        onSendToAgent={sendToAgent}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Project doc' }));
    await user.click(screen.getByRole('button', { name: 'Send to Agent' }));

    expect(sendToAgent).toHaveBeenCalledWith(expect.stringContaining('Document: Project doc'));
    expect(sendToAgent).toHaveBeenCalledWith(expect.stringContaining('# Project doc'));
  });

  it('mentions the active Agent from document comments', async () => {
    const user = userEvent.setup();
    const opened = documentRecord();
    const createComment = vi.fn(async () => undefined);
    const sendToAgent = vi.fn(async () => undefined);
    render(
      <DocumentsPage
        documents={[documentListItem()]}
        comments={[
          documentComment({
            anchorText: 'Hello',
            anchorStart: 15,
            anchorEnd: 20,
          }),
        ]}
        query=""
        agentName="Codex"
        canSendToAgent
        onBack={vi.fn()}
        onCreateDocument={vi.fn(async () => opened)}
        onOpenDocument={vi.fn(async () => opened)}
        onUpdateDocument={vi.fn(async () => opened)}
        onDeleteDocument={vi.fn(async () => undefined)}
        onRevealDocument={vi.fn(async () => undefined)}
        onCreateDocumentComment={createComment}
        onSendToAgent={sendToAgent}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Project doc' }));
    await user.click(screen.getByLabelText('Send comment to Agent'));
    expect(sendToAgent).toHaveBeenCalledWith(
      expect.stringContaining('Please clarify this section.'),
    );
    expect(sendToAgent).toHaveBeenCalledWith(expect.stringContaining('Selected text'));

    await user.type(screen.getByLabelText('New document comment'), 'Please rewrite this.');
    await user.click(screen.getByRole('button', { name: '@ Agent' }));
    expect(createComment).toHaveBeenCalledWith({
      documentId: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
      body: 'Please rewrite this.',
    });
    expect(sendToAgent).toHaveBeenLastCalledWith(expect.stringContaining('Please rewrite this.'));
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
