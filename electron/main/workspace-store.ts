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
  deleteConversationInputSchema,
  messageMetaSchema,
  profileSchema,
} from '../../src/shared/schemas';
import type {
  ArchiveConversationInput,
  AgentConfig,
  AgentsFile,
  ConversationIndex,
  ConversationListItem,
  ConversationMeta,
  ConversationState,
  CreateConversationInput,
  DeleteConversationInput,
  MessageMeta,
  MessageRecord,
  OpenConversation,
  RenameConversationInput,
  StarConversationInput,
  UpdateProfileInput,
  UserProfile,
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

export function makeLocalId(prefix: 'conv' | 'msg' | 'turn' | 'tool' | 'plan'): string {
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
    await this.ensureAgentsFile();
    await this.ensureProfile();
    await this.rebuildIndex();
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
      };
      await atomicWriteJson(profilePath, profile);
      return profile;
    }
    const parsed = profileSchema.safeParse(JSON.parse(await readFile(profilePath, 'utf8')));
    if (parsed.success) return parsed.data;
    const repaired: UserProfile = {
      schema: 'f5.profile.v1',
      displayName: 'You',
      defaultAgentId: defaultAgentsFile.defaultAgentId,
      workspacePath: this.workspacePath,
      theme: 'light',
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

  async createConversation(input: CreateConversationInput = {}): Promise<OpenConversation> {
    await this.ensureWorkspace();
    const agent = input.agentId ? await this.getAgent(input.agentId) : await this.getDefaultAgent();
    const id = makeLocalId('conv');
    const timestamp = nowIso();
    const title = input.title?.trim() || titleFromPrompt(input.firstPrompt) || 'New conversation';
    const meta: ConversationMeta = {
      schema: 'f5.conversation.v1',
      id,
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

function safeFileName(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'conversation'
  );
}
