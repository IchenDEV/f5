import matter from 'gray-matter';
import { constants } from 'node:fs';
import {
  access,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  agentConfigSchema,
  agentsFileSchema,
  conversationIdSchema,
  conversationMetaSchema,
  conversationStateSchema,
  createDocumentCommentInputSchema,
  deleteDocumentCommentInputSchema,
  deleteDocumentInputSchema,
  deleteConversationInputSchema,
  deleteTaskListInputSchema,
  deleteTaskInputSchema,
  documentCommentIdSchema,
  documentCommentIndexSchema,
  documentCommentRecordSchema,
  documentIdSchema,
  documentIndexSchema,
  documentRecordSchema,
  messageMetaSchema,
  profileSchema,
  taskIdSchema,
  taskIndexSchema,
  taskListIdSchema,
  taskListIndexSchema,
  taskListRecordSchema,
  taskRecordSchema,
} from '../../src/shared/schemas';
import { parseWorkspaceEntityMentions } from '../../src/shared/workspace-entities';
import type {
  ArchiveConversationInput,
  AgentConfig,
  AgentsFile,
  ConversationIndex,
  ConversationListItem,
  ConversationMeta,
  ConversationState,
  CreateConversationInput,
  CreateDocumentCommentInput,
  CreateDocumentInput,
  CreateTaskListInput,
  CreateTaskInput,
  DeleteConversationInput,
  DeleteDocumentCommentInput,
  DeleteDocumentInput,
  DeleteTaskListInput,
  DeleteTaskInput,
  DocumentCommentIndex,
  DocumentCommentListItem,
  DocumentCommentRecord,
  DocumentIndex,
  DocumentListItem,
  DocumentRecord,
  MessageMeta,
  MessageRecord,
  OpenConversation,
  RenameConversationInput,
  StarConversationInput,
  TaskIndex,
  TaskListItem,
  TaskListIndex,
  TaskListRecord,
  TaskListSummary,
  TaskRecord,
  UpdateDocumentCommentInput,
  UpdateDocumentInput,
  UpdateProfileInput,
  UpdateTaskListInput,
  UpdateTaskInput,
  UserProfile,
  WorkspaceEntityReference,
  WorkspaceEntityReferenceSource,
  WorkspaceSnapshot,
} from '../../src/shared/types';

