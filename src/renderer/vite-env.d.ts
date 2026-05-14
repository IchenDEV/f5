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
      initializeWorkspace: (activeConversationId?: string) => Promise<WorkspaceSnapshot>;
      createConversation: (input: CreateConversationInput) => Promise<WorkspaceSnapshot>;
      createTaskConversation: (input: CreateTaskConversationInput) => Promise<WorkspaceSnapshot>;
      openConversation: (
        conversationId: string,
      ) => Promise<WorkspaceSnapshot['activeConversation']>;
      sendMessage: (input: SendMessageInput) => Promise<WorkspaceSnapshot>;
      renameConversation: (input: RenameConversationInput) => Promise<WorkspaceSnapshot>;
      starConversation: (input: StarConversationInput) => Promise<WorkspaceSnapshot>;
      archiveConversation: (input: ArchiveConversationInput) => Promise<WorkspaceSnapshot>;
      deleteConversation: (input: DeleteConversationInput) => Promise<WorkspaceSnapshot>;
      createTask: (input: CreateTaskInput) => Promise<WorkspaceSnapshot>;
      updateTask: (input: UpdateTaskInput) => Promise<WorkspaceSnapshot>;
      deleteTask: (input: DeleteTaskInput) => Promise<WorkspaceSnapshot>;
      createTaskList: (input: CreateTaskListInput) => Promise<WorkspaceSnapshot>;
      updateTaskList: (input: UpdateTaskListInput) => Promise<WorkspaceSnapshot>;
      deleteTaskList: (input: DeleteTaskListInput) => Promise<WorkspaceSnapshot>;
      createDocument: (input: CreateDocumentInput) => Promise<DocumentRecord>;
      openDocument: (documentId: string) => Promise<DocumentRecord>;
      updateDocument: (input: UpdateDocumentInput) => Promise<DocumentRecord>;
      deleteDocument: (input: DeleteDocumentInput) => Promise<WorkspaceSnapshot>;
      createDocumentComment: (input: CreateDocumentCommentInput) => Promise<WorkspaceSnapshot>;
      updateDocumentComment: (input: UpdateDocumentCommentInput) => Promise<WorkspaceSnapshot>;
      deleteDocumentComment: (input: DeleteDocumentCommentInput) => Promise<WorkspaceSnapshot>;
      updateProfile: (input: UpdateProfileInput) => Promise<WorkspaceSnapshot>;
      testAgentConnection: (agentId: string) => Promise<AgentConnectionTestResult>;
      cancelQueued: (input: CancelQueuedInput) => Promise<WorkspaceSnapshot>;
      cancelActive: (conversationId: string) => Promise<WorkspaceSnapshot>;
      revealWorkspace: () => Promise<string>;
      revealConversation: (conversationId: string) => Promise<string>;
      exportConversation: (conversationId: string) => Promise<string>;
      revealDocument: (documentId: string) => Promise<string>;
      onWorkspaceSnapshot: (callback: (snapshot: WorkspaceSnapshot) => void) => () => void;
    };
  }
}

interface Window {
  f5: {
    platform: NodeJS.Platform;
  };
}
