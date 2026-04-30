import { contextBridge, ipcRenderer } from 'electron';
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
} from '../../src/shared/types';

contextBridge.exposeInMainWorld('f5', {
  platform: process.platform,
  initializeWorkspace: (activeConversationId?: string): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('workspace:initialize', activeConversationId),
  createConversation: (input: CreateConversationInput): Promise<WorkspaceSnapshot> =>
    ipcRenderer.invoke('conversation:create', input),
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
  onWorkspaceSnapshot: (callback: (snapshot: WorkspaceSnapshot) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: WorkspaceSnapshot) =>
      callback(snapshot);
    ipcRenderer.on('workspace:snapshot', listener);
    return () => ipcRenderer.removeListener('workspace:snapshot', listener);
  },
});
