import { z } from 'zod';

export const conversationIdSchema = z.string().regex(/^conv_[a-f0-9]{24}$/);
export const messageIdSchema = z.string().regex(/^msg_[a-f0-9]{24}$/);
export const turnIdSchema = z.string().regex(/^turn_[a-f0-9]{24}$/);
export const taskIdSchema = z.string().regex(/^task_[a-f0-9]{24}$/);
export const taskListIdSchema = z.string().regex(/^tasklist_[a-f0-9]{24}$/);
export const documentIdSchema = z.string().regex(/^doc_[a-f0-9]{24}$/);
export const documentCommentIdSchema = z.string().regex(/^comment_[a-f0-9]{24}$/);
export const appearancePreferenceSchema = z.enum(['light', 'dark', 'system']);

export const conversationMetaSchema = z.object({
  schema: z.literal('f5.conversation.v1'),
  id: conversationIdSchema,
  taskId: z.union([z.literal(''), taskIdSchema]).default(''),
  title: z.string().min(1),
  agentId: z.string().min(1),
  status: z.enum(['active', 'archived', 'needs_repair']),
  starred: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastMessageAt: z.string().datetime(),
  messageCount: z.number().int().nonnegative(),
});

export const messageMetaSchema = z.object({
  schema: z.literal('f5.message.v1'),
  id: messageIdSchema,
  conversationId: conversationIdSchema,
  sequence: z.number().int().positive(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  agentId: z.string().min(1),
  turnId: turnIdSchema,
  parentId: z.string(),
  status: z.enum([
    'queued',
    'active',
    'streaming',
    'completed',
    'failed',
    'cancelled',
    'interrupted',
  ]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  errorCode: z.string(),
  errorMessage: z.string(),
});

export const queueItemSchema = z.object({
  messageId: messageIdSchema,
  turnId: turnIdSchema,
  status: z.literal('queued'),
  createdAt: z.string().datetime(),
});

export const planStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['completed', 'active', 'pending', 'failed']),
});

export const toolActivitySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['running', 'queued', 'completed', 'failed']),
  startedAt: z.string().datetime().optional(),
  elapsedSeconds: z.number().nonnegative().optional(),
});

export const conversationStateSchema = z.object({
  schema: z.literal('f5.state.v1'),
  conversationId: conversationIdSchema,
  acpSessionId: z.string(),
  activeTurnId: z.union([z.literal(''), turnIdSchema]),
  queue: z.array(queueItemSchema),
  plan: z.array(planStepSchema),
  tools: z.array(toolActivitySchema),
});

export const agentConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['acp-stdio', 'codex-cli']),
  command: z.string(),
  args: z.array(z.string()),
  cwd: z.string(),
  enabled: z.boolean(),
  description: z.string().optional(),
  availability: z.enum(['available', 'unavailable', 'disabled']).optional(),
  protocolVersion: z.string().optional(),
  capabilities: z.record(z.string(), z.unknown()).optional(),
  verification: z.string().optional(),
});

export const agentsFileSchema = z.object({
  schema: z.literal('f5.agents.v1'),
  defaultAgentId: z.string(),
  agents: z.array(agentConfigSchema),
});

export const profileSchema = z.object({
  schema: z.literal('f5.profile.v1'),
  displayName: z.string().min(1),
  defaultAgentId: z.string(),
  workspacePath: z.string(),
  theme: appearancePreferenceSchema,
  iconTheme: appearancePreferenceSchema.default('system'),
});

