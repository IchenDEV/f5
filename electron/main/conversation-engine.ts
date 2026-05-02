import type { BrowserWindow } from 'electron';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  archiveConversationInputSchema,
  cancelQueuedInputSchema,
  createConversationInputSchema,
  deleteConversationInputSchema,
  renameConversationInputSchema,
  sendMessageInputSchema,
  starConversationInputSchema,
  updateProfileInputSchema,
} from '../../src/shared/schemas';
import type {
  AgentConnectionTestResult,
  ArchiveConversationInput,
  CancelQueuedInput,
  CreateConversationInput,
  DeleteConversationInput,
  MessageRecord,
  OpenConversation,
  RenameConversationInput,
  SendMessageInput,
  StarConversationInput,
  UpdateProfileInput,
  WorkspaceSnapshot,
} from '../../src/shared/types';
import { AcpStdioClient } from './acp-client';
import { makeLocalId, nowIso, WorkspaceStore } from './workspace-store';

const CONTEXT_MESSAGE_LIMIT = 24;
const CONTEXT_CHAR_LIMIT = 30000;

interface ActiveTurn {
  cancelled: boolean;
  cancel?: () => void;
}

interface CodexStreamUpdate {
  text: string;
  mode: 'append' | 'replace';
}

export class ConversationEngine {
  private activeTurns = new Map<string, ActiveTurn>();
  private windows = new Set<BrowserWindow>();

  constructor(private readonly store: WorkspaceStore) {}

  addWindow(window: BrowserWindow): void {
    this.windows.add(window);
    window.on('closed', () => this.windows.delete(window));
  }

  async initialize(activeConversationId?: string): Promise<WorkspaceSnapshot> {
    await this.store.ensureWorkspace();
    return this.store.getSnapshot(activeConversationId);
  }

  async createConversation(input: CreateConversationInput): Promise<WorkspaceSnapshot> {
    const parsed = createConversationInputSchema.parse(input);
    const conversation = await this.store.createConversation(parsed);
    if (parsed.firstPrompt?.trim()) {
      await this.sendMessage({
        conversationId: conversation.conversation.id,
        content: parsed.firstPrompt,
      });
    }
    return this.emitSnapshot(conversation.conversation.id);
  }

  async openConversation(conversationId: string): Promise<OpenConversation> {
    return this.store.openConversation(conversationId);
  }

  async renameConversation(input: RenameConversationInput): Promise<WorkspaceSnapshot> {
    const parsed = renameConversationInputSchema.parse(input);
    await this.store.renameConversation(parsed);
    return this.emitSnapshot(parsed.conversationId);
  }

  async starConversation(input: StarConversationInput): Promise<WorkspaceSnapshot> {
    const parsed = starConversationInputSchema.parse(input);
    await this.store.starConversation(parsed);
    return this.emitSnapshot(parsed.conversationId);
  }

  async archiveConversation(input: ArchiveConversationInput): Promise<WorkspaceSnapshot> {
    const parsed = archiveConversationInputSchema.parse(input);
    await this.store.archiveConversation(parsed);
    return this.emitSnapshot(parsed.conversationId);
  }

  async deleteConversation(input: DeleteConversationInput): Promise<WorkspaceSnapshot> {
    const parsed = deleteConversationInputSchema.parse(input);
    await this.store.deleteConversation(parsed);
    return this.emitSnapshot();
  }

  conversationPath(conversationId: string): string {
    return this.store.conversationPath(conversationId);
  }

  exportConversation(conversationId: string): Promise<string> {
    return this.store.exportConversation(conversationId);
  }

  async updateProfile(input: UpdateProfileInput): Promise<WorkspaceSnapshot> {
    const parsed = updateProfileInputSchema.parse(input);
    await this.store.updateProfile(parsed);
    return this.emitSnapshot();
  }

  async testAgentConnection(agentId: string): Promise<AgentConnectionTestResult> {
    const agent = await this.store.getAgent(agentId);
    const checkedAt = nowIso();
    if (!agent.enabled || agent.availability === 'disabled') {
      return {
        agentId: agent.id,
        ok: false,
        status: 'skipped',
        checkedAt,
        detail: 'Agent is disabled in agents.json.',
        protocolVersion: agent.protocolVersion ?? 'Not initialized',
      };
    }
    return {
      agentId: agent.id,
      ok: agent.availability === 'available',
      status: agent.availability === 'available' ? 'passed' : 'failed',
      checkedAt,
      detail: `${agent.command} is configured. Run pnpm smoke:codex-acp for real adapter evidence.`,
      protocolVersion: agent.protocolVersion ?? 'ACP v1.0',
    };
  }

