export type LocalIdPrefix = 'conv' | 'msg' | 'turn' | 'tool' | 'plan';

export type ConversationStatus = 'active' | 'archived' | 'needs_repair';
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type MessageStatus =
  | 'queued'
  | 'active'
  | 'streaming'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'interrupted';
export type AgentKind = 'acp-stdio' | 'codex-cli';
export type AgentAvailability = 'available' | 'unavailable' | 'disabled';
export type PlanStepStatus = 'completed' | 'active' | 'pending' | 'failed';
export type ToolStatus = 'running' | 'queued' | 'completed' | 'failed';
export type AppView = 'workspace' | 'user-profile' | 'agent-profile' | 'overview' | 'agents';
export type AppearancePreference = 'light' | 'dark' | 'system';

export interface ConversationMeta {
  schema: 'f5.conversation.v1';
  id: string;
  title: string;
  agentId: string;
  status: ConversationStatus;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
}

export interface MessageMeta {
  schema: 'f5.message.v1';
  id: string;
  conversationId: string;
  sequence: number;
  role: MessageRole;
  agentId: string;
  turnId: string;
  parentId: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
  errorCode: string;
  errorMessage: string;
}

export interface MessageRecord {
  meta: MessageMeta;
  body: string;
}

export interface QueueItem {
  messageId: string;
  turnId: string;
  status: 'queued';
  createdAt: string;
}

export interface PlanStep {
  id: string;
  title: string;
  status: PlanStepStatus;
}

export interface ToolActivity {
  id: string;
  name: string;
  status: ToolStatus;
  startedAt?: string;
  elapsedSeconds?: number;
}

export interface ConversationState {
  schema: 'f5.state.v1';
  conversationId: string;
  acpSessionId: string;
  activeTurnId: string;
  queue: QueueItem[];
  plan: PlanStep[];
  tools: ToolActivity[];
}

export interface AgentConfig {
  id: string;
  name: string;
  kind: AgentKind;
  command: string;
  args: string[];
  cwd: string;
  enabled: boolean;
  description?: string;
  availability?: AgentAvailability;
  protocolVersion?: string;
  capabilities?: Record<string, unknown>;
  verification?: string;
}

export interface AgentsFile {
  schema: 'f5.agents.v1';
  defaultAgentId: string;
  agents: AgentConfig[];
}

export interface UserProfile {
  schema: 'f5.profile.v1';
  displayName: string;
  defaultAgentId: string;
  workspacePath: string;
  theme: AppearancePreference;
  iconTheme: AppearancePreference;
}

export interface ConversationListItem extends ConversationMeta {
  agentName: string;
  agentStatus: AgentAvailability;
  preview: string;
}

export interface ConversationIndex {
  schema: 'f5.index.v1';
  conversations: ConversationListItem[];
  rebuiltAt: string;
}

export interface OpenConversation {
  conversation: ConversationMeta;
  messages: MessageRecord[];
  state: ConversationState;
  agent: AgentConfig;
}

export interface CreateConversationInput {
  title?: string;
  agentId?: string;
  firstPrompt?: string;
}

export interface SendMessageInput {
  conversationId: string;
  content: string;
}

export interface RenameConversationInput {
  conversationId: string;
  title: string;
}

export interface StarConversationInput {
  conversationId: string;
  starred: boolean;
}

export interface ArchiveConversationInput {
  conversationId: string;
  archived: boolean;
}

export interface DeleteConversationInput {
  conversationId: string;
}

export interface CancelQueuedInput {
  conversationId: string;
  messageId: string;
}

export interface UpdateProfileInput {
  displayName: string;
  defaultAgentId: string;
  theme: UserProfile['theme'];
  iconTheme: UserProfile['iconTheme'];
}

export interface AgentConnectionTestResult {
  agentId: string;
  ok: boolean;
  status: 'passed' | 'skipped' | 'failed';
  checkedAt: string;
  detail: string;
  protocolVersion: string;
}

export interface WorkspaceSnapshot {
  workspacePath: string;
  profile: UserProfile;
  agents: AgentConfig[];
  conversations: ConversationListItem[];
  activeConversation?: OpenConversation;
}

export interface CodexCandidateResult {
  source: 'user_config' | 'codex-acp' | 'codex-cli' | 'zed-registry';
  command: string;
  args: string[];
  status:
    | 'found'
    | 'missing'
    | 'unsupported'
    | 'handshake_failed'
    | 'prompt_failed'
    | 'passed'
    | 'skipped';
  detail: string;
}

export interface CodexSmokeResult {
  finalStatus: 'passed' | 'skipped' | 'failed';
  checkedAt: string;
  workspace: string;
  platform: NodeJS.Platform;
  candidates: CodexCandidateResult[];
}
