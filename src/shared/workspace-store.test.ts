import matter from 'gray-matter';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConversationEngine } from '../../electron/main/conversation-engine';
import {
  defaultAgentsFile,
  messageFileName,
  WorkspaceStore,
} from '../../electron/main/workspace-store';
import { conversationMetaSchema, messageMetaSchema } from './schemas';

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
    state.activeTurnId = 'turn_external_active';
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
});
