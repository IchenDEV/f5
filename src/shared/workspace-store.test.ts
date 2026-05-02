import matter from 'gray-matter';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
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
  messageMetaSchema,
  sendMessageInputSchema,
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
    });
    expect(profile.displayName).toBe('Local User');
    expect(profile.theme).toBe('dark');

    const index = await store.rebuildIndex();
    expect(index.conversations.map((conversation) => conversation.title)).toContain(
      'Profile index test',
    );
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
