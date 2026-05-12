import matter from 'gray-matter';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ConversationEngine } from '../../electron/main/conversation-engine';
import {
  defaultAgentsFile,
  makeLocalId,
  messageFileName,
  WorkspaceStore,
} from '../../electron/main/workspace-store';
import {
  conversationMetaSchema,
  deleteConversationInputSchema,
  deleteDocumentCommentInputSchema,
  deleteDocumentInputSchema,
  deleteTaskListInputSchema,
  deleteTaskInputSchema,
  documentCommentIndexSchema,
  documentCommentRecordSchema,
  documentIndexSchema,
  documentRecordSchema,
  messageMetaSchema,
  sendMessageInputSchema,
  taskIndexSchema,
  taskListIndexSchema,
  taskListRecordSchema,
  taskRecordSchema,
} from './schemas';

describe('WorkspaceStore', () => {
  it('creates, persists, indexes, and reloads markdown conversations', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-store-test-'));
    const store = new WorkspaceStore(workspacePath);
    const conversation = await store.createConversation({
      title: 'Storage test',
      agentId: 'codex-acp-real',
    });
    const message = await store.addMessage({
      conversationId: conversation.conversation.id,
      role: 'user',
      agentId: conversation.agent.id,
      status: 'completed',
      body: 'A readable Markdown prompt',
    });
    await store.addMessage({
      conversationId: conversation.conversation.id,
      role: 'assistant',
      agentId: conversation.agent.id,
      status: 'completed',
      body: 'A readable Markdown response',
    });

    const conversationPath = join(
      workspacePath,
      'conversations',
      conversation.conversation.id,
      'conversation.md',
    );
    const messagePath = join(
      workspacePath,
      'conversations',
      conversation.conversation.id,
      'messages',
      messageFileName(message.meta.sequence, message.meta.role, message.meta.id),
    );
    conversationMetaSchema.parse(matter(await readFile(conversationPath, 'utf8')).data);
    messageMetaSchema.parse(matter(await readFile(messagePath, 'utf8')).data);

    const restarted = new WorkspaceStore(workspacePath);
    await restarted.ensureWorkspace();
    const open = await restarted.openConversation(conversation.conversation.id);
    expect(open.messages.map((record) => record.body)).toEqual([
      'A readable Markdown prompt',
      'A readable Markdown response',
    ]);

    const index = JSON.parse(await readFile(join(workspacePath, 'index.json'), 'utf8'));
    expect(index.conversations[0].messageCount).toBe(2);
  });

  it('rejects path-like local ids before filesystem operations', async () => {
    expect(() =>
      sendMessageInputSchema.parse({
        conversationId: 'conv_../../outside',
        content: 'do not leave the workspace',
      }),
    ).toThrow();
    expect(() =>
      deleteConversationInputSchema.parse({
        conversationId: 'conv_../../outside',
      }),
    ).toThrow();
    expect(() =>
      deleteTaskInputSchema.parse({
        taskId: 'task_../../outside',
      }),
    ).toThrow();
    expect(() =>
      deleteTaskListInputSchema.parse({
        taskListId: 'tasklist_../../outside',
      }),
    ).toThrow();
    expect(() =>
      deleteDocumentInputSchema.parse({
        documentId: 'doc_../../outside',
      }),
    ).toThrow();
    expect(() =>
      deleteDocumentCommentInputSchema.parse({
        commentId: 'comment_../../outside',
      }),
    ).toThrow();
  });

  it('repairs invalid conversation frontmatter in the list without hiding other conversations', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-invalid-frontmatter-test-'));
    const store = new WorkspaceStore(workspacePath);
    const broken = await store.createConversation({ title: 'Broken metadata' });
    await store.createConversation({ title: 'Healthy metadata' });
    await writeFile(
      join(workspacePath, 'conversations', broken.conversation.id, 'conversation.md'),
      '---\nschema: wrong\n---\n# Broken\n',
      'utf8',
    );

    const list = await store.listConversations();
    expect(list.some((conversation) => conversation.status === 'needs_repair')).toBe(true);
    expect(list.some((conversation) => conversation.title === 'Healthy metadata')).toBe(true);
  });

  it('persists profile settings and rebuilds the derived index', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-profile-index-test-'));
    const store = new WorkspaceStore(workspacePath);
    await store.createConversation({ title: 'Profile index test' });
    const profile = await store.updateProfile({
      displayName: 'Local User',
      defaultAgentId: 'codex-cli-real',
      theme: 'dark',
      iconTheme: 'dark',
    });
    expect(profile.displayName).toBe('Local User');
    expect(profile.theme).toBe('dark');
    expect(profile.iconTheme).toBe('dark');

    const index = await store.rebuildIndex();
    expect(index.conversations.map((conversation) => conversation.title)).toContain(
      'Profile index test',
    );
  });

  it('creates, updates, indexes, reloads, and deletes workspace TODO markdown files', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-task-test-'));
    const store = new WorkspaceStore(workspacePath);
    const task = await store.createTask({
      title: 'Write implementation plan',
      body: 'Cover storage and UI.',
      agentId: 'codex-acp-real',
    });
    const updated = await store.updateTask({
      taskId: task.id,
      title: 'Write implementation plan and tests',
      body: 'Cover storage, UI, and smoke.',
      status: 'done',
      agentId: 'claude-code',
    });

    expect(updated.status).toBe('done');
    expect(updated.completedAt).toBeTruthy();
    expect(updated.agentId).toBe('claude-code');

    const taskPath = join(workspacePath, 'tasks', `${task.id}.md`);
    const rawTask = matter(await readFile(taskPath, 'utf8'));
    taskRecordSchema.parse({ ...rawTask.data, body: rawTask.content.trimEnd() });
    expect(rawTask.data.agentId).toBe('claude-code');
    expect(rawTask.content).toContain('Cover storage, UI, and smoke.');

    const taskIndex = taskIndexSchema.parse(
      JSON.parse(await readFile(join(workspacePath, 'tasks', 'index.json'), 'utf8')),
    );
    expect(taskIndex.tasks.map((item) => item.title)).toContain(
      'Write implementation plan and tests',
    );
    expect(taskIndex.tasks.find((item) => item.id === task.id)?.agentId).toBe('claude-code');

    const restarted = new WorkspaceStore(workspacePath);
    await restarted.ensureWorkspace();
    expect(await restarted.readTask(task.id)).toMatchObject({
      status: 'done',
      agentId: 'claude-code',
    });

    await restarted.deleteTask({ taskId: task.id });
    expect(await restarted.listTasks()).toHaveLength(0);
  });

  it('creates multiple TODO lists, indexes counts, and persists task membership', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-task-list-test-'));
    const store = new WorkspaceStore(workspacePath);
    const personal = await store.createTaskList({ title: 'Personal' });
    const launch = await store.createTaskList({ title: 'Launch' });
    const personalTask = await store.createTask({
      taskListId: personal.id,
      title: 'Buy keyboard',
      body: 'Low profile.',
    });
    await store.createTask({
      taskListId: launch.id,
      title: 'Ship release notes',
    });
    await store.updateTask({
      taskId: personalTask.id,
      title: 'Buy keyboard',
      body: 'Low profile.',
      status: 'done',
    });

    const lists = await store.listTaskLists();
    expect(lists.find((list) => list.id === personal.id)).toMatchObject({
      title: 'Personal',
      taskCount: 1,
      openCount: 0,
    });
    expect(lists.find((list) => list.id === launch.id)).toMatchObject({
      title: 'Launch',
      taskCount: 1,
      openCount: 1,
    });

    const taskRaw = matter(
      await readFile(join(workspacePath, 'tasks', `${personalTask.id}.md`), 'utf8'),
    );
    taskRecordSchema.parse({ ...taskRaw.data, body: taskRaw.content.trimEnd() });
    expect(taskRaw.data.listId).toBe(personal.id);

    const listRaw = matter(
      await readFile(join(workspacePath, 'tasks', 'lists', `${personal.id}.md`), 'utf8'),
    );
    taskListRecordSchema.parse(listRaw.data);

    const listIndex = taskListIndexSchema.parse(
      JSON.parse(await readFile(join(workspacePath, 'tasks', 'lists', 'index.json'), 'utf8')),
    );
    expect(listIndex.lists.map((list) => list.title)).toContain('Launch');

    const snapshot = await store.getSnapshot();
    expect(snapshot.taskLists.map((list) => list.title)).toEqual(
      expect.arrayContaining(['Personal', 'Launch']),
    );

    await store.deleteTaskList({ taskListId: launch.id });
    expect((await store.listTaskLists()).map((list) => list.title)).not.toContain('Launch');
    expect((await store.listTasks()).some((item) => item.listId === launch.id)).toBe(false);
  });

  it('creates, updates, indexes, reloads, and deletes workspace Markdown documents', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-document-test-'));
    const store = new WorkspaceStore(workspacePath);
    const document = await store.createDocument({
      title: 'Project notes',
      body: '# Project notes\n\nInitial notes.',
    });
    const updated = await store.updateDocument({
      documentId: document.id,
      title: 'Project notes v2',
      body: '# Project notes v2\n\nSaved Markdown.',
    });

    expect(updated.title).toBe('Project notes v2');
    const documentPath = join(workspacePath, 'documents', `${document.id}.md`);
    const rawDocument = matter(await readFile(documentPath, 'utf8'));
    documentRecordSchema.parse({ ...rawDocument.data, body: rawDocument.content.trimEnd() });
    expect(rawDocument.content).toContain('Saved Markdown.');

    const documentIndex = documentIndexSchema.parse(
      JSON.parse(await readFile(join(workspacePath, 'documents', 'index.json'), 'utf8')),
    );
    expect(documentIndex.documents.map((item) => item.title)).toContain('Project notes v2');

    const restarted = new WorkspaceStore(workspacePath);
    await restarted.ensureWorkspace();
    expect((await restarted.readDocument(document.id)).body).toContain('Saved Markdown.');

    await restarted.deleteDocument({ documentId: document.id });
    expect(await restarted.listDocuments()).toHaveLength(0);
  });

  it('creates, updates, indexes, reloads, and deletes Markdown document comments', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-document-comment-test-'));
    const store = new WorkspaceStore(workspacePath);
    const document = await store.createDocument({
      title: 'Commented doc',
      body: '# Commented doc\n',
    });
    const comment = await store.createDocumentComment({
      documentId: document.id,
      anchorText: 'Commented doc',
      anchorStart: 2,
      anchorEnd: 15,
      body: 'Clarify the opening paragraph.',
    });
    const updated = await store.updateDocumentComment({
      commentId: comment.id,
      body: 'Opening paragraph is clear now.',
      status: 'resolved',
    });

    expect(updated.status).toBe('resolved');
    expect(updated.authorName).toBe('You');

    const commentPath = join(workspacePath, 'documents', 'comments', `${comment.id}.md`);
    const rawComment = matter(await readFile(commentPath, 'utf8'));
    documentCommentRecordSchema.parse({
      ...rawComment.data,
      body: rawComment.content.trimEnd(),
    });
    expect(rawComment.data.documentId).toBe(document.id);
    expect(rawComment.data.anchorText).toBe('Commented doc');
    expect(rawComment.data.anchorStart).toBe(2);
    expect(rawComment.data.anchorEnd).toBe(15);
    expect(rawComment.content).toContain('Opening paragraph is clear now.');

    const commentIndex = documentCommentIndexSchema.parse(
      JSON.parse(
        await readFile(join(workspacePath, 'documents', 'comments', 'index.json'), 'utf8'),
      ),
    );
    expect(commentIndex.comments.find((item) => item.id === comment.id)).toMatchObject({
      documentId: document.id,
      status: 'resolved',
      anchorText: 'Commented doc',
      anchorStart: 2,
      anchorEnd: 15,
      body: 'Opening paragraph is clear now.',
    });

    const restarted = new WorkspaceStore(workspacePath);
    await restarted.ensureWorkspace();
    expect((await restarted.listDocumentComments(document.id))[0]).toMatchObject({
      id: comment.id,
      status: 'resolved',
    });

    await restarted.deleteDocumentComment({ commentId: comment.id });
    expect(await restarted.listDocumentComments(document.id)).toHaveLength(0);

    const secondComment = await restarted.createDocumentComment({
      documentId: document.id,
      body: 'Remove with document.',
    });
    await restarted.deleteDocument({ documentId: document.id });
    expect(
      (await restarted.listDocumentComments()).some((item) => item.id === secondComment.id),
    ).toBe(false);
  });

  it('marks invalid TODO and document frontmatter as needing repair', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-resource-repair-test-'));
    const store = new WorkspaceStore(workspacePath);
    const task = await store.createTask({ title: 'Repair task' });
    const document = await store.createDocument({ title: 'Repair document' });

    await writeFile(
      join(workspacePath, 'tasks', `${task.id}.md`),
      '---\nschema: wrong\n---\n',
      'utf8',
    );
    await writeFile(
      join(workspacePath, 'documents', `${document.id}.md`),
      '---\nschema: wrong\n---\n',
      'utf8',
    );

    expect((await store.listTasks()).find((item) => item.id === task.id)?.repairStatus).toBe(
      'needs_repair',
    );
    expect(
      (await store.listDocuments()).find((item) => item.id === document.id)?.repairStatus,
    ).toBe('needs_repair');
  });

  it('adds the icon theme default to older profiles', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-profile-migration-test-'));
    const store = new WorkspaceStore(workspacePath);
    await store.ensureWorkspace();
    const profilePath = join(workspacePath, 'profile.json');
    await writeFile(
      profilePath,
      JSON.stringify({
        schema: 'f5.profile.v1',
        displayName: 'Older User',
        defaultAgentId: 'codex-cli-real',
        workspacePath,
        theme: 'dark',
      }),
      'utf8',
    );

    const profile = await store.ensureProfile();
    expect(profile.iconTheme).toBe('system');

    const persisted = JSON.parse(await readFile(profilePath, 'utf8'));
    expect(persisted.iconTheme).toBe('system');
  });

  it('falls back when the requested active conversation no longer exists', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-stale-active-test-'));
    const store = new WorkspaceStore(workspacePath);
    const existing = await store.createConversation({ title: 'Still here' });

    const snapshot = await store.getSnapshot('conv_000000000000000000000000');

    expect(snapshot.activeConversation?.conversation.id).toBe(existing.conversation.id);
  });

  it('migrates deprecated Codex CLI approval arguments from persisted agent config', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-agent-migration-test-'));
    const store = new WorkspaceStore(workspacePath);
    await store.ensureWorkspace();
    const agentsPath = join(workspacePath, 'agents', 'agents.json');
    await writeFile(
      agentsPath,
      JSON.stringify({
        ...defaultAgentsFile,
        agents: defaultAgentsFile.agents.map((agent) =>
          agent.id === 'codex-cli-real'
            ? {
                ...agent,
                args: [
                  'exec',
                  '--sandbox',
                  'read-only',
                  '--ask-for-approval',
                  'never',
                  '--skip-git-repo-check',
                ],
              }
            : agent,
        ),
      }),
      'utf8',
    );

    const agents = await store.loadAgents();
    const codex = agents.find((agent) => agent.id === 'codex-cli-real');
    expect(codex?.args).toEqual([
      'exec',
      '--json',
      '--sandbox',
      'read-only',
      '--skip-git-repo-check',
    ]);
    const persisted = await readFile(agentsPath, 'utf8');
    expect(persisted).not.toContain('--ask-for-approval');
    expect(persisted).toContain('--json');
  });

  it('exports a readable combined markdown file for a conversation', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-export-test-'));
    const store = new WorkspaceStore(workspacePath);
    const conversation = await store.createConversation({ title: 'Export / Test' });
    await store.addMessage({
      conversationId: conversation.conversation.id,
      role: 'user',
      agentId: conversation.agent.id,
      status: 'completed',
      body: 'Please export this prompt.',
    });
    await store.addMessage({
      conversationId: conversation.conversation.id,
      role: 'assistant',
      agentId: conversation.agent.id,
      status: 'completed',
      body: 'Exported response body.',
    });

    const exportPath = await store.exportConversation(conversation.conversation.id);
    const exported = await readFile(exportPath, 'utf8');
    expect(exportPath).toContain('/exports/');
    expect(exportPath).toContain('Export-Test');
    expect(exported).toContain('# Export / Test');
    expect(exported).toContain('Please export this prompt.');
    expect(exported).toContain('Exported response body.');
  });

  it('archives, restores, and deletes conversations through persisted markdown metadata', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-lifecycle-test-'));
    const store = new WorkspaceStore(workspacePath);
    const keep = await store.createConversation({ title: 'Keep this conversation' });
    const removable = await store.createConversation({ title: 'Remove this conversation' });

    await store.archiveConversation({
      conversationId: keep.conversation.id,
      archived: true,
    });
    const archivedMeta = await store.readConversationMeta(keep.conversation.id);
    expect(archivedMeta.status).toBe('archived');
    expect(
      (await store.listConversations()).find((item) => item.id === keep.conversation.id),
    ).toMatchObject({
      status: 'archived',
      title: 'Keep this conversation',
    });

    await store.archiveConversation({
      conversationId: keep.conversation.id,
      archived: false,
    });
    expect((await store.readConversationMeta(keep.conversation.id)).status).toBe('active');

    await store.deleteConversation({ conversationId: removable.conversation.id });
    await expect(
      stat(join(workspacePath, 'conversations', removable.conversation.id)),
    ).rejects.toThrow();
    expect(await store.listConversationIds()).toEqual([keep.conversation.id]);

    const index = JSON.parse(await readFile(join(workspacePath, 'index.json'), 'utf8'));
    expect(index.conversations.map((conversation: { id: string }) => conversation.id)).toEqual([
      keep.conversation.id,
    ]);
  });

  it('preserves user-written conversation markdown body when metadata changes', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-meta-body-test-'));
    const store = new WorkspaceStore(workspacePath);
    const conversation = await store.createConversation({ title: 'Body should stay' });
    const conversationPath = join(
      workspacePath,
      'conversations',
      conversation.conversation.id,
      'conversation.md',
    );
    const customBody = '# Body should stay\n\nUser note that belongs in this conversation file.\n';
    await writeFile(
      conversationPath,
      matter.stringify(customBody, conversation.conversation),
      'utf8',
    );

    await store.starConversation({
      conversationId: conversation.conversation.id,
      starred: true,
    });

    const raw = matter(await readFile(conversationPath, 'utf8'));
    expect(raw.content).toContain('User note that belongs in this conversation file.');
    expect(raw.data.starred).toBe(true);
  });

  it('records unavailable ACP turns honestly', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-engine-test-'));
    const store = new WorkspaceStore(workspacePath);
    const engine = new ConversationEngine(store);
    const snapshot = await engine.createConversation({
      title: 'Unavailable adapter test',
      agentId: 'codex-acp-real',
    });
    const conversationId = snapshot.activeConversation?.conversation.id;
    expect(conversationId).toBeTruthy();

    await engine.sendMessage({ conversationId: conversationId!, content: 'First prompt' });

    const idle = await engine.waitForIdle(conversationId!);
    expect(idle.messages.filter((message) => message.meta.status === 'failed')).toHaveLength(1);
    expect(idle.state.queue).toHaveLength(0);
  });

  it('emits snapshots for engine-managed workspace TODO and document operations', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-engine-resource-test-'));
    const store = new WorkspaceStore(workspacePath);
    const engine = new ConversationEngine(store);
    const send = vi.fn();
    engine.addWindow({
      on: vi.fn(),
      isDestroyed: () => false,
      webContents: { send },
    } as never);

    await engine.initialize();
    const createdTask = await engine.createTask({ title: 'Engine task', body: 'Engine notes' });
    const taskId = createdTask.tasks[0]?.id;
    expect(taskId).toBeTruthy();
    await engine.updateTask({
      taskId: taskId!,
      title: 'Engine task done',
      body: 'Updated notes',
      status: 'done',
    });

    const document = await engine.createDocument({
      title: 'Engine doc',
      body: '# Engine doc\n',
    });
    expect(await engine.openDocument(document.id)).toMatchObject({ title: 'Engine doc' });
    const updatedDocument = await engine.updateDocument({
      documentId: document.id,
      title: 'Engine doc saved',
      body: '# Saved\n',
    });
    expect(updatedDocument.title).toBe('Engine doc saved');
    expect(engine.documentPath(document.id)).toContain(`${document.id}.md`);

    await engine.deleteDocument({ documentId: document.id });
    await engine.deleteTask({ taskId: taskId! });
    expect(send).toHaveBeenCalledWith('workspace:snapshot', expect.any(Object));
  });

  it('reports skipped, passed, and failed agent connection checks', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-agent-check-test-'));
    const store = new WorkspaceStore(workspacePath);
    await store.ensureWorkspace();
    await writeFile(
      join(workspacePath, 'agents', 'agents.json'),
      JSON.stringify({
        schema: 'f5.agents.v1',
        defaultAgentId: 'available-agent',
        agents: [
          {
            id: 'available-agent',
            name: 'Available Agent',
            kind: 'codex-cli',
            command: process.execPath,
            args: [],
            cwd: workspacePath,
            enabled: true,
            availability: 'available',
          },
          {
            id: 'unavailable-agent',
            name: 'Unavailable Agent',
            kind: 'codex-cli',
            command: 'missing-command',
            args: [],
            cwd: workspacePath,
            enabled: true,
            availability: 'unavailable',
          },
          {
            id: 'disabled-agent',
            name: 'Disabled Agent',
            kind: 'codex-cli',
            command: 'disabled-command',
            args: [],
            cwd: workspacePath,
            enabled: false,
            availability: 'disabled',
          },
        ],
      }),
      'utf8',
    );
    const engine = new ConversationEngine(store);

    await expect(engine.testAgentConnection('available-agent')).resolves.toMatchObject({
      ok: true,
      status: 'passed',
    });
    await expect(engine.testAgentConnection('unavailable-agent')).resolves.toMatchObject({
      ok: false,
      status: 'failed',
    });
    await expect(engine.testAgentConnection('disabled-agent')).resolves.toMatchObject({
      ok: false,
      status: 'skipped',
    });
  });

  it('marks Codex CLI process failures on the streaming assistant message', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-codex-failure-test-'));
    const store = new WorkspaceStore(workspacePath);
    await store.ensureWorkspace();
    const failScript = join(workspacePath, 'fail-codex.cjs');
    await writeFile(
      failScript,
      [
        "process.stderr.write('codex failed intentionally');",
        'setTimeout(() => process.exit(9), 20);',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(workspacePath, 'agents', 'agents.json'),
      JSON.stringify({
        schema: 'f5.agents.v1',
        defaultAgentId: 'fail-codex',
        agents: [
          {
            id: 'fail-codex',
            name: 'Fail Codex',
            kind: 'codex-cli',
            command: process.execPath,
            args: [failScript],
            cwd: workspacePath,
            enabled: true,
            availability: 'available',
            protocolVersion: 'Codex CLI',
          },
        ],
      }),
      'utf8',
    );

    const engine = new ConversationEngine(store);
    const snapshot = await engine.createConversation({
      title: 'Failure test',
      agentId: 'fail-codex',
    });
    const conversationId = snapshot.activeConversation?.conversation.id;
    expect(conversationId).toBeTruthy();
    await engine.sendMessage({ conversationId: conversationId!, content: 'fail please' });

    const idle = await engine.waitForIdle(conversationId!);
    const assistant = idle.messages.find((message) => message.meta.role === 'assistant');
    expect(assistant).toMatchObject({
      body: 'codex failed intentionally',
      meta: { status: 'failed', errorMessage: 'codex failed intentionally' },
    });
  });

  it('times out when a conversation remains busy', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-idle-timeout-test-'));
    const store = new WorkspaceStore(workspacePath);
    const engine = new ConversationEngine(store);
    const snapshot = await engine.createConversation({ title: 'Busy conversation' });
    const conversationId = snapshot.activeConversation?.conversation.id;
    expect(conversationId).toBeTruthy();
    const state = await store.readState(conversationId!);
    state.activeTurnId = makeLocalId('turn');
    await store.writeState(state);

    await expect(engine.waitForIdle(conversationId!, 20)).rejects.toThrow('did not become idle');
  });

  it('queues new prompts when a real adapter turn is already active', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-queue-test-'));
    const store = new WorkspaceStore(workspacePath);
    const engine = new ConversationEngine(store);
    const snapshot = await engine.createConversation({ title: 'Queue test' });
    const conversationId = snapshot.activeConversation?.conversation.id;
    expect(conversationId).toBeTruthy();

    const state = await store.readState(conversationId!);
    state.activeTurnId = makeLocalId('turn');
    await store.writeState(state);
    const queued = await engine.sendMessage({
      conversationId: conversationId!,
      content: 'Second prompt',
    });
    expect(
      queued.activeConversation?.messages.some((message) => message.meta.status === 'queued'),
    ).toBe(true);
  });

  it('passes prior markdown messages to Codex CLI turns', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-context-test-'));
    const store = new WorkspaceStore(workspacePath);
    await store.ensureWorkspace();
    const captureScript = join(workspacePath, 'capture-codex.cjs');
    await writeFile(
      captureScript,
      [
        "const fs = require('node:fs');",
        "const outputIndex = process.argv.indexOf('--output-last-message');",
        'const outputPath = process.argv[outputIndex + 1];',
        'const prompt = process.argv.at(-1) || "";',
        "fs.writeFileSync(outputPath, prompt, 'utf8');",
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(workspacePath, 'agents', 'agents.json'),
      JSON.stringify({
        schema: 'f5.agents.v1',
        defaultAgentId: 'capture-codex',
        agents: [
          {
            id: 'capture-codex',
            name: 'Capture Codex',
            kind: 'codex-cli',
            command: process.execPath,
            args: [captureScript],
            cwd: workspacePath,
            enabled: true,
            availability: 'available',
            protocolVersion: 'Codex CLI',
          },
        ],
      }),
      'utf8',
    );

    const engine = new ConversationEngine(store);
    const snapshot = await engine.createConversation({
      title: 'Context test',
      agentId: 'capture-codex',
    });
    const conversationId = snapshot.activeConversation?.conversation.id;
    expect(conversationId).toBeTruthy();
    await store.addMessage({
      conversationId: conversationId!,
      role: 'user',
      agentId: 'capture-codex',
      status: 'completed',
      body: '帮我想一个 AI workspace 公司名',
    });
    await store.addMessage({
      conversationId: conversationId!,
      role: 'assistant',
      agentId: 'capture-codex',
      status: 'completed',
      body: '推荐 Northpane，因为它适合本地 AI workspace。',
    });

    await engine.sendMessage({ conversationId: conversationId!, content: 'then?' });
    const idle = await engine.waitForIdle(conversationId!);
    const generatedPrompt = idle.messages.at(-1)?.body ?? '';
    expect(generatedPrompt).toContain('## Conversation history');
    expect(generatedPrompt).toContain('帮我想一个 AI workspace 公司名');
    expect(generatedPrompt).toContain('推荐 Northpane');
    expect(generatedPrompt).toContain('## Latest user message');
    expect(generatedPrompt).toContain('then?');
  });

  it('streams Codex CLI JSONL updates into the assistant message before completion', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-codex-stream-test-'));
    const store = new WorkspaceStore(workspacePath);
    await store.ensureWorkspace();
    const streamScript = join(workspacePath, 'stream-codex.cjs');
    await writeFile(
      streamScript,
      [
        "const fs = require('node:fs');",
        "const outputIndex = process.argv.indexOf('--output-last-message');",
        'const outputPath = process.argv[outputIndex + 1];',
        "setTimeout(() => process.stdout.write(JSON.stringify({ type: 'agent_message_delta', delta: 'stream ' }) + '\\n'), 20);",
        "setTimeout(() => process.stdout.write(JSON.stringify({ type: 'agent_message_delta', delta: 'works' }) + '\\n'), 60);",
        "setTimeout(() => { fs.writeFileSync(outputPath, 'stream works final', 'utf8'); process.exit(0); }, 220);",
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(workspacePath, 'agents', 'agents.json'),
      JSON.stringify({
        schema: 'f5.agents.v1',
        defaultAgentId: 'stream-codex',
        agents: [
          {
            id: 'stream-codex',
            name: 'Stream Codex',
            kind: 'codex-cli',
            command: process.execPath,
            args: [streamScript],
            cwd: workspacePath,
            enabled: true,
            availability: 'available',
            protocolVersion: 'Codex CLI',
          },
        ],
      }),
      'utf8',
    );

    const engine = new ConversationEngine(store);
    const snapshot = await engine.createConversation({
      title: 'Stream test',
      agentId: 'stream-codex',
    });
    const conversationId = snapshot.activeConversation?.conversation.id;
    expect(conversationId).toBeTruthy();
    await engine.sendMessage({ conversationId: conversationId!, content: 'stream please' });

    const streamed = await waitForMessageBody(store, conversationId!, 'stream works');
    expect(streamed.meta.status).toBe('streaming');
    const idle = await engine.waitForIdle(conversationId!);
    expect(idle.messages.at(-1)?.body).toBe('stream works final');
  });

  it('cancels an active Codex CLI process without allowing a stale completed reply', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'f5-codex-cancel-test-'));
    const store = new WorkspaceStore(workspacePath);
    await store.ensureWorkspace();
    const slowScript = join(workspacePath, 'slow-codex.cjs');
    await writeFile(
      slowScript,
      [
        "const fs = require('node:fs');",
        "const outputIndex = process.argv.indexOf('--output-last-message');",
        'const outputPath = process.argv[outputIndex + 1];',
        "setTimeout(() => process.stdout.write(JSON.stringify({ type: 'agent_message_delta', delta: 'still running' }) + '\\n'), 20);",
        "setTimeout(() => { fs.writeFileSync(outputPath, 'stale completed body', 'utf8'); process.exit(0); }, 500);",
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(workspacePath, 'agents', 'agents.json'),
      JSON.stringify({
        schema: 'f5.agents.v1',
        defaultAgentId: 'slow-codex',
        agents: [
          {
            id: 'slow-codex',
            name: 'Slow Codex',
            kind: 'codex-cli',
            command: process.execPath,
            args: [slowScript],
            cwd: workspacePath,
            enabled: true,
            availability: 'available',
            protocolVersion: 'Codex CLI',
          },
        ],
      }),
      'utf8',
    );

    const engine = new ConversationEngine(store);
    const snapshot = await engine.createConversation({
      title: 'Cancel test',
      agentId: 'slow-codex',
    });
    const conversationId = snapshot.activeConversation?.conversation.id;
    expect(conversationId).toBeTruthy();
    await engine.sendMessage({ conversationId: conversationId!, content: 'cancel please' });
    await waitForMessageBody(store, conversationId!, 'still running');

    await engine.cancelActive(conversationId!);
    await sleep(650);

    const open = await store.openConversation(conversationId!);
    const assistant = open.messages.find((message) => message.meta.role === 'assistant');
    expect(assistant?.meta.status).toBe('cancelled');
    expect(assistant?.body).not.toContain('stale completed body');
    expect(open.state.activeTurnId).toBe('');
  });
});

async function waitForMessageBody(
  store: WorkspaceStore,
  conversationId: string,
  text: string,
): Promise<Awaited<ReturnType<WorkspaceStore['readMessages']>>[number]> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 1200) {
    const messages = await store.readMessages(conversationId);
    const match = messages.find((message) => message.body.includes(text));
    if (match) return match;
    await sleep(20);
  }
  throw new Error(`Timed out waiting for message body containing ${text}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