  async cancelQueued(input: CancelQueuedInput): Promise<WorkspaceSnapshot> {
    const parsed = cancelQueuedInputSchema.parse(input);
    const state = await this.store.readState(parsed.conversationId);
    state.queue = state.queue.filter((item) => item.messageId !== parsed.messageId);
    await this.store.writeState(state);
    await this.store.updateMessageStatus(parsed.conversationId, parsed.messageId, 'cancelled');
    return this.emitSnapshot(parsed.conversationId);
  }

  async cancelActive(conversationId: string): Promise<WorkspaceSnapshot> {
    const active = this.activeTurns.get(conversationId);
    const state = await this.store.readState(conversationId);
    const turnId = state.activeTurnId;
    if (active) {
      active.cancelled = true;
      active.cancel?.();
    }
    state.activeTurnId = '';
    await this.store.writeState(state);
    if (turnId) await this.markTurnCancelled(conversationId, turnId);
    this.activeTurns.delete(conversationId);
    await this.startNextQueued(conversationId);
    return this.emitSnapshot(conversationId);
  }

  async sendMessage(input: SendMessageInput): Promise<WorkspaceSnapshot> {
    const parsed = sendMessageInputSchema.parse(input);
    const open = await this.store.openConversation(parsed.conversationId);
    const state = open.state;
    const turnId = makeLocalId('turn');
    const status = state.activeTurnId ? 'queued' : 'active';
    const userMessage = await this.store.addMessage({
      conversationId: parsed.conversationId,
      role: 'user',
      agentId: open.conversation.agentId,
      turnId,
      status: status === 'queued' ? 'queued' : 'completed',
      body: parsed.content,
    });

    if (status === 'queued') {
      state.queue.push({
        messageId: userMessage.meta.id,
        turnId,
        status: 'queued',
        createdAt: nowIso(),
      });
      await this.store.writeState(state);
      return this.emitSnapshot(parsed.conversationId);
    }

    state.activeTurnId = turnId;
    await this.store.writeState(state);
    void this.runAcpTurn(parsed.conversationId, userMessage.meta.id, turnId, parsed.content);
    return this.emitSnapshot(parsed.conversationId);
  }

