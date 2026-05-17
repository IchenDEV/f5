import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  FileText,
  Grid2X2,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { IconButton, UserAvatar } from '@/app/workbench-primitives';
import { AgentProfilePage, AgentsPage, UserProfilePage } from '@/app/profile-pages';
import f5LogoDarkUrl from '../../../resources/icon-dark.png';
import f5LogoUrl from '../../../resources/icon.png';
import { fallbackSnapshot } from '@/data/fallback';
import {
  AgentProgressPanel,
  ChatComposer,
  ChatHeader,
  ConversationDetailsDialog,
  ConversationPane,
  DeleteConversationDialog,
  MessageTimeline,
  RawLogsDialog,
} from '@/features/chat/chat-workspace';
import { DocumentsPage } from '@/features/documents/documents-page';
import { TaskWorkbenchPage } from '@/features/task-workbench';
import { TasksPage } from '@/features/tasks/tasks-page';
import { WorkspaceBoardPage } from '@/features/workspace-board';
import { f5Api } from '@/lib/f5-api';
import { cn } from '@/lib/utils';
import { HUMAN_ASSIGNEE_ID } from '../../shared/types';
import { workspaceEntitiesFromSnapshot } from '../../shared/workspace-entities';
import type {
  AgentConfig,
  AppView,
  CreateDocumentCommentInput,
  CreateDocumentInput,
  CreateTaskConversationInput,
  CreateTaskListInput,
  CreateTaskInput,
  DeleteDocumentCommentInput,
  DeleteDocumentInput,
  DeleteTaskListInput,
  DeleteTaskInput,
  DocumentRecord,
  OpenConversation,
  UpdateDocumentCommentInput,
  UpdateDocumentInput,
  UpdateProfileInput,
  UpdateTaskListInput,
  UpdateTaskInput,
  WorkspaceEntity,
  WorkspaceEntityRef,
  WorkspaceSnapshot,
} from '../../shared/types';

type ThemePreference = UpdateProfileInput['theme'];
type IconThemePreference = UpdateProfileInput['iconTheme'];
type ThemeMode = 'light' | 'dark';

