/// <reference types="vite/client" />

import type {
  ArchiveConversationInput,
  CancelQueuedInput,
  CreateConversationInput,
  DeleteConversationInput,
  RenameConversationInput,
  SendMessageInput,
  StarConversationInput,
  UpdateProfileInput,
  AgentConnectionTestResult,
  WorkspaceSnapshot,
} from '../shared/types';

declare global {
  interface Window {
    f5: {
      platform: NodeJS.Platform;
      initializeWorkspace: (activeConversationId?: string) => Promise<WorkspaceSnapshot>;
      createConversation: (input: CreateConversationInput) => Promise<WorkspaceSnapshot>;
      openConversation: (
        conversationId: string,
      ) => Promise<WorkspaceSnapshot['activeConversation']>;
      sendMessage: (input: SendMessageInput) => Promise<WorkspaceSnapshot>;
      renameConversation: (input: RenameConversationInput) => Promise<WorkspaceSnapshot>;
      starConversation: (input: StarConversationInput) => Promise<WorkspaceSnapshot>;
      archiveConversation: (input: ArchiveConversationInput) => Promise<WorkspaceSnapshot>;
      deleteConversation: (input: DeleteConversationInput) => Promise<WorkspaceSnapshot>;
      updateProfile: (input: UpdateProfileInput) => Promise<WorkspaceSnapshot>;
      testAgentConnection: (agentId: string) => Promise<AgentConnectionTestResult>;
      cancelQueued: (input: CancelQueuedInput) => Promise<WorkspaceSnapshot>;
      cancelActive: (conversationId: string) => Promise<WorkspaceSnapshot>;
      revealWorkspace: () => Promise<string>;
      revealConversation: (conversationId: string) => Promise<string>;
      exportConversation: (conversationId: string) => Promise<string>;
      onWorkspaceSnapshot: (callback: (snapshot: WorkspaceSnapshot) => void) => () => void;
    };
  }
}

interface Window {
  f5: {
    platform: NodeJS.Platform;
  };
}