  async waitForIdle(conversationId: string, timeoutMs = 8000): Promise<OpenConversation> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const open = await this.store.openConversation(conversationId);
      if (!open.state.activeTurnId && open.state.queue.length === 0) return open;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Conversation ${conversationId} did not become idle`);
  }

  /**
   * Runs a real ACP turn; when no adapter is available it records an explicit failed message.
   */
  private async runAcpTurn(
    conversationId: string,
    userMessageId: string,
    turnId: string,
    prompt: string,
  ): Promise<void> {
    const active: ActiveTurn = { cancelled: false };
    this.activeTurns.set(conversationId, active);
    const open = await this.store.openConversation(conversationId);
    const agent = open.agent;
    const turnPrompt = buildTurnPrompt(open, userMessageId, prompt);
    if (!agent.enabled || agent.availability !== 'available') {
      await this.failTurn(
        conversationId,
        userMessageId,
        turnId,
        `Agent ${agent.name} is not connected. Configure a real ACP adapter before running this turn.`,
      );
      return;
    }

    if (agent.kind === 'codex-cli') {
      await this.runCodexCliTurn(conversationId, userMessageId, turnId, turnPrompt, agent, active);
      return;
    }

    await this.runAcpStdioTurn(conversationId, userMessageId, turnId, turnPrompt, agent, active);
  }

  /**
   * Runs Codex CLI, streams JSONL assistant updates, and ignores writes after cancellation.
   */
  private async runCodexCliTurn(
    conversationId: string,
    userMessageId: string,
    turnId: string,
    prompt: string,
    agent: OpenConversation['agent'],
    active: ActiveTurn,
  ): Promise<void> {
    let assistantMessage: MessageRecord | undefined;
    let streamedBody = '';
    let streamWrites = Promise.resolve();
    const queueStreamWrite = (update: CodexStreamUpdate): void => {
      if (!assistantMessage || active.cancelled) return;
      streamedBody = update.mode === 'replace' ? update.text : `${streamedBody}${update.text}`;
      const nextBody = streamedBody.trimEnd();
      streamWrites = streamWrites.then(async () => {
        if (active.cancelled || !assistantMessage || !nextBody) return;
        assistantMessage.body = nextBody;
        assistantMessage.meta.updatedAt = nowIso();
        await this.store.writeMessage(assistantMessage);
        await this.emitSnapshot(conversationId);
      });
    };
    try {
      if (active.cancelled) return;
      const state = await this.store.readState(conversationId);
      state.plan = [{ id: 'plan_1', title: 'Run Codex CLI', status: 'active' }];
      state.tools = [];
      await this.store.writeState(state);
      assistantMessage = await this.store.addMessage({
        conversationId,
        role: 'assistant',
        agentId: agent.id,
        turnId,
        parentId: userMessageId,
        status: 'streaming',
        body: 'Codex CLI is running...',
      });
      await this.emitSnapshot(conversationId);
      const body = await runCodexCli(
        agent.command,
        agent.args,
        agent.cwd || process.cwd(),
        prompt,
        {
          active,
          onUpdate: queueStreamWrite,
        },
      );
      await streamWrites;
      if (active.cancelled) return;
      assistantMessage.body =
        body || streamedBody.trim() || 'Codex completed without a text response.';
      assistantMessage.meta.status = 'completed';
      assistantMessage.meta.updatedAt = nowIso();
      await this.store.writeMessage(assistantMessage);
      await this.store.touchConversation(conversationId);
      await this.finishTurn(conversationId);
    } catch (error) {
      await streamWrites;
      if (active.cancelled) return;
      await this.failTurn(
        conversationId,
        userMessageId,
        turnId,
        error instanceof Error ? error.message : String(error),
        assistantMessage,
      );
    }
  }

  /**
   * Runs a stdio ACP adapter and persists the completed response state.
   */
  private async runAcpStdioTurn(
    conversationId: string,
    userMessageId: string,
    turnId: string,
    prompt: string,
    agent: OpenConversation['agent'],
    active: ActiveTurn,
  ): Promise<void> {
    const client = new AcpStdioClient(agent.command, agent.args, agent.cwd || process.cwd());
    let assistantMessage: MessageRecord | undefined;
    try {
      const initialized = await client.initialize();
      const session = await client.createSession();
      active.cancel = () => {
        void client.cancel(session.sessionId).catch(() => undefined);
        client.dispose();
      };
      const state = await this.store.readState(conversationId);
      state.acpSessionId = session.sessionId;
      state.plan = [{ id: 'plan_1', title: 'Run ACP turn', status: 'active' }];
      state.tools = [];
      await this.store.writeState(state);
      assistantMessage = await this.store.addMessage({
        conversationId,
        role: 'assistant',
        agentId: agent.id,
        turnId,
        parentId: userMessageId,
        status: 'streaming',
        body: 'ACP turn is running...',
      });
      await this.emitSnapshot(conversationId);
      if (active.cancelled) {
        await client.cancel(session.sessionId);
        assistantMessage.body = 'Turn cancelled.';
        assistantMessage.meta.status = 'cancelled';
        assistantMessage.meta.updatedAt = nowIso();
        await this.store.writeMessage(assistantMessage);
        await this.store.touchConversation(conversationId);
        await this.finishCancelledTurn(conversationId);
        return;
      }
      await client.prompt({ sessionId: session.sessionId, turnId, prompt });
      if (active.cancelled) return;
      assistantMessage.body = `ACP turn completed with ${initialized.protocolVersion}.`;
      assistantMessage.meta.status = 'completed';
      assistantMessage.meta.updatedAt = nowIso();
      await this.store.writeMessage(assistantMessage);
      await this.store.touchConversation(conversationId);
      await this.finishTurn(conversationId);
    } catch (error) {
      if (active.cancelled) return;
      await this.failTurn(
        conversationId,
        userMessageId,
        turnId,
        error instanceof Error ? error.message : String(error),
        assistantMessage,
      );
    } finally {
      client.dispose();
    }
  }

  private async failTurn(
    conversationId: string,
    userMessageId: string,
    turnId: string,
    message: string,
    assistantMessage?: MessageRecord,
  ): Promise<void> {
    const state = await this.store.readState(conversationId);
    state.activeTurnId = '';
    state.plan = [{ id: 'plan_1', title: 'Connect ACP adapter', status: 'failed' }];
    state.tools = [];
    await this.store.writeState(state);
    if (assistantMessage) {
      assistantMessage.body = message;
      assistantMessage.meta.status = 'failed';
      assistantMessage.meta.errorMessage = message;
      assistantMessage.meta.updatedAt = nowIso();
      await this.store.writeMessage(assistantMessage);
      await this.store.touchConversation(conversationId);
    } else {
      await this.store.addMessage({
        conversationId,
        role: 'assistant',
        agentId: (await this.store.openConversation(conversationId)).agent.id,
        turnId,
        parentId: userMessageId,
        status: 'failed',
        body: message,
      });
    }
    this.activeTurns.delete(conversationId);
    await this.startNextQueued(conversationId);
    await this.emitSnapshot(conversationId);
  }

  private async finishCancelledTurn(conversationId: string): Promise<void> {
    const state = await this.store.readState(conversationId);
    state.activeTurnId = '';
    state.plan = state.plan.map((step) =>
      step.status === 'active' ? { ...step, status: 'failed' } : step,
    );
    state.tools = state.tools.map((tool) =>
      tool.status === 'running' ? { ...tool, status: 'failed' } : tool,
    );
    await this.store.writeState(state);
    this.activeTurns.delete(conversationId);
    await this.startNextQueued(conversationId);
    await this.emitSnapshot(conversationId);
  }

  private async markTurnCancelled(conversationId: string, turnId: string): Promise<void> {
    const state = await this.store.readState(conversationId);
    state.activeTurnId = '';
    state.plan = state.plan.map((step) =>
      step.status === 'active' ? { ...step, status: 'failed' } : step,
    );
    state.tools = state.tools.map((tool) =>
      tool.status === 'running' ? { ...tool, status: 'failed' } : tool,
    );
    await this.store.writeState(state);

    const messages = await this.store.readMessages(conversationId);
    const assistant = messages.find(
      (message) =>
        message.meta.turnId === turnId &&
        message.meta.role === 'assistant' &&
        (message.meta.status === 'streaming' || message.meta.status === 'active'),
    );
    if (!assistant) return;
    assistant.body = 'Turn cancelled.';
    assistant.meta.status = 'cancelled';
    assistant.meta.updatedAt = nowIso();
    await this.store.writeMessage(assistant);
    await this.store.touchConversation(conversationId);
  }

  private async finishTurn(conversationId: string): Promise<void> {
    const state = await this.store.readState(conversationId);
    state.activeTurnId = '';
    state.plan = state.plan.map((step) =>
      step.status === 'active' ? { ...step, status: 'completed' } : step,
    );
    state.tools = state.tools.map((tool) =>
      tool.status === 'running' || tool.status === 'queued'
        ? { ...tool, status: 'completed' }
        : tool,
    );
    await this.store.writeState(state);
    this.activeTurns.delete(conversationId);
    await this.startNextQueued(conversationId);
    await this.emitSnapshot(conversationId);
  }

  private async startNextQueued(conversationId: string): Promise<void> {
    const state = await this.store.readState(conversationId);
    const next = state.queue.shift();
    if (!next) {
      await this.store.writeState(state);
      return;
    }
    const messages = await this.store.readMessages(conversationId);
    const userMessage = messages.find((message) => message.meta.id === next.messageId);
    if (!userMessage) {
      await this.store.writeState(state);
      return;
    }
    userMessage.meta.status = 'active';
    userMessage.meta.updatedAt = nowIso();
    await this.store.writeMessage(userMessage);
    state.activeTurnId = next.turnId;
    await this.store.writeState(state);
    void this.runAcpTurn(conversationId, userMessage.meta.id, next.turnId, userMessage.body);
  }

  private async emitSnapshot(activeConversationId?: string): Promise<WorkspaceSnapshot> {
    const snapshot = await this.store.getSnapshot(activeConversationId);
    for (const window of this.windows) {
      if (!window.isDestroyed()) window.webContents.send('workspace:snapshot', snapshot);
    }
    return snapshot;
  }
}

function runCodexCli(
  command: string,
  args: string[],
  cwd: string,
  prompt: string,
  options: { active: ActiveTurn; onUpdate: (update: CodexStreamUpdate) => void },
): Promise<string> {
  return new Promise((resolve, reject) => {
    void runCodexCliInner(command, args, cwd, prompt, options).then(resolve, reject);
  });
}

/**
 * Spawns Codex CLI once, parses JSONL stdout, and reads the final output file.
 */
async function runCodexCliInner(
  command: string,
  args: string[],
  cwd: string,
  prompt: string,
  options: { active: ActiveTurn; onUpdate: (update: CodexStreamUpdate) => void },
): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'f5-codex-'));
  const outputPath = join(tempDir, 'last-message.md');
  const finalArgs = [...args, '--output-last-message', outputPath, prompt];
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, finalArgs, {
        cwd,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      options.active.cancel = () => {
        if (!child.killed) child.kill('SIGTERM');
      };
      let stderr = '';
      let stdoutBuffer = '';
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });
      child.stdout.on('data', (chunk) => {
        stdoutBuffer += String(chunk);
        let newlineIndex = stdoutBuffer.indexOf('\n');
        while (newlineIndex >= 0) {
          const line = stdoutBuffer.slice(0, newlineIndex);
          stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
          const update = extractCodexStreamUpdate(line);
          if (update) options.onUpdate(update);
          newlineIndex = stdoutBuffer.indexOf('\n');
        }
      });
      child.on('error', reject);
      child.on('exit', (code) => {
        if (options.active.cancelled) reject(new Error('Codex turn cancelled'));
        else if (code === 0) resolve();
        else reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
      });
    });
    const body = (await readFile(outputPath, 'utf8')).trim();
    return body || 'Codex completed without a text response.';
  } finally {
    options.active.cancel = undefined;
    await rm(tempDir, { force: true, recursive: true });
  }
}

function extractCodexStreamUpdate(line: string): CodexStreamUpdate | undefined {
  if (!line.trim()) return undefined;
  let event: unknown;
  try {
    event = JSON.parse(line);
  } catch {
    return undefined;
  }
  if (!event || typeof event !== 'object') return undefined;
  const record = event as Record<string, unknown>;
  const type = String(record.type ?? record.event ?? '');
  const delta = stringValueAt(record, ['delta']) ?? stringValueAt(record, ['data', 'delta']);
  if (delta && (type.includes('delta') || type.includes('agent_message'))) {
    return { text: delta, mode: 'append' };
  }
  const text =
    stringValueAt(record, ['item', 'text']) ??
    stringValueAt(record, ['message']) ??
    stringValueAt(record, ['text']) ??
    stringValueAt(record, ['content']) ??
    stringValueAt(record, ['data', 'text']) ??
    stringValueAt(record, ['data', 'content']);
  if (!text) return undefined;
  if (
    type.includes('agent_message') ||
    type.includes('assistant') ||
    stringValueAt(record, ['item', 'type']) === 'agent_message' ||
    type.includes('output_text') ||
    type === 'message'
  ) {
    return { text, mode: 'replace' };
  }
  return undefined;
}

function stringValueAt(record: Record<string, unknown>, path: string[]): string | undefined {
  let current: unknown = record;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

export function buildTurnPrompt(
  open: OpenConversation,
  userMessageId: string,
  latestPrompt: string,
): string {
  const history = open.messages
    .filter((message) => message.meta.id !== userMessageId)
    .filter((message) => message.meta.status === 'completed')
    .slice(-CONTEXT_MESSAGE_LIMIT);
  const formattedHistory = truncateFromStart(
    history.map(formatPromptMessage).join('\n\n'),
    CONTEXT_CHAR_LIMIT,
  );

  return [
    'You are continuing an f5 workspace conversation.',
    'Use the conversation history below as context. Answer the latest user message directly. If the latest user message is a short follow-up, infer its meaning from prior turns.',
    '',
    `Conversation title: ${open.conversation.title}`,
    `Agent: ${open.agent.name}`,
    '',
    '## Conversation history',
    formattedHistory || 'No prior messages.',
    '',
    '## Latest user message',
    latestPrompt.trim(),
  ].join('\n');
}

function formatPromptMessage(message: OpenConversation['messages'][number]): string {
  const role =
    message.meta.role === 'user'
      ? 'User'
      : message.meta.role === 'assistant'
        ? 'Assistant'
        : message.meta.role;
  return [`### ${message.meta.sequence}. ${role}`, message.body.trim() || '(empty)'].join('\n');
}

function truncateFromStart(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `[Earlier context truncated]\n${value.slice(value.length - maxLength)}`;
}
