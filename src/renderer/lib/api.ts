import type {
  ArchiveConversationInput,
  CancelQueuedInput,
  CreateConversationInput,
  CreateDocumentCommentInput,
  CreateDocumentInput,
  CreateTaskListInput,
  CreateTaskInput,
  DeleteConversationInput,
  DeleteDocumentCommentInput,
  DeleteDocumentInput,
  DeleteTaskListInput,
  DeleteTaskInput,
  RenameConversationInput,
  SendMessageInput,
  StarConversationInput,
  UpdateDocumentCommentInput,
  UpdateDocumentInput,
  UpdateProfileInput,
  UpdateTaskListInput,
  UpdateTaskInput,
  WorkspaceSnapshot,
} from '../../shared/types';

export const f5Api = {
  initializeWorkspace(activeConversationId?: string) {
    return window.f5.initializeWorkspace(activeConversationId);
  },
  createConversation(input: CreateConversationInput) {
    return window.f5.createConversation(input);
  },
  sendMessage(input: SendMessageInput) {
    return window.f5.sendMessage(input);
  },
  renameConversation(input: RenameConversationInput) {
    return window.f5.renameConversation(input);
  },
  starConversation(input: StarConversationInput) {
    return window.f5.starConversation(input);
  },
  archiveConversation(input: ArchiveConversationInput) {
    return window.f5.archiveConversation(input);
  },
  deleteConversation(input: DeleteConversationInput) {
    return window.f5.deleteConversation(input);
  },
  createTask(input: CreateTaskInput) {
    return window.f5.createTask(input);
  },
  updateTask(input: UpdateTaskInput) {
    return window.f5.updateTask(input);
  },
  deleteTask(input: DeleteTaskInput) {
    return window.f5.deleteTask(input);
  },
  createTaskList(input: CreateTaskListInput) {
    return window.f5.createTaskList(input);
  },
  updateTaskList(input: UpdateTaskListInput) {
    return window.f5.updateTaskList(input);
  },
  deleteTaskList(input: DeleteTaskListInput) {
    return window.f5.deleteTaskList(input);
  },
  createDocument(input: CreateDocumentInput) {
    return window.f5.createDocument(input);
  },
  openDocument(documentId: string) {
    return window.f5.openDocument(documentId);
  },
  updateDocument(input: UpdateDocumentInput) {
    return window.f5.updateDocument(input);
  },
  deleteDocument(input: DeleteDocumentInput) {
    return window.f5.deleteDocument(input);
  },
  createDocumentComment(input: CreateDocumentCommentInput) {
    return window.f5.createDocumentComment(input);
  },
  updateDocumentComment(input: UpdateDocumentCommentInput) {
    return window.f5.updateDocumentComment(input);
  },
  deleteDocumentComment(input: DeleteDocumentCommentInput) {
    return window.f5.deleteDocumentComment(input);
  },
  updateProfile(input: UpdateProfileInput) {
    return window.f5.updateProfile(input);
  },
  testAgentConnection(agentId: string) {
    return window.f5.testAgentConnection(agentId);
  },
  cancelQueued(input: CancelQueuedInput) {
    return window.f5.cancelQueued(input);
  },
  cancelActive(conversationId: string) {
    return window.f5.cancelActive(conversationId);
  },
  revealWorkspace() {
    return window.f5.revealWorkspace();
  },
  revealConversation(conversationId: string) {
    return window.f5.revealConversation(conversationId);
  },
  exportConversation(conversationId: string) {
    return window.f5.exportConversation(conversationId);
  },
  revealDocument(documentId: string) {
    return window.f5.revealDocument(documentId);
  },
  onWorkspaceSnapshot(callback: (snapshot: WorkspaceSnapshot) => void) {
    return window.f5.onWorkspaceSnapshot(callback);
  },
};