function getSystemTheme(): ThemeMode {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Main workspace coordinator: owns cross-pane state and passes minimal callbacks into focused view components.
function WorkspaceApp(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(fallbackSnapshot);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [view, setView] = useState<AppView>('workspace');
  const [activeTaskId, setActiveTaskId] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rawLogsOpen, setRawLogsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>('light');
  const [iconThemePreference, setIconThemePreference] = useState<IconThemePreference>('system');
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(() => getSystemTheme());
  const [error, setError] = useState('');

  const applySnapshot = useCallback((next: WorkspaceSnapshot): void => {
    setSnapshot(next);
    setThemePreference(next.profile.theme);
    setIconThemePreference(next.profile.iconTheme);
    setError('');
  }, []);

  useEffect(() => {
    let mounted = true;
    void f5Api.workspace
      .getSnapshot()
      .then((next) => {
        if (mounted) applySnapshot(next);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : String(reason)),
      );
    const unsubscribe = f5Api.workspace.subscribe(applySnapshot);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [applySnapshot]);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return;
    const syncSystemTheme = (): void => setSystemTheme(query.matches ? 'dark' : 'light');
    syncSystemTheme();
    query.addEventListener('change', syncSystemTheme);
    return () => query.removeEventListener('change', syncSystemTheme);
  }, []);

  const active = snapshot.activeConversation;
  const mentionEntities = useMemo(() => workspaceEntitiesFromSnapshot(snapshot), [snapshot]);
  const resolvedTheme = themePreference === 'system' ? systemTheme : themePreference;
  const resolvedIconTheme = iconThemePreference === 'system' ? systemTheme : iconThemePreference;
  const currentLogoUrl = resolvedIconTheme === 'dark' ? f5LogoDarkUrl : f5LogoUrl;
  const hasLiveTurn = Boolean(
    active &&
    (active.state.activeTurnId ||
      active.state.queue.length > 0 ||
      active.messages.some((message) =>
        ['active', 'streaming', 'queued'].includes(message.meta.status),
      )),
  );

  useEffect(() => {
    const dark = resolvedTheme === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.body.classList.toggle('dark', dark);
    return () => {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    };
  }, [resolvedTheme]);

  useEffect(() => {
    if (!active?.conversation.id || !hasLiveTurn) return;
    let cancelled = false;
    const refreshActiveConversation = (): void => {
      void f5Api.workspace
        .getSnapshot(active.conversation.id)
        .then((next) => {
          if (!cancelled) applySnapshot(next);
        })
        .catch((reason: unknown) => {
          if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
        });
    };
    const interval = window.setInterval(refreshActiveConversation, 900);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [active?.conversation.id, applySnapshot, hasLiveTurn]);

  const isConversationView = view === 'workspace';
  const showConversationList = isConversationView && listOpen;
  const filteredConversations = useMemo(() => {
    const scoped = snapshot.conversations.filter((conversation) =>
      showArchived ? conversation.status === 'archived' : conversation.status !== 'archived',
    );
    const normalized = query.trim().toLowerCase();
    if (!normalized) return scoped;
    return scoped.filter((conversation) =>
      `${conversation.title} ${conversation.agentName} ${conversation.preview}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, showArchived, snapshot.conversations]);
  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return snapshot.tasks;
    return snapshot.tasks.filter((task) =>
      `${task.title} ${task.body} ${
        task.agentId === HUMAN_ASSIGNEE_ID
          ? snapshot.profile.displayName
          : (snapshot.agents.find((agent) => agent.id === task.agentId)?.name ?? task.agentId)
      }`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, snapshot.agents, snapshot.profile.displayName, snapshot.tasks]);
  const filteredDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return snapshot.documents;
    return snapshot.documents.filter((document) =>
      `${document.title} ${snapshot.documentComments
        .filter((comment) => comment.documentId === document.id)
        .map((comment) => `${comment.anchorText} ${comment.body}`)
        .join(' ')}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, snapshot.documentComments, snapshot.documents]);

  async function updateSnapshot(
    action: Promise<WorkspaceSnapshot>,
  ): Promise<WorkspaceSnapshot | undefined> {
    try {
      const next = await action;
      applySnapshot(next);
      return next;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      return undefined;
    }
  }

  function persistThemePreference(preference: ThemePreference): void {
    setThemePreference(preference);
    void updateSnapshot(
      f5Api.profile.update({
        displayName: snapshot.profile.displayName,
        defaultAgentId: snapshot.profile.defaultAgentId,
        theme: preference,
        iconTheme: iconThemePreference,
      }),
    );
  }

  async function createTask(input: CreateTaskInput): Promise<void> {
    await updateSnapshot(f5Api.tasks.create(input));
  }

  async function updateTask(input: UpdateTaskInput): Promise<void> {
    await updateSnapshot(f5Api.tasks.update(input));
  }

  async function deleteTask(input: DeleteTaskInput): Promise<void> {
    await updateSnapshot(f5Api.tasks.delete(input));
  }

  async function createTaskList(input: CreateTaskListInput): Promise<void> {
    await updateSnapshot(f5Api.tasks.createList(input));
  }

  async function updateTaskList(input: UpdateTaskListInput): Promise<void> {
    await updateSnapshot(f5Api.tasks.updateList(input));
  }

  async function deleteTaskList(input: DeleteTaskListInput): Promise<void> {
    await updateSnapshot(f5Api.tasks.deleteList(input));
  }

  async function refreshWorkspace(): Promise<void> {
    await updateSnapshot(f5Api.workspace.getSnapshot(active?.conversation.id));
  }

  async function createDocument(input: CreateDocumentInput): Promise<DocumentRecord> {
    try {
      const document = await f5Api.documents.create(input);
      await refreshWorkspace();
      return document;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      throw reason;
    }
  }

  async function openDocument(documentId: string): Promise<DocumentRecord> {
    try {
      return await f5Api.documents.open(documentId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      throw reason;
    }
  }

  async function updateDocument(input: UpdateDocumentInput): Promise<DocumentRecord> {
    try {
      const document = await f5Api.documents.update(input);
      await refreshWorkspace();
      return document;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      throw reason;
    }
  }

  async function deleteDocument(input: DeleteDocumentInput): Promise<void> {
    await updateSnapshot(f5Api.documents.delete(input));
  }

  async function createDocumentComment(input: CreateDocumentCommentInput): Promise<void> {
    await updateSnapshot(f5Api.documents.comments.create(input));
  }

  async function updateDocumentComment(input: UpdateDocumentCommentInput): Promise<void> {
    await updateSnapshot(f5Api.documents.comments.update(input));
  }

  async function deleteDocumentComment(input: DeleteDocumentCommentInput): Promise<void> {
    await updateSnapshot(f5Api.documents.comments.delete(input));
  }

  async function openConversation(conversationId: string): Promise<void> {
    const next = await updateSnapshot(f5Api.workspace.getSnapshot(conversationId));
    if (next) setView('workspace');
  }

  function openTask(taskId: string): void {
    setActiveTaskId(taskId);
    setView('task-workbench');
  }

  async function createTaskConversation(input: CreateTaskConversationInput): Promise<void> {
    const next = await updateSnapshot(f5Api.conversations.createTask(input));
    const taskId = next?.activeConversation?.conversation.taskId;
    if (taskId) setActiveTaskId(taskId);
    if (next) setView('workspace');
  }

  async function startTaskChat(taskId: string): Promise<void> {
    const task = snapshot.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const agentId =
      task.agentId === HUMAN_ASSIGNEE_ID ? snapshot.profile.defaultAgentId : task.agentId;
    const next = await updateSnapshot(
      f5Api.conversations.create({
        title: task.title,
        agentId,
        taskId: task.id,
      }),
    );
    if (next) setView('workspace');
  }

  async function createTaskDocument(taskId: string): Promise<void> {
    const task = snapshot.tasks.find((item) => item.id === taskId);
    if (!task) return;
    await createDocument({
      title: task.title,
      body: `# ${task.title}\n`,
      taskId: task.id,
    });
    setActiveTaskId(task.id);
    setView('task-workbench');
  }

  async function sendPrompt(): Promise<void> {
    if (!active || !draft.trim()) return;
    const content = draft.trim();
    setDraft('');
    await updateSnapshot(
      f5Api.conversations.send({ conversationId: active.conversation.id, content }),
    );
  }

  async function sendAgentPrompt(content: string): Promise<void> {
    if (!active || !content.trim()) return;
    const next = await updateSnapshot(
      f5Api.conversations.send({ conversationId: active.conversation.id, content }),
    );
    if (next) setView('workspace');
  }

  function openWorkspaceEntity(entity: WorkspaceEntityRef): void {
    if (entity.kind === 'conversation') {
      setView('workspace');
      void updateSnapshot(f5Api.workspace.getSnapshot(entity.id));
      return;
    }
    if (entity.kind === 'agent') {
      setView('agent-profile');
      return;
    }
    setQuery(entity.label);
    setView(entity.kind === 'document' ? 'documents' : 'tasks');
  }

  return (
    <div className={cn('liquid-window h-full overflow-hidden', resolvedTheme === 'dark' && 'dark')}>
      <main className="h-full overflow-hidden text-foreground">
        <section className="flex h-full min-h-0 overflow-hidden">
          <NavigationRail
            activeView={view}
            displayName={snapshot.profile.displayName}
            logoUrl={currentLogoUrl}
            onNavigate={setView}
            onUserProfile={() => setView('user-profile')}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopChrome
              view={view}
              query={query}
              onQueryChange={setQuery}
              onNewConversation={() => setNewOpen(true)}
              onToggleTheme={() =>
                persistThemePreference(resolvedTheme === 'dark' ? 'light' : 'dark')
              }
              onBack={() => setView('workspace')}
              onForward={() => setView(active ? 'agent-profile' : 'agents')}
            />
            {error ? (
              <ErrorBanner
                message={error}
                onRetry={() => void updateSnapshot(f5Api.workspace.getSnapshot())}
              />
            ) : null}
            <div
              className={cn(
                'grid min-h-0 flex-1 gap-5 overflow-hidden px-5 pb-5 pt-1',
                showConversationList
                  ? 'grid-cols-[minmax(0,340px)_minmax(0,1fr)] max-lg:grid-cols-1'
                  : 'grid-cols-1',
              )}
            >
              {showConversationList ? (
                <aside className="min-h-0 bg-transparent max-lg:hidden">
                  <ConversationPane
                    conversations={filteredConversations}
                    activeId={active?.conversation.id}
                    query={query}
                    onQueryChange={setQuery}
                    onOpen={(conversationId) => void openConversation(conversationId)}
                    onNew={() => setNewOpen(true)}
                    agents={snapshot.agents}
                    defaultAgentId={snapshot.profile.defaultAgentId}
                    showArchived={showArchived}
                    archivedCount={
                      snapshot.conversations.filter(
                        (conversation) => conversation.status === 'archived',
                      ).length
                    }
                    onToggleArchived={() => setShowArchived((value) => !value)}
                    onQuickCreate={(input) => void createTaskConversation(input)}
                  />
                </aside>
              ) : null}
              <WorkspaceSurface
                view={view}
                snapshot={snapshot}
                mentionEntities={mentionEntities}
                active={active}
                activeTaskId={activeTaskId}
                taskLists={snapshot.taskLists}
                tasks={filteredTasks}
                documents={filteredDocuments}
                documentComments={snapshot.documentComments}
                query={query}
                onQueryChange={setQuery}
                draft={draft}
                panelOpen={panelOpen}
                onDraftChange={setDraft}
                onSend={() => void sendPrompt()}
                onRename={() => setRenameOpen(true)}
                onStar={() =>
                  active &&
                  void updateSnapshot(
                    f5Api.conversations.star({
                      conversationId: active.conversation.id,
                      starred: !active.conversation.starred,
                    }),
                  )
                }
                onArchive={() =>
                  active &&
                  void updateSnapshot(
                    f5Api.conversations.archive({
                      conversationId: active.conversation.id,
                      archived: active.conversation.status !== 'archived',
                    }),
                  )
                }
                onDelete={() => setDeleteOpen(true)}
                onReveal={() =>
                  active && void f5Api.conversations.reveal(active.conversation.id).catch(String)
                }
                onDetails={() => setDetailsOpen(true)}
                onRawLogs={() => setRawLogsOpen(true)}
                onExport={() =>
                  active && void f5Api.conversations.export(active.conversation.id).catch(String)
                }
                onCancelQueued={(messageId) =>
                  active &&
                  void updateSnapshot(
                    f5Api.conversations.cancelQueued({
                      conversationId: active.conversation.id,
                      messageId,
                    }),
                  )
                }
                onCancelActive={() =>
                  active &&
                  void updateSnapshot(f5Api.conversations.cancelActive(active.conversation.id))
                }
                onAgentProfile={() => setView('agent-profile')}
                onOpenTasks={() => setView('tasks')}
                onOpenTask={openTask}
                onUserProfile={() => setView('user-profile')}
                onBack={() => setView(view === 'task-workbench' ? 'board' : 'workspace')}
                onTogglePanel={() => setPanelOpen((value) => !value)}
                onProfileSave={(input) => void updateSnapshot(f5Api.profile.update(input))}
                onThemePreview={setThemePreference}
                onIconThemePreview={setIconThemePreference}
                iconPreviewUrl={currentLogoUrl}
                onOpenTaskConversation={(conversationId) => void openConversation(conversationId)}
                onStartTaskChat={(taskId) => void startTaskChat(taskId)}
                onCreateTaskDocument={(taskId) => void createTaskDocument(taskId)}
                onCreateTask={createTask}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onCreateTaskList={createTaskList}
                onUpdateTaskList={updateTaskList}
                onDeleteTaskList={deleteTaskList}
                onCreateDocument={createDocument}
                onOpenDocument={openDocument}
                onUpdateDocument={updateDocument}
                onDeleteDocument={deleteDocument}
                onCreateDocumentComment={createDocumentComment}
                onUpdateDocumentComment={updateDocumentComment}
                onDeleteDocumentComment={deleteDocumentComment}
                onSendToAgent={sendAgentPrompt}
                onOpenEntity={openWorkspaceEntity}
                onRevealDocument={(documentId) =>
                  f5Api.documents.reveal(documentId).then(() => undefined)
                }
              />
            </div>
          </div>
        </section>
      </main>
      <NewConversationFlow
        open={newOpen}
        agents={snapshot.agents}
        defaultAgentId={snapshot.profile.defaultAgentId}
        onOpenChange={setNewOpen}
        onCreate={(input) => void createTaskConversation(input).then(() => setNewOpen(false))}
      />
      <RenameDialog
        open={renameOpen}
        active={active}
        onOpenChange={setRenameOpen}
        onRename={(title) =>
          active &&
          void updateSnapshot(
            f5Api.conversations.rename({ conversationId: active.conversation.id, title }),
          ).then(() => setRenameOpen(false))
        }
      />
      <Sheet open={showConversationList && window.innerWidth < 1024} onOpenChange={setListOpen}>
        <SheetContent side="left" className="w-[360px] max-w-[calc(100vw-2rem)] p-0 pt-14">
          <SheetHeader className="sr-only">
            <SheetTitle>Conversations</SheetTitle>
          </SheetHeader>
          <ConversationPane
            conversations={filteredConversations}
            activeId={active?.conversation.id}
            query={query}
            onQueryChange={setQuery}
            onOpen={(conversationId) => void openConversation(conversationId)}
            onNew={() => setNewOpen(true)}
            agents={snapshot.agents}
            defaultAgentId={snapshot.profile.defaultAgentId}
            showArchived={showArchived}
            archivedCount={
              snapshot.conversations.filter((conversation) => conversation.status === 'archived')
                .length
            }
            onToggleArchived={() => setShowArchived((value) => !value)}
            onQuickCreate={(input) => void createTaskConversation(input)}
          />
        </SheetContent>
      </Sheet>
      <ConversationDetailsDialog
        open={detailsOpen}
        active={active}
        onOpenChange={setDetailsOpen}
        onReveal={() => active && void f5Api.conversations.reveal(active.conversation.id)}
      />
      <RawLogsDialog open={rawLogsOpen} active={active} onOpenChange={setRawLogsOpen} />
      <DeleteConversationDialog
        open={deleteOpen}
        active={active}
        onOpenChange={setDeleteOpen}
        onDelete={() =>
          active &&
          void updateSnapshot(
            f5Api.conversations.delete({ conversationId: active.conversation.id }),
          ).then(() => setDeleteOpen(false))
        }
      />
    </div>
  );
}

/**
 * Top chrome groups macOS-style controls, search, quick create, and theme in one fixed row.
 */
function TopChrome(props: {
  view: AppView;
  query: string;
  onQueryChange: (value: string) => void;
  onNewConversation: () => void;
  onToggleTheme: () => void;
  onBack: () => void;
  onForward: () => void;
}): React.JSX.Element {
  const placeholder = searchPlaceholder(props.view);
  return (
    <header className="app-drag flex h-14 shrink-0 items-center gap-3 px-6">
      <div className="flex items-center gap-1 text-muted-foreground">
        <IconButton
          label="Back to workspace"
          icon={ArrowLeft}
          variant="ghost"
          onClick={props.onBack}
        />
        <IconButton
          label="Open related detail"
          icon={ArrowRight}
          variant="ghost"
          onClick={props.onForward}
        />
      </div>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <div className="relative hidden w-[280px] md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={placeholder}
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder={placeholder}
            className="liquid-glass-control h-9 rounded-lg pl-9"
          />
        </div>
        <IconButton label="New task" icon={Plus} onClick={props.onNewConversation} />
        <IconButton label="Toggle theme" icon={Sparkles} onClick={props.onToggleTheme} />
      </div>
    </header>
  );
}

function searchPlaceholder(view: AppView): string {
  if (view === 'board') return 'Search board';
  if (view === 'task-workbench') return 'Search task';
  if (view === 'tasks') return 'Search TODO';
  if (view === 'documents') return 'Search docs';
  return 'Search conversations';
}

/**
 * Navigation rail keeps every first-version section reachable from the same fixed left edge.
 */
function NavigationRail(props: {
  activeView: AppView;
  displayName: string;
  logoUrl: string;
  onNavigate: (view: AppView) => void;
  onUserProfile: () => void;
}): React.JSX.Element {
  const items = [
    { label: 'Chat', icon: MessageCircle, view: 'workspace' as const },
    { label: 'Board', icon: Grid2X2, view: 'board' as const },
    { label: 'TODO', icon: Check, view: 'tasks' as const },
    { label: 'Docs', icon: FileText, view: 'documents' as const },
    { label: 'Agents', icon: Bot, view: 'agents' as const },
  ];
  return (
    <nav className="flex w-[74px] shrink-0 flex-col items-center bg-transparent pb-5 pt-[60px]">
      <div className="mb-8 grid size-10 place-items-center overflow-hidden rounded-[14px]">
        <img src={props.logoUrl} alt="F5" className="size-10 rounded-[14px] object-cover" />
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <IconButton
            key={item.label}
            label={item.label}
            icon={item.icon}
            className={cn(props.activeView === item.view && 'bg-accent text-accent-foreground')}
            onClick={() => props.onNavigate(item.view)}
          />
        ))}
      </div>
      <div className="mt-auto flex flex-col items-center gap-2">
        <button aria-label="Open user profile" onClick={props.onUserProfile}>
          <UserAvatar displayName={props.displayName} className="size-9" />
        </button>
      </div>
    </nav>
  );
}

