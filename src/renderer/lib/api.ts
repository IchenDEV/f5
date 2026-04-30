import type {
  ArchiveConversationInput,
  CancelQueuedInput,
  CreateConversationInput,
  DeleteConversationInput,
  RenameConversationInput,
  SendMessageInput,
  StarConversationInput,
  UpdateProfileInput,
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
  onWorkspaceSnapshot(callback: (snapshot: WorkspaceSnapshot) => void) {
    return window.f5.onWorkspaceSnapshot(callback);
  },
};
