import { z } from 'zod';

export const conversationMetaSchema = z.object({
  schema: z.literal('f5.conversation.v1'),
  id: z.string().startsWith('conv_'),
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
  id: z.string().startsWith('msg_'),
  conversationId: z.string().startsWith('conv_'),
  sequence: z.number().int().positive(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  agentId: z.string().min(1),
  turnId: z.string().startsWith('turn_'),
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
  messageId: z.string().startsWith('msg_'),
  turnId: z.string().startsWith('turn_'),
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
  conversationId: z.string().startsWith('conv_'),
  acpSessionId: z.string(),
  activeTurnId: z.string(),
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
  theme: z.enum(['light', 'dark', 'system']),
});

export const createConversationInputSchema = z.object({
  title: z.string().trim().optional(),
  agentId: z.string().optional(),
  firstPrompt: z.string().trim().optional(),
});

export const sendMessageInputSchema = z.object({
  conversationId: z.string().startsWith('conv_'),
  content: z.string().trim().min(1),
});

export const renameConversationInputSchema = z.object({
  conversationId: z.string().startsWith('conv_'),
  title: z.string().trim().min(1),
});

export const starConversationInputSchema = z.object({
  conversationId: z.string().startsWith('conv_'),
  starred: z.boolean(),
});

export const archiveConversationInputSchema = z.object({
  conversationId: z.string().startsWith('conv_'),
  archived: z.boolean(),
});

export const deleteConversationInputSchema = z.object({
  conversationId: z.string().startsWith('conv_'),
});

export const cancelQueuedInputSchema = z.object({
  conversationId: z.string().startsWith('conv_'),
  messageId: z.string().startsWith('msg_'),
});

export const updateProfileInputSchema = z.object({
  displayName: z.string().trim().min(1),
  defaultAgentId: z.string().trim().min(1),
  theme: z.enum(['light', 'dark', 'system']),
});