const defaultAgent: AgentConfig = {
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

export function makeLocalId(
  prefix: 'conv' | 'msg' | 'turn' | 'tool' | 'plan' | 'task' | 'tasklist' | 'doc' | 'comment',
): string {
  return `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 24)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function conversationDir(workspacePath: string, conversationId: string): string {
  const parsed = conversationIdSchema.parse(conversationId);
  const root = resolve(workspacePath, 'conversations');
  const target = resolve(root, parsed);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`Conversation path escapes workspace: ${conversationId}`);
  }
  return target;
}

export function taskFilePath(workspacePath: string, taskId: string): string {
  const parsed = taskIdSchema.parse(taskId);
  const root = resolve(workspacePath, 'tasks');
  const target = resolve(root, `${parsed}.md`);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`Task path escapes workspace: ${taskId}`);
  }
  return target;
}

export function taskListFilePath(workspacePath: string, taskListId: string): string {
  const parsed = taskListIdSchema.parse(taskListId);
  const root = resolve(workspacePath, 'tasks', 'lists');
  const target = resolve(root, `${parsed}.md`);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`Task list path escapes workspace: ${taskListId}`);
  }
  return target;
}

export function documentFilePath(workspacePath: string, documentId: string): string {
  const parsed = documentIdSchema.parse(documentId);
  const root = resolve(workspacePath, 'documents');
  const target = resolve(root, `${parsed}.md`);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`Document path escapes workspace: ${documentId}`);
  }
  return target;
}

export function documentCommentFilePath(workspacePath: string, commentId: string): string {
  const parsed = documentCommentIdSchema.parse(commentId);
  const root = resolve(workspacePath, 'documents', 'comments');
  const target = resolve(root, `${parsed}.md`);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`Document comment path escapes workspace: ${commentId}`);
  }
  return target;
}

export function messageFileName(sequence: number, role: string, messageId: string): string {
  return `${String(sequence).padStart(6, '0')}-${role}-${messageId}.md`;
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function atomicWriteFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
  await writeFile(tempPath, content, 'utf8');
  await rename(tempPath, path);
}

export async function atomicWriteJson(path: string, value: unknown): Promise<void> {
  await atomicWriteFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function markdownWithFrontmatter(meta: Record<string, unknown>, body: string): string {
  return matter.stringify(body.trimEnd() ? `${body.trimEnd()}\n` : '', meta);
}

function migrateAgentsFile(file: AgentsFile): { file: AgentsFile; changed: boolean } {
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

export class WorkspaceStore {
  constructor(public readonly workspacePath: string) {}

  async ensureWorkspace(): Promise<void> {
    await mkdir(join(this.workspacePath, 'conversations'), { recursive: true });
    await mkdir(join(this.workspacePath, 'agents'), { recursive: true });
    await mkdir(join(this.workspacePath, 'tasks'), { recursive: true });
    await mkdir(join(this.workspacePath, 'tasks', 'lists'), { recursive: true });
    await mkdir(join(this.workspacePath, 'documents'), { recursive: true });
    await mkdir(join(this.workspacePath, 'documents', 'comments'), { recursive: true });
    await this.ensureAgentsFile();
    await this.ensureProfile();
    await this.ensureDefaultTaskList();
    await this.rebuildIndex();
    await this.rebuildTaskIndex();
    await this.rebuildTaskListIndex();
    await this.rebuildDocumentIndex();
    await this.rebuildDocumentCommentIndex();
  }

  async resetWorkspace(): Promise<void> {
    await rm(this.workspacePath, { force: true, recursive: true });
    await this.ensureWorkspace();
  }

  async ensureAgentsFile(): Promise<AgentsFile> {
    const agentsPath = join(this.workspacePath, 'agents', 'agents.json');
    if (!(await pathExists(agentsPath))) {
      await atomicWriteJson(agentsPath, defaultAgentsFile);
      return defaultAgentsFile;
    }
    try {
      const parsed = agentsFileSchema.parse(JSON.parse(await readFile(agentsPath, 'utf8')));
      const migrated = migrateAgentsFile(parsed);
      if (migrated.changed) await atomicWriteJson(agentsPath, migrated.file);
      return migrated.file;
    } catch {
      await atomicWriteJson(agentsPath, defaultAgentsFile);
      return defaultAgentsFile;
    }
  }

  async ensureProfile(): Promise<UserProfile> {
    const profilePath = join(this.workspacePath, 'profile.json');
    if (!(await pathExists(profilePath))) {
      const profile: UserProfile = {
        schema: 'f5.profile.v1',
        displayName: 'You',
        defaultAgentId: defaultAgentsFile.defaultAgentId,
        workspacePath: this.workspacePath,
        theme: 'light',
        iconTheme: 'system',
      };
      await atomicWriteJson(profilePath, profile);
      return profile;
    }
    const raw = JSON.parse(await readFile(profilePath, 'utf8'));
    const parsed = profileSchema.safeParse(raw);
    if (parsed.success) {
      if (!('iconTheme' in raw)) await atomicWriteJson(profilePath, parsed.data);
      return parsed.data;
    }
    const repaired: UserProfile = {
      schema: 'f5.profile.v1',
      displayName: 'You',
      defaultAgentId: defaultAgentsFile.defaultAgentId,
      workspacePath: this.workspacePath,
      theme: 'light',
      iconTheme: 'system',
    };
    await atomicWriteJson(profilePath, repaired);
    return repaired;
  }

  async loadAgents(): Promise<AgentConfig[]> {
    const agentsFile = await this.ensureAgentsFile();
    return agentsFile.agents.map((agent) => {
      const parsed = agentConfigSchema.safeParse(agent);
      if (!parsed.success)
        return { ...defaultAgent, id: agent.id || 'invalid', availability: 'unavailable' };
      return {
        ...parsed.data,
        availability: parsed.data.enabled ? (parsed.data.availability ?? 'available') : 'disabled',
      };
    });
  }

  async getDefaultAgent(): Promise<AgentConfig> {
    const agentsFile = await this.ensureAgentsFile();
    const agents = await this.loadAgents();
    return (
      agents.find((agent) => agent.id === agentsFile.defaultAgentId) ?? agents[0] ?? defaultAgent
    );
  }

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    const agents = await this.loadAgents();
    const profilePath = join(this.workspacePath, 'profile.json');
    const current = await this.ensureProfile();
    const nextAgent = agents.find((agent) => agent.id === input.defaultAgentId) ?? agents[0];
    const next: UserProfile = {
      ...current,
      displayName: input.displayName,
      defaultAgentId: nextAgent?.id ?? current.defaultAgentId,
      theme: input.theme,
      iconTheme: input.iconTheme,
      workspacePath: this.workspacePath,
    };
    const parsed = profileSchema.parse(next);
    await atomicWriteJson(profilePath, parsed);
    return parsed;
  }

  async getAgent(agentId: string): Promise<AgentConfig> {
    const agents = await this.loadAgents();
    return agents.find((agent) => agent.id === agentId) ?? (await this.getDefaultAgent());
  }

  async createTask(input: CreateTaskInput): Promise<TaskRecord> {
    await this.ensureWorkspace();
    const timestamp = nowIso();
    const list = input.taskListId
      ? await this.readTaskList(input.taskListId)
      : await this.ensureDefaultTaskList();
    const defaultAgent = await this.getDefaultAgent();
    const assigneeId = input.agentId?.trim() || defaultAgent.id;
    const task: TaskRecord = {
      schema: 'f5.task.v1',
      id: makeLocalId('task'),
      listId: list.id,
      agentId: assigneeId,
      title: input.title.trim(),
      status: 'todo',
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: '',
      order: Date.now(),
      body: input.body?.trimEnd() ?? '',
    };
    await this.writeTask(task);
    await this.rebuildTaskIndex();
    await this.rebuildTaskListIndex();
    return task;
  }

  async updateTask(input: UpdateTaskInput): Promise<TaskRecord> {
    const current = await this.readTask(input.taskId);
    const timestamp = nowIso();
    const completedAt = input.status === 'done' ? current.completedAt || timestamp : '';
    const assigneeId = input.agentId?.trim() || current.agentId;
    const next: TaskRecord = {
      ...current,
      agentId: assigneeId,
      title: input.title.trim(),
      body: input.body.trimEnd(),
      status: input.status,
      updatedAt: timestamp,
      completedAt,
    };
    await this.writeTask(next);
    await this.rebuildTaskIndex();
    await this.rebuildTaskListIndex();
    return next;
  }

  async deleteTask(input: DeleteTaskInput): Promise<void> {
    const parsed = deleteTaskInputSchema.parse(input);
    const path = taskFilePath(this.workspacePath, parsed.taskId);
    await ensureRealPathInside(resolve(this.workspacePath, 'tasks'), path);
    await rm(path, { force: true });
    await this.rebuildTaskIndex();
    await this.rebuildTaskListIndex();
  }

  async readTask(taskId: string): Promise<TaskRecord> {
    const raw = matter(await readFile(taskFilePath(this.workspacePath, taskId), 'utf8'));
    const candidate = { ...raw.data, body: raw.content.trimEnd() };
    const parsed = taskRecordSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
    if (!('listId' in candidate) || !('agentId' in candidate)) {
      const listId =
        'listId' in candidate && typeof candidate.listId === 'string'
          ? candidate.listId
          : (await this.ensureDefaultTaskList()).id;
      const agentId =
        'agentId' in candidate && typeof candidate.agentId === 'string'
          ? candidate.agentId
          : (await this.getDefaultAgent()).id;
      const migrated = taskRecordSchema.parse({ ...candidate, listId, agentId });
      await this.writeTask(migrated);
      return migrated;
    }
    return taskRecordSchema.parse(candidate);
  }

  async writeTask(record: TaskRecord): Promise<void> {
    const parsed = taskRecordSchema.parse(record);
    const { body, ...meta } = parsed;
    await atomicWriteFile(
      taskFilePath(this.workspacePath, parsed.id),
      markdownWithFrontmatter(meta, body),
    );
  }

  async listTasks(): Promise<TaskListItem[]> {
    await mkdir(join(this.workspacePath, 'tasks'), { recursive: true });
    const files = (await readdir(join(this.workspacePath, 'tasks')))
      .filter((file) => file.endsWith('.md'))
      .filter((file) => taskIdSchema.safeParse(basename(file, '.md')).success)
      .sort();
    const items = await Promise.all(files.map((file) => this.readTaskListItem(file)));
    return items.sort((a, b) => a.order - b.order || b.updatedAt.localeCompare(a.updatedAt));
  }

  async rebuildTaskIndex(): Promise<TaskIndex> {
    const index: TaskIndex = {
      schema: 'f5.task.index.v1',
      tasks: await this.listTasks(),
      rebuiltAt: nowIso(),
    };
    await atomicWriteJson(
      join(this.workspacePath, 'tasks', 'index.json'),
      taskIndexSchema.parse(index),
    );
    return index;
  }

  private async readTaskListItem(file: string): Promise<TaskListItem> {
    const id = basename(file, '.md');
    try {
      return { ...(await this.readTask(id)), repairStatus: 'ok' };
    } catch {
      const timestamp = nowIso();
      const list = await this.ensureDefaultTaskList();
      const agent = await this.getDefaultAgent();
      return {
        schema: 'f5.task.v1',
        id: taskIdSchema.parse(id),
        listId: list.id,
        agentId: agent.id,
        title: basename(id),
        status: 'todo',
        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: '',
        order: Number.MAX_SAFE_INTEGER,
        body: 'This task needs repair.',
        repairStatus: 'needs_repair',
      };
    }
  }

  async ensureDefaultTaskList(): Promise<TaskListRecord> {
    await mkdir(join(this.workspacePath, 'tasks', 'lists'), { recursive: true });
    const existing = await this.listTaskListRecords();
    const firstHealthy = existing.sort((a, b) => a.order - b.order)[0];
    if (firstHealthy) return firstHealthy;
    const timestamp = nowIso();
    const list: TaskListRecord = {
      schema: 'f5.task-list.v1',
      id: makeLocalId('tasklist'),
      title: 'Inbox',
      createdAt: timestamp,
      updatedAt: timestamp,
      order: 0,
    };
    await this.writeTaskList(list);
    return list;
  }

  async createTaskList(input: CreateTaskListInput): Promise<TaskListRecord> {
    await this.ensureWorkspace();
    const timestamp = nowIso();
    const list: TaskListRecord = {
      schema: 'f5.task-list.v1',
      id: makeLocalId('tasklist'),
      title: input.title.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
      order: Date.now(),
    };
    await this.writeTaskList(list);
    await this.rebuildTaskListIndex();
    return list;
  }

  async updateTaskList(input: UpdateTaskListInput): Promise<TaskListRecord> {
    const current = await this.readTaskList(input.taskListId);
    const next: TaskListRecord = {
      ...current,
      title: input.title.trim(),
      updatedAt: nowIso(),
    };
    await this.writeTaskList(next);
    await this.rebuildTaskListIndex();
    return next;
  }

  async deleteTaskList(input: DeleteTaskListInput): Promise<void> {
    const parsed = deleteTaskListInputSchema.parse(input);
    const lists = await this.listTaskLists();
    if (lists.filter((list) => list.repairStatus === 'ok').length <= 1) {
      throw new Error('Cannot delete the only TODO list.');
    }
    const tasks = await this.listTasks();
    await Promise.all(
      tasks
        .filter((task) => task.listId === parsed.taskListId && task.repairStatus === 'ok')
        .map((task) => rm(taskFilePath(this.workspacePath, task.id), { force: true })),
    );
    const path = taskListFilePath(this.workspacePath, parsed.taskListId);
    await ensureRealPathInside(resolve(this.workspacePath, 'tasks', 'lists'), path);
    await rm(path, { force: true });
    await this.ensureDefaultTaskList();
    await this.rebuildTaskIndex();
    await this.rebuildTaskListIndex();
  }

  async readTaskList(taskListId: string): Promise<TaskListRecord> {
    const raw = matter(await readFile(taskListFilePath(this.workspacePath, taskListId), 'utf8'));
    return taskListRecordSchema.parse(raw.data);
  }

  async writeTaskList(record: TaskListRecord): Promise<void> {
    const parsed = taskListRecordSchema.parse(record);
    await atomicWriteFile(
      taskListFilePath(this.workspacePath, parsed.id),
      markdownWithFrontmatter(parsed, `# ${parsed.title}\n`),
    );
  }

  async listTaskLists(): Promise<TaskListSummary[]> {
    await this.ensureDefaultTaskList();
    const records = await this.listTaskListRecords();
    const tasks = await this.listTasks();
    const summaries = await Promise.all(
      records.map(async (record) => {
        const listTasks = tasks.filter((task) => task.listId === record.id);
        return {
          ...record,
          repairStatus: 'ok' as const,
          taskCount: listTasks.length,
          openCount: listTasks.filter((task) => task.status === 'todo').length,
        };
      }),
    );
    const repairItems = await this.listBrokenTaskLists();
    return [...summaries, ...repairItems].sort(
      (a, b) => a.order - b.order || b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  async rebuildTaskListIndex(): Promise<TaskListIndex> {
    const index: TaskListIndex = {
      schema: 'f5.task-list.index.v1',
      lists: await this.listTaskLists(),
      rebuiltAt: nowIso(),
    };
    await atomicWriteJson(
      join(this.workspacePath, 'tasks', 'lists', 'index.json'),
      taskListIndexSchema.parse(index),
    );
    return index;
  }

  private async listTaskListRecords(): Promise<TaskListRecord[]> {
    await mkdir(join(this.workspacePath, 'tasks', 'lists'), { recursive: true });
    const files = (await readdir(join(this.workspacePath, 'tasks', 'lists')))
      .filter((file) => file.endsWith('.md'))
      .filter((file) => taskListIdSchema.safeParse(basename(file, '.md')).success)
      .sort();
    const records = await Promise.all(
      files.map(async (file) => {
        try {
          return await this.readTaskList(basename(file, '.md'));
        } catch {
          return undefined;
        }
      }),
    );
    return records.filter((record): record is TaskListRecord => Boolean(record));
  }

  private async listBrokenTaskLists(): Promise<TaskListSummary[]> {
    const files = (await readdir(join(this.workspacePath, 'tasks', 'lists')))
      .filter((file) => file.endsWith('.md'))
      .filter((file) => taskListIdSchema.safeParse(basename(file, '.md')).success)
      .sort();
    const healthy = new Set((await this.listTaskListRecords()).map((record) => record.id));
    return files
      .map((file) => basename(file, '.md'))
      .filter((id) => !healthy.has(id))
      .map((id) => {
        const timestamp = nowIso();
        return {
          schema: 'f5.task-list.v1' as const,
          id: taskListIdSchema.parse(id),
          title: basename(id),
          createdAt: timestamp,
          updatedAt: timestamp,
          order: Number.MAX_SAFE_INTEGER,
          repairStatus: 'needs_repair' as const,
          taskCount: 0,
          openCount: 0,
        };
      });
  }

  async createDocument(input: CreateDocumentInput): Promise<DocumentRecord> {
    await this.ensureWorkspace();
    const timestamp = nowIso();
    const document: DocumentRecord = {
      schema: 'f5.document.v1',
      id: makeLocalId('doc'),
      taskId: input.taskId ?? '',
      title: input.title?.trim() || 'Untitled document',
      createdAt: timestamp,
      updatedAt: timestamp,
      body: input.body?.trimEnd() || '# Untitled document\n',
    };
    await this.writeDocument(document);
    await this.rebuildDocumentIndex();
    return document;
  }

  async updateDocument(input: UpdateDocumentInput): Promise<DocumentRecord> {
    const current = await this.readDocument(input.documentId);
    const next: DocumentRecord = {
      ...current,
      title: input.title.trim(),
      body: input.body.trimEnd(),
      updatedAt: nowIso(),
    };
    await this.writeDocument(next);
    await this.rebuildDocumentIndex();
    return next;
  }

  async deleteDocument(input: DeleteDocumentInput): Promise<void> {
    const parsed = deleteDocumentInputSchema.parse(input);
    const path = documentFilePath(this.workspacePath, parsed.documentId);
    await ensureRealPathInside(resolve(this.workspacePath, 'documents'), path);
    const comments = await this.listDocumentComments(parsed.documentId);
    await rm(path, { force: true });
    await Promise.all(
      comments.map((comment) =>
        rm(documentCommentFilePath(this.workspacePath, comment.id), { force: true }),
      ),
    );
    await this.rebuildDocumentIndex();
    await this.rebuildDocumentCommentIndex();
  }

  async readDocument(documentId: string): Promise<DocumentRecord> {
    const raw = matter(await readFile(documentFilePath(this.workspacePath, documentId), 'utf8'));
    return documentRecordSchema.parse({ ...raw.data, body: raw.content.trimEnd() });
  }

  async writeDocument(record: DocumentRecord): Promise<void> {
    const parsed = documentRecordSchema.parse(record);
    const { body, ...meta } = parsed;
    await atomicWriteFile(
      documentFilePath(this.workspacePath, parsed.id),
      markdownWithFrontmatter(meta, body),
    );
  }

  async listDocuments(): Promise<DocumentListItem[]> {
    await mkdir(join(this.workspacePath, 'documents'), { recursive: true });
    const files = (await readdir(join(this.workspacePath, 'documents')))
      .filter((file) => file.endsWith('.md'))
      .filter((file) => documentIdSchema.safeParse(basename(file, '.md')).success)
      .sort();
    const items = await Promise.all(files.map((file) => this.readDocumentListItem(file)));
    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async rebuildDocumentIndex(): Promise<DocumentIndex> {
    const index: DocumentIndex = {
      schema: 'f5.document.index.v1',
      documents: await this.listDocuments(),
      rebuiltAt: nowIso(),
    };
    await atomicWriteJson(
      join(this.workspacePath, 'documents', 'index.json'),
      documentIndexSchema.parse(index),
    );
    return index;
  }

  async createDocumentComment(input: CreateDocumentCommentInput): Promise<DocumentCommentRecord> {
    const parsed = createDocumentCommentInputSchema.parse(input);
    await this.ensureWorkspace();
    await this.readDocument(parsed.documentId);
    const profile = await this.ensureProfile();
    const timestamp = nowIso();
    const comment: DocumentCommentRecord = {
      schema: 'f5.document-comment.v1',
      id: makeLocalId('comment'),
      documentId: parsed.documentId,
      anchorText: parsed.anchorText,
      anchorStart: parsed.anchorText ? parsed.anchorStart : 0,
      anchorEnd: parsed.anchorText ? parsed.anchorEnd : 0,
      authorName: profile.displayName,
      status: 'open',
      createdAt: timestamp,
      updatedAt: timestamp,
      body: parsed.body.trimEnd(),
    };
    await this.writeDocumentComment(comment);
    await this.rebuildDocumentCommentIndex();
    return comment;
  }

  async updateDocumentComment(input: UpdateDocumentCommentInput): Promise<DocumentCommentRecord> {
    const current = await this.readDocumentComment(input.commentId);
    const next: DocumentCommentRecord = {
      ...current,
      body: input.body.trimEnd(),
      status: input.status,
      updatedAt: nowIso(),
    };
    await this.writeDocumentComment(next);
    await this.rebuildDocumentCommentIndex();
    return next;
  }

  async deleteDocumentComment(input: DeleteDocumentCommentInput): Promise<void> {
    const parsed = deleteDocumentCommentInputSchema.parse(input);
    const path = documentCommentFilePath(this.workspacePath, parsed.commentId);
    await ensureRealPathInside(resolve(this.workspacePath, 'documents', 'comments'), path);
    await rm(path, { force: true });
    await this.rebuildDocumentCommentIndex();
  }

  async readDocumentComment(commentId: string): Promise<DocumentCommentRecord> {
    const raw = matter(
      await readFile(documentCommentFilePath(this.workspacePath, commentId), 'utf8'),
    );
    return documentCommentRecordSchema.parse({ ...raw.data, body: raw.content.trimEnd() });
  }

  async writeDocumentComment(record: DocumentCommentRecord): Promise<void> {
    const parsed = documentCommentRecordSchema.parse(record);
    const { body, ...meta } = parsed;
    await atomicWriteFile(
      documentCommentFilePath(this.workspacePath, parsed.id),
      markdownWithFrontmatter(meta, body),
    );
  }

  async listDocumentComments(documentId?: string): Promise<DocumentCommentListItem[]> {
    await mkdir(join(this.workspacePath, 'documents', 'comments'), { recursive: true });
    const files = (await readdir(join(this.workspacePath, 'documents', 'comments')))
      .filter((file) => file.endsWith('.md'))
      .filter((file) => documentCommentIdSchema.safeParse(basename(file, '.md')).success)
      .sort();
    const items = await Promise.all(files.map((file) => this.readDocumentCommentListItem(file)));
    return items
      .filter((comment) => !documentId || comment.documentId === documentId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async rebuildDocumentCommentIndex(): Promise<DocumentCommentIndex> {
    const index: DocumentCommentIndex = {
      schema: 'f5.document-comment.index.v1',
      comments: await this.listDocumentComments(),
      rebuiltAt: nowIso(),
    };
    await atomicWriteJson(
      join(this.workspacePath, 'documents', 'comments', 'index.json'),
      documentCommentIndexSchema.parse(index),
    );
    return index;
  }

  documentPath(documentId: string): string {
    return documentFilePath(this.workspacePath, documentId);
  }

  private async readDocumentCommentListItem(file: string): Promise<DocumentCommentListItem> {
    const id = basename(file, '.md');
    try {
      return { ...(await this.readDocumentComment(id)), repairStatus: 'ok' };
    } catch {
      const timestamp = nowIso();
      return {
        schema: 'f5.document-comment.v1',
        id: documentCommentIdSchema.parse(id),
        documentId: 'doc_000000000000000000000000',
        anchorText: '',
        anchorStart: 0,
        anchorEnd: 0,
        authorName: 'Unknown',
        status: 'open',
        createdAt: timestamp,
        updatedAt: timestamp,
        body: 'This comment needs repair.',
        repairStatus: 'needs_repair',
      };
    }
  }

  private async readDocumentListItem(file: string): Promise<DocumentListItem> {
    const id = basename(file, '.md');
    try {
      const document = await this.readDocument(id);
      return {
        schema: document.schema,
        id: document.id,
        taskId: document.taskId,
        title: document.title,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        repairStatus: 'ok',
      };
    } catch {
      const timestamp = nowIso();
      return {
        schema: 'f5.document.v1',
        id: documentIdSchema.parse(id),
        taskId: '',
        title: basename(id),
        createdAt: timestamp,
        updatedAt: timestamp,
        repairStatus: 'needs_repair',
      };
    }
  }

  async createConversation(input: CreateConversationInput = {}): Promise<OpenConversation> {
    await this.ensureWorkspace();
    const agent = input.agentId ? await this.getAgent(input.agentId) : await this.getDefaultAgent();
    const id = makeLocalId('conv');
    const timestamp = nowIso();
    const title = input.title?.trim() || titleFromPrompt(input.firstPrompt) || 'New conversation';
    const meta: ConversationMeta = {
      schema: 'f5.conversation.v1',
      id,
      taskId: input.taskId ?? '',
      title,
      agentId: agent.id,
      status: 'active',
      starred: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastMessageAt: timestamp,
      messageCount: 0,
    };
    const state: ConversationState = {
      schema: 'f5.state.v1',
      conversationId: id,
      acpSessionId: '',
      activeTurnId: '',
      queue: [],
      plan: [],
      tools: [],
    };
    const dir = conversationDir(this.workspacePath, id);
    await mkdir(join(dir, 'messages'), { recursive: true });
    await mkdir(join(dir, 'attachments'), { recursive: true });
    await this.writeConversationMeta(meta);
    await this.writeState(state);
    await this.rebuildIndex();
    return { conversation: meta, messages: [], state, agent };
  }

  async writeConversationMeta(meta: ConversationMeta): Promise<void> {
    const parsed = conversationMetaSchema.parse(meta);
    const path = join(conversationDir(this.workspacePath, parsed.id), 'conversation.md');
    const body = await this.nextConversationBody(path, parsed);
    await atomicWriteFile(path, markdownWithFrontmatter(parsed, body));
  }

  private async nextConversationBody(path: string, nextMeta: ConversationMeta): Promise<string> {
    if (!(await pathExists(path))) return defaultConversationBody(nextMeta);
    const existing = matter(await readFile(path, 'utf8'));
    const previousMeta = conversationMetaSchema.safeParse(existing.data);
    const trimmed = existing.content.trimEnd();
    if (!trimmed) return defaultConversationBody(nextMeta);
    if (previousMeta.success && trimmed === defaultConversationBody(previousMeta.data).trimEnd()) {
      return defaultConversationBody(nextMeta);
    }
    return `${trimmed}\n`;
  }

  async readConversationMeta(conversationId: string): Promise<ConversationMeta> {
    const raw = matter(
      await readFile(
        join(conversationDir(this.workspacePath, conversationId), 'conversation.md'),
        'utf8',
      ),
    );
    return conversationMetaSchema.parse(raw.data);
  }

  async writeState(state: ConversationState): Promise<void> {
    const parsed = conversationStateSchema.parse(state);
    await atomicWriteJson(
      join(conversationDir(this.workspacePath, parsed.conversationId), 'state.json'),
      parsed,
    );
  }

  async readState(conversationId: string): Promise<ConversationState> {
    const statePath = join(conversationDir(this.workspacePath, conversationId), 'state.json');
    if (!(await pathExists(statePath))) {
      const state: ConversationState = {
        schema: 'f5.state.v1',
        conversationId,
        acpSessionId: '',
        activeTurnId: '',
        queue: [],
        plan: [],
        tools: [],
      };
      await this.writeState(state);
      return state;
    }
    return conversationStateSchema.parse(JSON.parse(await readFile(statePath, 'utf8')));
  }

  async listConversationIds(): Promise<string[]> {
    await mkdir(join(this.workspacePath, 'conversations'), { recursive: true });
    const entries = await readdir(join(this.workspacePath, 'conversations'), {
      withFileTypes: true,
    });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  }

  async listConversations(): Promise<ConversationListItem[]> {
    const agents = await this.loadAgents();
    const ids = await this.listConversationIds();
    const items = await Promise.all(
      ids.map(async (id) => {
        try {
          const meta = await this.readConversationMeta(id);
          const messages = await this.readMessages(id);
          const agent = agents.find((candidate) => candidate.id === meta.agentId) ?? defaultAgent;
          const preview = messages.at(-1)?.body.slice(0, 140) ?? '';
          return {
            ...meta,
            agentName: agent.name,
            agentStatus: agent.availability ?? 'available',
            preview,
          };
        } catch {
          const timestamp = nowIso();
          return {
            schema: 'f5.conversation.v1' as const,
            id,
            taskId: '',
            title: basename(id),
            agentId: defaultAgent.id,
            status: 'needs_repair' as const,
            starred: false,
            createdAt: timestamp,
            updatedAt: timestamp,
            lastMessageAt: timestamp,
            messageCount: 0,
            agentName: defaultAgent.name,
            agentStatus: 'available' as const,
            preview: 'This conversation needs repair.',
          };
        }
      }),
    );
    return items.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  }

  async rebuildIndex(): Promise<ConversationIndex> {
    const index: ConversationIndex = {
      schema: 'f5.index.v1',
      conversations: await this.listConversations(),
      rebuiltAt: nowIso(),
    };
    await atomicWriteJson(join(this.workspacePath, 'index.json'), index);
    return index;
  }

  // Scans editable workspace text so the renderer can show backlinks without reparsing every view.
  async listEntityReferences(): Promise<WorkspaceEntityReference[]> {
    await this.ensureWorkspace();
    const [documents, tasks, comments, conversations] = await Promise.all([
      this.listDocuments(),
      this.listTasks(),
      this.listDocumentComments(),
      this.listConversations(),
    ]);
    const documentReferences = await Promise.all(
      documents.map(async (item) => {
        try {
          const document = await this.readDocument(item.id);
          return this.entityReferencesFromContent(
            document.body,
            {
              kind: 'document',
              id: document.id,
              label: document.title,
            },
            document.createdAt,
            document.updatedAt,
          );
        } catch {
          return [];
        }
      }),
    );
    const taskReferences = tasks.map((task) =>
      this.entityReferencesFromContent(
        task.body,
        {
          kind: 'todo',
          id: task.id,
          label: task.title,
        },
        task.createdAt,
        task.updatedAt,
      ),
    );
    const commentReferences = comments.map((comment) =>
      this.entityReferencesFromContent(
        comment.body,
        {
          kind: 'document-comment',
          id: comment.id,
          label: comment.anchorText || `Comment on ${comment.documentId}`,
          parentId: comment.documentId,
        },
        comment.createdAt,
        comment.updatedAt,
      ),
    );
    const messageReferences = await Promise.all(
      conversations.map(async (conversation) => {
        try {
          const messages = await this.readMessages(conversation.id);
          return messages.flatMap((message) =>
            this.entityReferencesFromContent(
              message.body,
              {
                kind: 'conversation-message',
                id: message.meta.id,
                label: `${conversation.title} #${message.meta.sequence}`,
                parentId: conversation.id,
              },
              message.meta.createdAt,
              message.meta.updatedAt,
            ),
          );
        } catch {
          return [];
        }
      }),
    );
    return [
      ...documentReferences.flat(),
      ...taskReferences.flat(),
      ...commentReferences.flat(),
      ...messageReferences.flat(),
    ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  private entityReferencesFromContent(
    content: string,
    source: WorkspaceEntityReferenceSource,
    createdAt: string,
    updatedAt: string,
  ): WorkspaceEntityReference[] {
    return parseWorkspaceEntityMentions(content).map((target) => ({
      source,
      target,
      excerpt: entityReferenceExcerpt(content, target.uri),
      createdAt,
      updatedAt,
    }));
  }

  async getSnapshot(activeConversationId?: string): Promise<WorkspaceSnapshot> {
    await this.ensureWorkspace();
    const conversations = await this.listConversations();
    const activeConversation = await this.resolveActiveConversation(
      activeConversationId,
      conversations,
    );
    return {
      workspacePath: this.workspacePath,
      profile: await this.ensureProfile(),
      agents: await this.loadAgents(),
      conversations,
      taskLists: await this.listTaskLists(),
      tasks: await this.listTasks(),
      documents: await this.listDocuments(),
      documentComments: await this.listDocumentComments(),
      entityReferences: await this.listEntityReferences(),
      activeConversation,
    };
  }

  private async resolveActiveConversation(
    activeConversationId: string | undefined,
    conversations: ConversationListItem[],
  ): Promise<OpenConversation | undefined> {
    const candidates = [
      activeConversationId,
      ...conversations
        .filter((conversation) => conversation.status !== 'needs_repair')
        .map((conversation) => conversation.id),
    ].filter((id): id is string => Boolean(id));
    for (const candidate of [...new Set(candidates)]) {
      try {
        return await this.openConversation(candidate);
      } catch {
        // A stale renderer id or corrupted folder should not block workspace startup.
      }
    }
    return undefined;
  }

  async openConversation(conversationId: string): Promise<OpenConversation> {
    const conversation = await this.readConversationMeta(conversationId);
    const messages = await this.readMessages(conversationId);
    const state = await this.readState(conversationId);
    const agent = await this.getAgent(conversation.agentId);
    return { conversation, messages, state, agent };
  }

  async readMessages(conversationId: string): Promise<MessageRecord[]> {
    const messagesDir = join(conversationDir(this.workspacePath, conversationId), 'messages');
    if (!(await pathExists(messagesDir))) return [];
    const files = (await readdir(messagesDir)).filter((file) => file.endsWith('.md')).sort();
    const messages = await Promise.all(
      files.map(async (file) => {
        const raw = matter(await readFile(join(messagesDir, file), 'utf8'));
        return {
          meta: messageMetaSchema.parse(raw.data),
          body: raw.content.trimEnd(),
        };
      }),
    );
    return messages.sort((a, b) => a.meta.sequence - b.meta.sequence);
  }

  async addMessage(params: {
    conversationId: string;
    role: MessageMeta['role'];
    agentId: string;
    turnId?: string;
    parentId?: string;
    status: MessageMeta['status'];
    body: string;
  }): Promise<MessageRecord> {
    const messages = await this.readMessages(params.conversationId);
    const sequence = messages.length + 1;
    const timestamp = nowIso();
    const meta: MessageMeta = {
      schema: 'f5.message.v1',
      id: makeLocalId('msg'),
      conversationId: params.conversationId,
      sequence,
      role: params.role,
      agentId: params.agentId,
      turnId: params.turnId ?? makeLocalId('turn'),
      parentId: params.parentId ?? '',
      status: params.status,
      createdAt: timestamp,
      updatedAt: timestamp,
      errorCode: '',
      errorMessage: '',
    };
    const record = { meta, body: params.body };
    await this.writeMessage(record);
    await this.touchConversation(params.conversationId);
    return record;
  }

  async writeMessage(record: MessageRecord): Promise<void> {
    const parsed = messageMetaSchema.parse(record.meta);
    await atomicWriteFile(
      join(
        conversationDir(this.workspacePath, parsed.conversationId),
        'messages',
        messageFileName(parsed.sequence, parsed.role, parsed.id),
      ),
      markdownWithFrontmatter(parsed, record.body),
    );
  }

  async updateMessageStatus(
    conversationId: string,
    messageId: string,
    status: MessageMeta['status'],
  ): Promise<void> {
    const messages = await this.readMessages(conversationId);
    const message = messages.find((candidate) => candidate.meta.id === messageId);
    if (!message) return;
    message.meta.status = status;
    message.meta.updatedAt = nowIso();
    await this.writeMessage(message);
    await this.touchConversation(conversationId);
  }

  async renameConversation(input: RenameConversationInput): Promise<OpenConversation> {
    const meta = await this.readConversationMeta(input.conversationId);
    meta.title = input.title;
    meta.updatedAt = nowIso();
    await this.writeConversationMeta(meta);
    await this.rebuildIndex();
    return this.openConversation(input.conversationId);
  }

  async starConversation(input: StarConversationInput): Promise<OpenConversation> {
    const meta = await this.readConversationMeta(input.conversationId);
    meta.starred = input.starred;
    meta.updatedAt = nowIso();
    await this.writeConversationMeta(meta);
    await this.rebuildIndex();
    return this.openConversation(input.conversationId);
  }

  async archiveConversation(input: ArchiveConversationInput): Promise<OpenConversation> {
    const meta = await this.readConversationMeta(input.conversationId);
    meta.status = input.archived ? 'archived' : 'active';
    meta.updatedAt = nowIso();
    await this.writeConversationMeta(meta);
    await this.rebuildIndex();
    return this.openConversation(input.conversationId);
  }

  async deleteConversation(input: DeleteConversationInput): Promise<void> {
    const parsed = deleteConversationInputSchema.parse(input);
    const dir = conversationDir(this.workspacePath, parsed.conversationId);
    await ensureRealPathInside(resolve(this.workspacePath, 'conversations'), dir);
    await rm(dir, {
      force: true,
      recursive: true,
    });
    await this.rebuildIndex();
  }

  async exportConversation(conversationId: string): Promise<string> {
    const open = await this.openConversation(conversationId);
    const exportDir = join(conversationDir(this.workspacePath, conversationId), 'exports');
    await mkdir(exportDir, { recursive: true });
    const fileName = `${safeFileName(open.conversation.title)}-${conversationId}.md`;
    const exportPath = join(exportDir, fileName);
    const body = [
      `# ${open.conversation.title}`,
      '',
      `- Conversation ID: ${open.conversation.id}`,
      `- Agent: ${open.agent.name}`,
      `- Created: ${open.conversation.createdAt}`,
      `- Updated: ${open.conversation.updatedAt}`,
      '',
      ...open.messages.flatMap((message) => [
        `## ${message.meta.role} · ${message.meta.createdAt}`,
        '',
        message.body,
        '',
      ]),
    ].join('\n');
    await atomicWriteFile(exportPath, body);
    return exportPath;
  }

  conversationPath(conversationId: string): string {
    return conversationDir(this.workspacePath, conversationId);
  }

  async touchConversation(conversationId: string): Promise<void> {
    const meta = await this.readConversationMeta(conversationId);
    const messages = await this.readMessages(conversationId);
    const timestamp = nowIso();
    meta.messageCount = messages.length;
    meta.lastMessageAt = messages.at(-1)?.meta.updatedAt ?? timestamp;
    meta.updatedAt = timestamp;
    await this.writeConversationMeta(meta);
    await this.rebuildIndex();
  }
}

function defaultConversationBody(meta: ConversationMeta): string {
  return `# ${meta.title}\n\nConversation ${meta.id} with ${meta.agentId}.\n`;
}

async function ensureRealPathInside(root: string, target: string): Promise<void> {
  await mkdir(root, { recursive: true });
  const rootReal = await realpath(root);
  let targetReal: string;
  try {
    targetReal = await realpath(target);
  } catch {
    const parentReal = await realpath(dirname(target));
    targetReal = resolve(parentReal, basename(target));
  }
  if (targetReal !== rootReal && !targetReal.startsWith(`${rootReal}${sep}`)) {
    throw new Error(`Path escapes workspace: ${target}`);
  }
}

function titleFromPrompt(prompt?: string): string {
  if (!prompt?.trim()) return '';
  const cleaned = prompt.trim().replace(/\s+/g, ' ');
  return cleaned.length > 44 ? `${cleaned.slice(0, 44)}...` : cleaned;
}

function entityReferenceExcerpt(content: string, uri: string): string {
  const index = content.indexOf(uri);
  if (index < 0) return content.trim().slice(0, 180);
  const start = Math.max(0, index - 80);
  const end = Math.min(content.length, index + uri.length + 80);
  return content.slice(start, end).replace(/\s+/g, ' ').trim();
}

function safeFileName(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'conversation'
  );
}