// Workspace surface chooses between chat, profile pages, and workspace utility pages while preserving draft state upstream.
function WorkspaceSurface(props: {
  view: AppView;
  snapshot: WorkspaceSnapshot;
  mentionEntities: WorkspaceEntity[];
  active?: OpenConversation;
  activeTaskId: string;
  taskLists: WorkspaceSnapshot['taskLists'];
  tasks: WorkspaceSnapshot['tasks'];
  documents: WorkspaceSnapshot['documents'];
  documentComments: WorkspaceSnapshot['documentComments'];
  query: string;
  onQueryChange: (value: string) => void;
  draft: string;
  panelOpen: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onRename: () => void;
  onStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onReveal: () => void;
  onDetails: () => void;
  onRawLogs: () => void;
  onExport: () => void;
  onCancelQueued: (messageId: string) => void;
  onCancelActive: () => void;
  onAgentProfile: () => void;
  onOpenTasks: () => void;
  onOpenTask: (taskId: string) => void;
  onUserProfile: () => void;
  onBack: () => void;
  onTogglePanel: () => void;
  onProfileSave: (input: UpdateProfileInput) => void;
  onThemePreview: (theme: ThemePreference) => void;
  onIconThemePreview: (theme: IconThemePreference) => void;
  iconPreviewUrl: string;
  onCreateTask: (input: CreateTaskInput) => Promise<void>;
  onUpdateTask: (input: UpdateTaskInput) => Promise<void>;
  onDeleteTask: (input: DeleteTaskInput) => Promise<void>;
  onCreateTaskList: (input: CreateTaskListInput) => Promise<void>;
  onUpdateTaskList: (input: UpdateTaskListInput) => Promise<void>;
  onDeleteTaskList: (input: DeleteTaskListInput) => Promise<void>;
  onCreateDocument: (input: CreateDocumentInput) => Promise<DocumentRecord>;
  onOpenDocument: (documentId: string) => Promise<DocumentRecord>;
  onUpdateDocument: (input: UpdateDocumentInput) => Promise<DocumentRecord>;
  onDeleteDocument: (input: DeleteDocumentInput) => Promise<void>;
  onCreateDocumentComment: (input: CreateDocumentCommentInput) => Promise<void>;
  onUpdateDocumentComment: (input: UpdateDocumentCommentInput) => Promise<void>;
  onDeleteDocumentComment: (input: DeleteDocumentCommentInput) => Promise<void>;
  onSendToAgent: (content: string) => Promise<void>;
  onOpenEntity: (entity: WorkspaceEntityRef) => void;
  onRevealDocument: (documentId: string) => Promise<void>;
  onOpenTaskConversation: (conversationId: string) => void;
  onStartTaskChat: (taskId: string) => void;
  onCreateTaskDocument: (taskId: string) => void;
}): React.JSX.Element {
  const active = props.active;
  const activeTask = active?.conversation.taskId
    ? props.snapshot.tasks.find((task) => task.id === active.conversation.taskId)
    : undefined;
  if (props.view === 'user-profile') {
    return (
      <UserProfilePage
        snapshot={props.snapshot}
        onBack={props.onBack}
        onSave={props.onProfileSave}
        onThemePreview={props.onThemePreview}
        onIconThemePreview={props.onIconThemePreview}
        iconPreviewUrl={props.iconPreviewUrl}
      />
    );
  }
  if (props.view === 'agent-profile') {
    return (
      <AgentProfilePage agent={active?.agent ?? props.snapshot.agents[0]} onBack={props.onBack} />
    );
  }
  if (props.view === 'tasks') {
    return (
      <TasksPage
        taskLists={props.taskLists}
        tasks={props.tasks}
        agents={props.snapshot.agents}
        defaultAgentId={props.snapshot.profile.defaultAgentId}
        profileDisplayName={props.snapshot.profile.displayName}
        mentionEntities={props.mentionEntities}
        query={props.query}
        onQueryChange={props.onQueryChange}
        onBack={props.onBack}
        onCreateTaskList={props.onCreateTaskList}
        onUpdateTaskList={props.onUpdateTaskList}
        onDeleteTaskList={props.onDeleteTaskList}
        onCreateTask={props.onCreateTask}
        onUpdateTask={props.onUpdateTask}
        onDeleteTask={props.onDeleteTask}
        onOpenEntity={props.onOpenEntity}
      />
    );
  }
  if (props.view === 'board') {
    return (
      <WorkspaceBoardPage
        snapshot={props.snapshot}
        query={props.query}
        onQueryChange={props.onQueryChange}
        onOpenTask={props.onOpenTask}
        onOpenTasks={props.onOpenTasks}
      />
    );
  }
  if (props.view === 'task-workbench') {
    return (
      <TaskWorkbenchPage
        snapshot={props.snapshot}
        taskId={props.activeTaskId}
        onBack={props.onBack}
        onOpenConversation={props.onOpenTaskConversation}
        onStartChat={props.onStartTaskChat}
        onCreateDocument={props.onCreateTaskDocument}
      />
    );
  }
  if (props.view === 'documents') {
    return (
      <DocumentsPage
        documents={props.documents}
        comments={props.documentComments}
        tasks={props.snapshot.tasks}
        mentionEntities={props.mentionEntities}
        query={props.query}
        onQueryChange={props.onQueryChange}
        onBack={props.onBack}
        onCreateDocument={props.onCreateDocument}
        onOpenDocument={props.onOpenDocument}
        onUpdateDocument={props.onUpdateDocument}
        onDeleteDocument={props.onDeleteDocument}
        onCreateDocumentComment={props.onCreateDocumentComment}
        onUpdateDocumentComment={props.onUpdateDocumentComment}
        onDeleteDocumentComment={props.onDeleteDocumentComment}
        onRevealDocument={props.onRevealDocument}
        onSendToAgent={props.onSendToAgent}
        onOpenEntity={props.onOpenEntity}
        canSendToAgent={Boolean(active)}
        agentName={active?.agent.name ?? 'Agent'}
      />
    );
  }
  if (props.view === 'agents') {
    return (
      <AgentsPage
        agents={props.snapshot.agents}
        onBack={props.onBack}
        onOpenAgent={props.onAgentProfile}
      />
    );
  }
  return (
    <section className="h-full min-h-0 overflow-hidden">
      <Card
        className={cn(
          'liquid-float-card grid h-full min-h-0 grid-cols-1 gap-0 overflow-hidden rounded-lg border py-0 ring-0',
          props.panelOpen && active && 'xl:grid-cols-[minmax(0,1fr)_320px]',
        )}
      >
        <div className="flex min-h-0 flex-col">
          {active ? (
            <>
              <ChatHeader
                active={active}
                taskTitle={activeTask?.title}
                onRename={props.onRename}
                onStar={props.onStar}
                onArchive={props.onArchive}
                onDelete={props.onDelete}
                onReveal={props.onReveal}
                onDetails={props.onDetails}
                onExport={props.onExport}
                onTogglePanel={props.onTogglePanel}
              />
              <MessageTimeline
                active={active}
                profileDisplayName={props.snapshot.profile.displayName}
                mentionEntities={props.mentionEntities}
                onOpenEntity={props.onOpenEntity}
                onCancelQueued={props.onCancelQueued}
              />
              <ChatComposer
                active={active}
                draft={props.draft}
                mentionEntities={props.mentionEntities}
                onDraftChange={props.onDraftChange}
                onSend={props.onSend}
                onRevealFiles={props.onReveal}
                onTogglePanel={props.onTogglePanel}
                onAgentProfile={props.onAgentProfile}
              />
            </>
          ) : (
            <EmptyWorkspace />
          )}
        </div>
        {props.panelOpen && active ? (
          <AgentProgressPanel
            active={active}
            onAgentProfile={props.onAgentProfile}
            onClose={props.onTogglePanel}
            onRawLogs={props.onRawLogs}
          />
        ) : null}
      </Card>
    </section>
  );
}