export const taskRecordSchema = z.object({
  schema: z.literal('f5.task.v1'),
  id: taskIdSchema,
  listId: taskListIdSchema,
  agentId: z.string().min(1),
  title: z.string().trim().min(1),
  status: z.enum(['todo', 'done']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.union([z.literal(''), z.string().datetime()]),
  order: z.number().int().nonnegative(),
  body: z.string(),
});

export const taskListItemSchema = taskRecordSchema.extend({
  repairStatus: z.enum(['ok', 'needs_repair']),
});

export const taskIndexSchema = z.object({
  schema: z.literal('f5.task.index.v1'),
  tasks: z.array(taskListItemSchema),
  rebuiltAt: z.string().datetime(),
});

export const taskListRecordSchema = z.object({
  schema: z.literal('f5.task-list.v1'),
  id: taskListIdSchema,
  title: z.string().trim().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  order: z.number().int().nonnegative(),
});

export const taskListSummarySchema = taskListRecordSchema.extend({
  repairStatus: z.enum(['ok', 'needs_repair']),
  taskCount: z.number().int().nonnegative(),
  openCount: z.number().int().nonnegative(),
});

export const taskListIndexSchema = z.object({
  schema: z.literal('f5.task-list.index.v1'),
  lists: z.array(taskListSummarySchema),
  rebuiltAt: z.string().datetime(),
});

export const documentRecordSchema = z.object({
  schema: z.literal('f5.document.v1'),
  id: documentIdSchema,
  taskId: z.union([z.literal(''), taskIdSchema]).default(''),
  title: z.string().trim().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  body: z.string(),
});

export const documentListItemSchema = documentRecordSchema.omit({ body: true }).extend({
  repairStatus: z.enum(['ok', 'needs_repair']),
});

export const documentIndexSchema = z.object({
  schema: z.literal('f5.document.index.v1'),
  documents: z.array(documentListItemSchema),
  rebuiltAt: z.string().datetime(),
});

export const documentCommentRecordSchema = z.object({
  schema: z.literal('f5.document-comment.v1'),
  id: documentCommentIdSchema,
  documentId: documentIdSchema,
  anchorText: z.string().default(''),
  anchorStart: z.number().int().nonnegative().default(0),
  anchorEnd: z.number().int().nonnegative().default(0),
  authorName: z.string().trim().min(1),
  status: z.enum(['open', 'resolved']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  body: z.string().trim().min(1),
});

export const documentCommentListItemSchema = documentCommentRecordSchema.extend({
  repairStatus: z.enum(['ok', 'needs_repair']),
});

export const documentCommentIndexSchema = z.object({
  schema: z.literal('f5.document-comment.index.v1'),
  comments: z.array(documentCommentListItemSchema),
  rebuiltAt: z.string().datetime(),
});

export const createConversationInputSchema = z.object({
  title: z.string().trim().optional(),
  agentId: z.string().optional(),
  taskId: taskIdSchema.optional(),
  firstPrompt: z.string().trim().optional(),
});

export const createTaskConversationInputSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().optional().default(''),
  agentId: z.string().trim().min(1).optional(),
  taskListId: taskListIdSchema.optional(),
  firstPrompt: z.string().trim().optional(),
});

export const sendMessageInputSchema = z.object({
  conversationId: conversationIdSchema,
  content: z.string().trim().min(1),
});

export const renameConversationInputSchema = z.object({
  conversationId: conversationIdSchema,
  title: z.string().trim().min(1),
});

export const starConversationInputSchema = z.object({
  conversationId: conversationIdSchema,
  starred: z.boolean(),
});

export const archiveConversationInputSchema = z.object({
  conversationId: conversationIdSchema,
  archived: z.boolean(),
});

export const deleteConversationInputSchema = z.object({
  conversationId: conversationIdSchema,
});

export const createTaskInputSchema = z.object({
  taskListId: taskListIdSchema.optional(),
  agentId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  body: z.string().optional().default(''),
});

export const updateTaskInputSchema = z.object({
  taskId: taskIdSchema,
  title: z.string().trim().min(1),
  body: z.string(),
  status: z.enum(['todo', 'done']),
  agentId: z.string().trim().min(1).optional(),
});

export const deleteTaskInputSchema = z.object({
  taskId: taskIdSchema,
});

export const createTaskListInputSchema = z.object({
  title: z.string().trim().min(1),
});

export const updateTaskListInputSchema = z.object({
  taskListId: taskListIdSchema,
  title: z.string().trim().min(1),
});

export const deleteTaskListInputSchema = z.object({
  taskListId: taskListIdSchema,
});

export const createDocumentInputSchema = z.object({
  title: z.string().trim().optional(),
  body: z.string().optional().default(''),
  taskId: taskIdSchema.optional(),
});

export const updateDocumentInputSchema = z.object({
  documentId: documentIdSchema,
  title: z.string().trim().min(1),
  body: z.string(),
});

export const deleteDocumentInputSchema = z.object({
  documentId: documentIdSchema,
});

export const createDocumentCommentInputSchema = z.object({
  documentId: documentIdSchema,
  anchorText: z.string().trim().default(''),
  anchorStart: z.number().int().nonnegative().default(0),
  anchorEnd: z.number().int().nonnegative().default(0),
  body: z.string().trim().min(1),
});

export const updateDocumentCommentInputSchema = z.object({
  commentId: documentCommentIdSchema,
  body: z.string().trim().min(1),
  status: z.enum(['open', 'resolved']),
});

export const deleteDocumentCommentInputSchema = z.object({
  commentId: documentCommentIdSchema,
});

export const cancelQueuedInputSchema = z.object({
  conversationId: conversationIdSchema,
  messageId: messageIdSchema,
});

export const updateProfileInputSchema = z.object({
  displayName: z.string().trim().min(1),
  defaultAgentId: z.string().trim().min(1),
  theme: appearancePreferenceSchema,
  iconTheme: appearancePreferenceSchema,
});
