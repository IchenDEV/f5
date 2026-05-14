export type LocalIdPrefix =
  | 'conv'
  | 'msg'
  | 'turn'
  | 'tool'
  | 'plan'
  | 'task'
  | 'tasklist'
  | 'doc'
  | 'comment';

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
export type TaskStatus = 'todo' | 'done';
export type DocumentCommentStatus = 'open' | 'resolved';
export type RepairStatus = 'ok' | 'needs_repair';
export const HUMAN_ASSIGNEE_ID = 'human-user';
export type AppView =
  | 'workspace'
  | 'task-workbench'
  | 'board'
  | 'tasks'
  | 'documents'
  | 'user-profile'
  | 'agent-profile'
  | 'agents';
export type AppearancePreference = 'light' | 'dark' | 'system';

export interface ConversationMeta {
  schema: 'f5.conversation.v1';
  id: string;
  taskId: string;
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

export interface TaskRecord {
  schema: 'f5.task.v1';
  id: string;
  listId: string;
  agentId: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
  order: number;
  body: string;
}

export interface TaskListItem extends TaskRecord {
  repairStatus: RepairStatus;
}

export interface TaskIndex {
  schema: 'f5.task.index.v1';
  tasks: TaskListItem[];
  rebuiltAt: string;
}

export interface TaskListRecord {
  schema: 'f5.task-list.v1';
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface TaskListSummary extends TaskListRecord {
  repairStatus: RepairStatus;
  taskCount: number;
  openCount: number;
}

export interface TaskListIndex {
  schema: 'f5.task-list.index.v1';
  lists: TaskListSummary[];
  rebuiltAt: string;
}

export interface DocumentRecord {
  schema: 'f5.document.v1';
  id: string;
  taskId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  body: string;
}

export interface DocumentListItem {
  schema: 'f5.document.v1';
  id: string;
  taskId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  repairStatus: RepairStatus;
}

export interface DocumentIndex {
  schema: 'f5.document.index.v1';
  documents: DocumentListItem[];
  rebuiltAt: string;
}

export interface DocumentCommentRecord {
  schema: 'f5.document-comment.v1';
  id: string;
  documentId: string;
  anchorText: string;
  anchorStart: number;
  anchorEnd: number;
  authorName: string;
  status: DocumentCommentStatus;
  createdAt: string;
  updatedAt: string;
  body: string;
}

export interface DocumentCommentListItem extends DocumentCommentRecord {
  repairStatus: RepairStatus;
}

export interface DocumentCommentIndex {
  schema: 'f5.document-comment.index.v1';
  comments: DocumentCommentListItem[];
  rebuiltAt: string;
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
  taskId?: string;
  firstPrompt?: string;
}

export interface CreateTaskConversationInput {
  title: string;
  body?: string;
  agentId?: string;
  taskListId?: string;
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

export interface CreateTaskInput {
  taskListId?: string;
  agentId?: string;
  title: string;
  body?: string;
}

export interface UpdateTaskInput {
  taskId: string;
  title: string;
  body: string;
  status: TaskStatus;
  agentId?: string;
}

export interface DeleteTaskInput {
  taskId: string;
}

export interface CreateTaskListInput {
  title: string;
}

export interface UpdateTaskListInput {
  taskListId: string;
  title: string;
}

export interface DeleteTaskListInput {
  taskListId: string;
}

export interface CreateDocumentInput {
  title?: string;
  body?: string;
  taskId?: string;
}

export interface UpdateDocumentInput {
  documentId: string;
  title: string;
  body: string;
}

export interface DeleteDocumentInput {
  documentId: string;
}

export interface CreateDocumentCommentInput {
  documentId: string;
  anchorText?: string;
  anchorStart?: number;
  anchorEnd?: number;
  body: string;
}

export interface UpdateDocumentCommentInput {
  commentId: string;
  body: string;
  status: DocumentCommentStatus;
}

export interface DeleteDocumentCommentInput {
  commentId: string;
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
  taskLists: TaskListSummary[];
  tasks: TaskListItem[];
  documents: DocumentListItem[];
  documentComments: DocumentCommentListItem[];
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
