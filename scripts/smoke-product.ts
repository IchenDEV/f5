import matter from 'gray-matter';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConversationEngine } from '../electron/main/conversation-engine';
import { WorkspaceStore } from '../electron/main/workspace-store';
import {
  conversationMetaSchema,
  conversationStateSchema,
  messageMetaSchema,
  profileSchema,
} from '../src/shared/schemas';

const workspacePath = await mkdtemp(join(tmpdir(), 'f5-smoke-'));
const store = new WorkspaceStore(workspacePath);
const engine = new ConversationEngine(store);

const created = await engine.createConversation({
  title: 'Smoke Test Conversation',
  agentId: 'codex-cli-real',
});
const conversationId = created.activeConversation?.conversation.id;
if (!conversationId) throw new Error('Conversation was not created');

await engine.sendMessage({ conversationId, content: 'Reply with: first real smoke response.' });

const complete = await engine.waitForIdle(conversationId, 300000);
if (complete.messages.filter((message) => message.meta.role === 'user').length !== 1) {
  throw new Error('Expected one user prompt');
}
if (complete.messages.filter((message) => message.meta.role === 'assistant').length !== 1) {
  throw new Error('Expected one real Codex response');
}

const conversationDir = join(workspacePath, 'conversations', conversationId);
const conversationRaw = matter(await readFile(join(conversationDir, 'conversation.md'), 'utf8'));
conversationMetaSchema.parse(conversationRaw.data);
conversationStateSchema.parse(
  JSON.parse(await readFile(join(conversationDir, 'state.json'), 'utf8')),
);
profileSchema.parse(JSON.parse(await readFile(join(workspacePath, 'profile.json'), 'utf8')));
JSON.parse(await readFile(join(workspacePath, 'index.json'), 'utf8'));

const messageFiles = (await readdir(join(conversationDir, 'messages'))).filter((file) =>
  file.endsWith('.md'),
);
if (messageFiles.length !== 2) {
  throw new Error(`Expected 2 message files, found ${messageFiles.length}`);
}
for (const file of messageFiles) {
  const parsed = matter(await readFile(join(conversationDir, 'messages', file), 'utf8'));
  messageMetaSchema.parse(parsed.data);
  if (!parsed.content.trim()) throw new Error(`${file} has an empty body`);
}

const restartedStore = new WorkspaceStore(workspacePath);
await restartedStore.ensureWorkspace();
const restarted = await restartedStore.openConversation(conversationId);
if (restarted.messages.length !== 2) throw new Error('Restart reload did not preserve messages');

const transient = await restartedStore.createConversation({
  title: 'Transient Smoke Conversation',
  agentId: 'codex-cli-real',
});
const transientId = transient.conversation.id;
await restartedStore.archiveConversation({ conversationId: transientId, archived: true });
const archived = await restartedStore.openConversation(transientId);
if (archived.conversation.status !== 'archived') {
  throw new Error('Archive did not persist conversation status');
}
await restartedStore.archiveConversation({ conversationId: transientId, archived: false });
const restored = await restartedStore.openConversation(transientId);
if (restored.conversation.status !== 'active') {
  throw new Error('Restore did not persist conversation status');
}
await restartedStore.deleteConversation({ conversationId: transientId });
if ((await restartedStore.listConversationIds()).includes(transientId)) {
  throw new Error('Delete did not remove the transient conversation from the workspace index');
}

const exportPath = await restartedStore.exportConversation(conversationId);
const exported = await readFile(exportPath, 'utf8');
if (!exported.includes('Smoke Test Conversation')) {
  throw new Error('Export file does not include the conversation title');
}
if (!exported.includes('Reply with: first real smoke response.')) {
  throw new Error('Export file does not include the user prompt');
}
if (!exported.includes('## assistant')) {
  throw new Error('Export file does not include the assistant response section');
}

console.log(
  JSON.stringify(
    {
      status: 'passed',
      workspacePath,
      conversationId,
      lifecycle: 'archive-restore-delete passed',
      messageFiles: messageFiles.length,
      exportPath,
    },
    null,
    2,
  ),
);
