import { contextBridge, ipcRenderer } from 'electron';
import type {
  ArchiveConversationInput,
  CancelQueuedInput,
  CreateConversationInput,
  CreateDocumentCommentInput,
  CreateDocumentInput,
  CreateTaskConversationInput,
  CreateTaskListInput,
  CreateTaskInput,
  DeleteConversationInput,
  DeleteDocumentCommentInput,
  DeleteDocumentInput,
  DeleteTaskListInput,
  DeleteTaskInput,
  DocumentRecord,
  RenameConversationInput,
  SendMessageInput,
  StarConversationInput,
  UpdateDocumentCommentInput,
  UpdateDocumentInput,
  UpdateProfileInput,
  UpdateTaskListInput,
  UpdateTaskInput,
  AgentConnectionTestResult,
  WorkspaceSnapshot,
} from '../../src/shared/types';

contextBridge.exposeInMainWorld('f5', {
  platform: process.platform,
  workspace: {
    getSnapshot: (activeConversationId?: string): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('workspace:initialize', activeConversationId),
    reveal: (): Promise<string> => ipcRenderer.invoke('workspace:reveal'),
    subscribe: (callback: (snapshot: WorkspaceSnapshot) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, snapshot: WorkspaceSnapshot) =>
        callback(snapshot);
      ipcRenderer.on('workspace:snapshot', listener);
      return () => ipcRenderer.removeListener('workspace:snapshot', listener);
    },
  },
  conversations: {
    create: (input: CreateConversationInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('conversation:create', input),
    createTask: (input: CreateTaskConversationInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('task-conversation:create', input),
    open: (conversationId: string): Promise<WorkspaceSnapshot['activeConversation']> =>
      ipcRenderer.invoke('conversation:open', conversationId),
    send: (input: SendMessageInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('conversation:send-message', input),
    rename: (input: RenameConversationInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('conversation:rename', input),
    star: (input: StarConversationInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('conversation:star', input),
    archive: (input: ArchiveConversationInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('conversation:archive', input),
    delete: (input: DeleteConversationInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('conversation:delete', input),
    cancelQueued: (input: CancelQueuedInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('conversation:cancel-queued', input),
    cancelActive: (conversationId: string): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('agent:cancel-active', conversationId),
    reveal: (conversationId: string): Promise<string> =>
      ipcRenderer.invoke('conversation:reveal', conversationId),
    export: (conversationId: string): Promise<string> =>
      ipcRenderer.invoke('conversation:export', conversationId),
  },
  tasks: {
    create: (input: CreateTaskInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('task:create', input),
    update: (input: UpdateTaskInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('task:update', input),
    delete: (input: DeleteTaskInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('task:delete', input),
    createList: (input: CreateTaskListInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('task-list:create', input),
    updateList: (input: UpdateTaskListInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('task-list:update', input),
    deleteList: (input: DeleteTaskListInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('task-list:delete', input),
  },
  documents: {
    create: (input: CreateDocumentInput): Promise<DocumentRecord> =>
      ipcRenderer.invoke('document:create', input),
    open: (documentId: string): Promise<DocumentRecord> =>
      ipcRenderer.invoke('document:open', documentId),
    update: (input: UpdateDocumentInput): Promise<DocumentRecord> =>
      ipcRenderer.invoke('document:update', input),
    delete: (input: DeleteDocumentInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('document:delete', input),
    reveal: (documentId: string): Promise<string> =>
      ipcRenderer.invoke('document:reveal', documentId),
    comments: {
      create: (input: CreateDocumentCommentInput): Promise<WorkspaceSnapshot> =>
        ipcRenderer.invoke('document-comment:create', input),
      update: (input: UpdateDocumentCommentInput): Promise<WorkspaceSnapshot> =>
        ipcRenderer.invoke('document-comment:update', input),
      delete: (input: DeleteDocumentCommentInput): Promise<WorkspaceSnapshot> =>
        ipcRenderer.invoke('document-comment:delete', input),
    },
  },
  profile: {
    update: (input: UpdateProfileInput): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('profile:update', input),
  },
  agents: {
    testConnection: (agentId: string): Promise<AgentConnectionTestResult> =>
      ipcRenderer.invoke('agent:test-connection', agentId),
  },
  initializeWorkspace: (activeConversationId?: string): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('workspace:initialize', activeConversationId),
  createConversation: (input: CreateConversationInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('conversation:create', input),
  createTaskConversation: (input: CreateTaskConversationInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('task-conversation:create', input),
  openConversation: (conversationId: string) =>
    ipcRenderer.invoke('conversation:open', conversationId),
  sendMessage: (input: SendMessageInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('conversation:send-message', input),
  renameConversation: (input: RenameConversationInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('conversation:rename', input),
  starConversation: (input: StarConversationInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('conversation:star', input),
  archiveConversation: (input: ArchiveConversationInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('conversation:archive', input),
  deleteConversation: (input: DeleteConversationInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('conversation:delete', input),
  createTask: (input: CreateTaskInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('task:create', input),
  updateTask: (input: UpdateTaskInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('task:update', input),
  deleteTask: (input: DeleteTaskInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('task:delete', input),
  createTaskList: (input: CreateTaskListInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('task-list:create', input),
  updateTaskList: (input: UpdateTaskListInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('task-list:update', input),
  deleteTaskList: (input: DeleteTaskListInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('task-list:delete', input),
  createDocument: (input: CreateDocumentInput): Promise<DocumentRecord> =>
    ipcRenderer.invoke('document:create', input),
  openDocument: (documentId: string): Promise<DocumentRecord> =>
    ipcRenderer.invoke('document:open', documentId),
  updateDocument: (input: UpdateDocumentInput): Promise<DocumentRecord> =>
    ipcRenderer.invoke('document:update', input),
  deleteDocument: (input: DeleteDocumentInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('document:delete', input),
  createDocumentComment: (input: CreateDocumentCommentInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('document-comment:create', input),
  updateDocumentComment: (input: UpdateDocumentCommentInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('document-comment:update', input),
  deleteDocumentComment: (input: DeleteDocumentCommentInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('document-comment:delete', input),
  updateProfile: (input: UpdateProfileInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('profile:update', input),
  testAgentConnection: (agentId: string): Promise<AgentConnectionTestResult> =>
    ipcRenderer.invoke('agent:test-connection', agentId),
  cancelQueued: (input: CancelQueuedInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('conversation:cancel-queued', input),
  cancelActive: (conversationId: string): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('agent:cancel-active', conversationId),
  revealWorkspace: (): Promise<string> => ipcRenderer.invoke('workspace:reveal'),
  revealConversation: (conversationId: string): Promise<string> =>
    ipcRenderer.invoke('conversation:reveal', conversationId),
  exportConversation: (conversationId: string): Promise<string> =>
    ipcRenderer.invoke('conversation:export', conversationId),
  revealDocument: (documentId: string): Promise<string> =>
    ipcRenderer.invoke('document:reveal', documentId),
  onWorkspaceSnapshot: (callback: (snapshot: WorkspaceSnapshot) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: WorkspaceSnapshot) =>
      callback(snapshot);
    ipcRenderer.on('workspace:snapshot', listener);
    return () => ipcRenderer.removeListener('workspace:snapshot', listener);
  },
});