// New task flow owns its draft fields and creates files only after the user confirms the dialog.
function NewConversationFlow(props: {
  open: boolean;
  agents: AgentConfig[];
  defaultAgentId: string;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateTaskConversationInput) => void;
}): React.JSX.Element {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [agentId, setAgentId] = useState(props.defaultAgentId);
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>
            Choose an assignee and optionally start a bound chat with a first prompt.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Task title"
          />
          <Select value={agentId} onValueChange={setAgentId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose agent" />
            </SelectTrigger>
            <SelectContent>
              {props.agents.map((agent) => (
                <SelectItem
                  key={agent.id}
                  value={agent.id}
                  disabled={agent.availability === 'disabled'}
                >
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="First prompt"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              props.onCreate({
                title: title.trim() || titleFromPrompt(prompt) || 'New task',
                agentId,
                firstPrompt: prompt,
              })
            }
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function titleFromPrompt(prompt: string): string {
  const cleaned = prompt.trim().replace(/\s+/g, ' ');
  return cleaned.length > 44 ? `${cleaned.slice(0, 44)}...` : cleaned;
}

// Rename dialog keeps a local title draft so cancelling does not mutate conversation metadata.
function RenameDialog(props: {
  open: boolean;
  active?: OpenConversation;
  onOpenChange: (open: boolean) => void;
  onRename: (title: string) => void;
}): React.JSX.Element {
  const [title, setTitle] = useState(props.active?.conversation.title ?? '');
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename conversation</DialogTitle>
          <DialogDescription>Update the title shown in the header and list.</DialogDescription>
        </DialogHeader>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => props.onRename(title)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyWorkspace(): React.JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <MessageCircle className="size-10" />
      <p>Create a task to start a bound chat with an agent.</p>
    </div>
  );
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 border-b border-destructive/30 bg-destructive/10 px-6 py-3 text-sm text-destructive">
      <span className="truncate">{message}</span>
      <Button variant="outline" size="sm" className="ml-auto" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export { WorkspaceApp };
