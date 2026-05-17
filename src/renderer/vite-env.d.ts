/// <reference types="vite/client" />

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
} from '../shared/types';

declare global {
  interface Window {
    f5: {
      platform: NodeJS.Platform;
      workspace: {
        getSnapshot: (activeConversationId?: string) => Promise<WorkspaceSnapshot>;
        subscribe: (callback: (snapshot: WorkspaceSnapshot) => void) => () => void;
        reveal: () => Promise<string>;
      };
      conversations: {
        create: (input: CreateConversationInput) => Promise<WorkspaceSnapshot>;
        createTask: (input: CreateTaskConversationInput) => Promise<WorkspaceSnapshot>;
        open: (conversationId: string) => Promise<WorkspaceSnapshot['activeConversation']>;
        send: (input: SendMessageInput) => Promise<WorkspaceSnapshot>;
        rename: (input: RenameConversationInput) => Promise<WorkspaceSnapshot>;
        star: (input: StarConversationInput) => Promise<WorkspaceSnapshot>;
        archive: (input: ArchiveConversationInput) => Promise<WorkspaceSnapshot>;
        delete: (input: DeleteConversationInput) => Promise<WorkspaceSnapshot>;
        cancelQueued: (input: CancelQueuedInput) => Promise<WorkspaceSnapshot>;
        cancelActive: (conversationId: string) => Promise<WorkspaceSnapshot>;
        reveal: (conversationId: string) => Promise<string>;
        export: (conversationId: string) => Promise<string>;
      };
      tasks: {
        create: (input: CreateTaskInput) => Promise<WorkspaceSnapshot>;
        update: (input: UpdateTaskInput) => Promise<WorkspaceSnapshot>;
        delete: (input: DeleteTaskInput) => Promise<WorkspaceSnapshot>;
        createList: (input: CreateTaskListInput) => Promise<WorkspaceSnapshot>;
        updateList: (input: UpdateTaskListInput) => Promise<WorkspaceSnapshot>;
        deleteList: (input: DeleteTaskListInput) => Promise<WorkspaceSnapshot>;
      };
      documents: {
        create: (input: CreateDocumentInput) => Promise<DocumentRecord>;
        open: (documentId: string) => Promise<DocumentRecord>;
        update: (input: UpdateDocumentInput) => Promise<DocumentRecord>;
        delete: (input: DeleteDocumentInput) => Promise<WorkspaceSnapshot>;
        reveal: (documentId: string) => Promise<string>;
        comments: {
          create: (input: CreateDocumentCommentInput) => Promise<WorkspaceSnapshot>;
          update: (input: UpdateDocumentCommentInput) => Promise<WorkspaceSnapshot>;
          delete: (input: DeleteDocumentCommentInput) => Promise<WorkspaceSnapshot>;
        };
      };
      profile: {
        update: (input: UpdateProfileInput) => Promise<WorkspaceSnapshot>;
      };
      agents: {
        testConnection: (agentId: string) => Promise<AgentConnectionTestResult>;
      };
    };
  }
}

interface Window {
  f5: {
    platform: NodeJS.Platform;
  };
}
