import { z } from 'zod';

export const conversationIdSchema = z.string().regex(/^conv_[a-f0-9]{24}$/);
export const messageIdSchema = z.string().regex(/^msg_[a-f0-9]{24}$/);
export const turnIdSchema = z.string().regex(/^turn_[a-f0-9]{24}$/);
export const appearancePreferenceSchema = z.enum(['light', 'dark', 'system']);

export const conversationMetaSchema = z.object({
  schema: z.literal('f5.conversation.v1'),
  id: conversationIdSchema,
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

export const createConversationInputSchema = z.object({
  title: z.string().trim().optional(),
  agentId: z.string().optional(),
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
