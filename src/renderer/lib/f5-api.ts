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
  platform: window.f5?.platform ?? 'darwin',
  workspace: {
    getSnapshot(activeConversationId?: string) {
      return window.f5.workspace.getSnapshot(activeConversationId);
    },
    subscribe(callback: (snapshot: WorkspaceSnapshot) => void) {
      return window.f5.workspace.subscribe(callback);
    },
    reveal() {
      return window.f5.workspace.reveal();
    },
  },
  conversations: {
    create(input: CreateConversationInput) {
      return window.f5.conversations.create(input);
    },
    createTask(input: CreateTaskConversationInput) {
      return window.f5.conversations.createTask(input);
    },
    open(conversationId: string) {
      return window.f5.conversations.open(conversationId);
    },
    send(input: SendMessageInput) {
      return window.f5.conversations.send(input);
    },
    rename(input: RenameConversationInput) {
      return window.f5.conversations.rename(input);
    },
    star(input: StarConversationInput) {
      return window.f5.conversations.star(input);
    },
    archive(input: ArchiveConversationInput) {
      return window.f5.conversations.archive(input);
    },
    delete(input: DeleteConversationInput) {
      return window.f5.conversations.delete(input);
    },
    cancelQueued(input: CancelQueuedInput) {
      return window.f5.conversations.cancelQueued(input);
    },
    cancelActive(conversationId: string) {
      return window.f5.conversations.cancelActive(conversationId);
    },
    reveal(conversationId: string) {
      return window.f5.conversations.reveal(conversationId);
    },
    export(conversationId: string) {
      return window.f5.conversations.export(conversationId);
    },
  },
  tasks: {
    create(input: CreateTaskInput) {
      return window.f5.tasks.create(input);
    },
    update(input: UpdateTaskInput) {
      return window.f5.tasks.update(input);
    },
    delete(input: DeleteTaskInput) {
      return window.f5.tasks.delete(input);
    },
    createList(input: CreateTaskListInput) {
      return window.f5.tasks.createList(input);
    },
    updateList(input: UpdateTaskListInput) {
      return window.f5.tasks.updateList(input);
    },
    deleteList(input: DeleteTaskListInput) {
      return window.f5.tasks.deleteList(input);
    },
  },
  documents: {
    create(input: CreateDocumentInput) {
      return window.f5.documents.create(input);
    },
    open(documentId: string) {
      return window.f5.documents.open(documentId);
    },
    update(input: UpdateDocumentInput) {
      return window.f5.documents.update(input);
    },
    delete(input: DeleteDocumentInput) {
      return window.f5.documents.delete(input);
    },
    reveal(documentId: string) {
      return window.f5.documents.reveal(documentId);
    },
    comments: {
      create(input: CreateDocumentCommentInput) {
        return window.f5.documents.comments.create(input);
      },
      update(input: UpdateDocumentCommentInput) {
        return window.f5.documents.comments.update(input);
      },
      delete(input: DeleteDocumentCommentInput) {
        return window.f5.documents.comments.delete(input);
      },
    },
  },
  profile: {
    update(input: UpdateProfileInput) {
      return window.f5.profile.update(input);
    },
  },
  agents: {
    testConnection(agentId: string) {
      return window.f5.agents.testConnection(agentId);
    },
  },
};
