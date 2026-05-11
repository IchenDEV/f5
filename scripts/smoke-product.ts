import matter from 'gray-matter';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConversationEngine } from '../electron/main/conversation-engine';
import { WorkspaceStore } from '../electron/main/workspace-store';
import {
  conversationMetaSchema,
  conversationStateSchema,
  documentIndexSchema,
  documentRecordSchema,
  messageMetaSchema,
  profileSchema,
  taskIndexSchema,
  taskListIndexSchema,
  taskListRecordSchema,
  taskRecordSchema,
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

const explicitTaskList = await restartedStore.createTaskList({ title: 'Smoke TODO List' });
const task = await restartedStore.createTask({
  taskListId: explicitTaskList.id,
  agentId: 'codex-cli-real',
  title: 'Smoke TODO',
  body: 'Confirm workspace TODO persistence.',
});
const taskListIndex = taskListIndexSchema.parse(
  JSON.parse(await readFile(join(workspacePath, 'tasks', 'lists', 'index.json'), 'utf8')),
);
const smokeTaskList = taskListIndex.lists.find((item) => item.id === task.listId);
if (!smokeTaskList) {
  throw new Error('Task list index does not include the smoke task list');
}
const taskListRaw = matter(
  await readFile(join(workspacePath, 'tasks', 'lists', `${task.listId}.md`), 'utf8'),
);
taskListRecordSchema.parse(taskListRaw.data);
const updatedTask = await restartedStore.updateTask({
  taskId: task.id,
  title: 'Smoke TODO done',
  body: 'Confirm workspace TODO persistence.',
  status: 'done',
  agentId: 'codex-acp-real',
});
const taskRaw = matter(await readFile(join(workspacePath, 'tasks', `${task.id}.md`), 'utf8'));
taskRecordSchema.parse({ ...taskRaw.data, body: taskRaw.content.trimEnd() });
if (updatedTask.status !== 'done' || !updatedTask.completedAt) {
  throw new Error('Task status did not persist as done');
}
if (updatedTask.agentId !== 'codex-acp-real' || taskRaw.data.agentId !== 'codex-acp-real') {
  throw new Error('Task agent assignment did not persist');
}
const taskIndex = taskIndexSchema.parse(
  JSON.parse(await readFile(join(workspacePath, 'tasks', 'index.json'), 'utf8')),
);
if (!taskIndex.tasks.some((item) => item.id === task.id)) {
  throw new Error('Task index does not include the smoke task');
}

const document = await restartedStore.createDocument({
  title: 'Smoke Doc',
  body: '# Smoke Doc\n\nConfirm workspace document persistence.',
});
const savedDocument = await restartedStore.updateDocument({
  documentId: document.id,
  title: 'Smoke Doc Saved',
  body: '# Smoke Doc Saved\n\nMarkdown body saved.',
});
const documentRaw = matter(
  await readFile(join(workspacePath, 'documents', `${document.id}.md`), 'utf8'),
);
documentRecordSchema.parse({ ...documentRaw.data, body: documentRaw.content.trimEnd() });
if (!savedDocument.body.includes('Markdown body saved.')) {
  throw new Error('Document body did not persist');
}
const documentIndex = documentIndexSchema.parse(
  JSON.parse(await readFile(join(workspacePath, 'documents', 'index.json'), 'utf8')),
);
if (!documentIndex.documents.some((item) => item.id === document.id)) {
  throw new Error('Document index does not include the smoke document');
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
      taskId: task.id,
      taskListId: task.listId,
      documentId: document.id,
    },
    null,
    2,
  ),
);
