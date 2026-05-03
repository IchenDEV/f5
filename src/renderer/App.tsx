import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronsUp,
  Code2,
  Database,
  FileText,
  FolderOpen,
  Grid2X2,
  Info,
  MessageCircle,
  MoreHorizontal,
  PanelRight,
  Paperclip,
  Plus,
  Search,
  Send,
  Share,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import f5LogoDarkUrl from '@/assets/f5-logo-dark.png';
import f5LogoUrl from '@/assets/f5-logo.png';
import { fallbackSnapshot } from '@/data/fallback';
import { f5Api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type {
  AgentConfig,
  AgentConnectionTestResult,
  AppView,
  ConversationListItem,
  MessageRecord,
  OpenConversation,
  PlanStep,
  ToolActivity,
  UpdateProfileInput,
  WorkspaceSnapshot,
} from '../shared/types';

type ThemePreference = UpdateProfileInput['theme'];
type IconThemePreference = UpdateProfileInput['iconTheme'];
type ThemeMode = 'light' | 'dark';

function getSystemTheme(): ThemeMode {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function App(): React.JSX.Element {
  return (
    <TooltipProvider>
      <WorkspaceApp />
    </TooltipProvider>
  );
}

// Main workspace coordinator: owns cross-pane state and passes minimal callbacks into focused view components.
function WorkspaceApp(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(fallbackSnapshot);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [view, setView] = useState<AppView>('workspace');
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
    void f5Api
      .initializeWorkspace()
      .then((next) => {
        if (mounted) applySnapshot(next);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : String(reason)),
      );
    const unsubscribe = f5Api.onWorkspaceSnapshot(applySnapshot);
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
      void f5Api
        .initializeWorkspace(active.conversation.id)
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
      f5Api.updateProfile({
        displayName: snapshot.profile.displayName,
        defaultAgentId: snapshot.profile.defaultAgentId,
        theme: preference,
        iconTheme: iconThemePreference,
      }),
    );
  }

  async function sendPrompt(): Promise<void> {
    if (!active || !draft.trim()) return;
    const content = draft.trim();
    setDraft('');
    await updateSnapshot(f5Api.sendMessage({ conversationId: active.conversation.id, content }));
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
              query={query}
              onQueryChange={setQuery}
              onNewConversation={() => setNewOpen(true)}
              onToggleTheme={() =>
                persistThemePreference(resolvedTheme === 'dark' ? 'light' : 'dark')
              }
              onBack={() => setView('workspace')}
              onForward={() => setView(active ? 'agent-profile' : 'overview')}
            />
            {error ? (
              <ErrorBanner
                message={error}
                onRetry={() => void updateSnapshot(f5Api.initializeWorkspace())}
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
                    onOpen={(conversationId) =>
                      void updateSnapshot(f5Api.initializeWorkspace(conversationId))
                    }
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
                    onQuickCreate={(input) => void updateSnapshot(f5Api.createConversation(input))}
                  />
                </aside>
              ) : null}
              <WorkspaceSurface
                view={view}
                snapshot={snapshot}
                active={active}
                draft={draft}
                panelOpen={panelOpen}
                onDraftChange={setDraft}
                onSend={() => void sendPrompt()}
                onRename={() => setRenameOpen(true)}
                onStar={() =>
                  active &&
                  void updateSnapshot(
                    f5Api.starConversation({
                      conversationId: active.conversation.id,
                      starred: !active.conversation.starred,
                    }),
                  )
                }
                onArchive={() =>
                  active &&
                  void updateSnapshot(
                    f5Api.archiveConversation({
                      conversationId: active.conversation.id,
                      archived: active.conversation.status !== 'archived',
                    }),
                  )
                }
                onDelete={() => setDeleteOpen(true)}
                onReveal={() =>
                  active && void f5Api.revealConversation(active.conversation.id).catch(String)
                }
                onDetails={() => setDetailsOpen(true)}
                onRawLogs={() => setRawLogsOpen(true)}
                onExport={() =>
                  active && void f5Api.exportConversation(active.conversation.id).catch(String)
                }
                onCancelQueued={(messageId) =>
                  active &&
                  void updateSnapshot(
                    f5Api.cancelQueued({ conversationId: active.conversation.id, messageId }),
                  )
                }
                onCancelActive={() =>
                  active && void updateSnapshot(f5Api.cancelActive(active.conversation.id))
                }
                onAgentProfile={() => setView('agent-profile')}
                onUserProfile={() => setView('user-profile')}
                onBack={() => setView('workspace')}
                onTogglePanel={() => setPanelOpen((value) => !value)}
                onProfileSave={(input) => void updateSnapshot(f5Api.updateProfile(input))}
                onThemePreview={setThemePreference}
                onIconThemePreview={setIconThemePreference}
                iconPreviewUrl={currentLogoUrl}
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
        onCreate={(input) =>
          void updateSnapshot(f5Api.createConversation(input)).then(() => setNewOpen(false))
        }
      />
      <RenameDialog
        open={renameOpen}
        active={active}
        onOpenChange={setRenameOpen}
        onRename={(title) =>
          active &&
          void updateSnapshot(
            f5Api.renameConversation({ conversationId: active.conversation.id, title }),
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
            onOpen={(conversationId) =>
              void updateSnapshot(f5Api.initializeWorkspace(conversationId))
            }
            onNew={() => setNewOpen(true)}
            agents={snapshot.agents}
            defaultAgentId={snapshot.profile.defaultAgentId}
            showArchived={showArchived}
            archivedCount={
              snapshot.conversations.filter((conversation) => conversation.status === 'archived')
                .length
            }
            onToggleArchived={() => setShowArchived((value) => !value)}
            onQuickCreate={(input) => void updateSnapshot(f5Api.createConversation(input))}
          />
        </SheetContent>
      </Sheet>
      <ConversationDetailsDialog
        open={detailsOpen}
        active={active}
        onOpenChange={setDetailsOpen}
        onReveal={() => active && void f5Api.revealConversation(active.conversation.id)}
      />
      <RawLogsDialog open={rawLogsOpen} active={active} onOpenChange={setRawLogsOpen} />
      <DeleteConversationDialog
        open={deleteOpen}
        active={active}
        onOpenChange={setDeleteOpen}
        onDelete={() =>
          active &&
          void updateSnapshot(
            f5Api.deleteConversation({ conversationId: active.conversation.id }),
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
  query: string;
  onQueryChange: (value: string) => void;
  onNewConversation: () => void;
  onToggleTheme: () => void;
  onBack: () => void;
  onForward: () => void;
}): React.JSX.Element {
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
            aria-label="Search conversations"
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder="Search conversations"
            className="liquid-glass-control h-9 rounded-lg pl-9"
          />
        </div>
        <IconButton label="New conversation" icon={Plus} onClick={props.onNewConversation} />
        <IconButton label="Toggle theme" icon={Sparkles} onClick={props.onToggleTheme} />
      </div>
    </header>
  );
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
    { label: 'Workspace overview', icon: Grid2X2, view: 'overview' as const },
    { label: 'Agents', icon: Bot, view: 'agents' as const },
  ];
  return (
    <nav className="flex w-[74px] shrink-0 flex-col items-center bg-transparent pb-5 pt-16">
      <div className="mb-8 grid size-10 place-items-center">
        <img src={props.logoUrl} alt="F5" className="size-10 rounded-xl object-cover" />
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

function initialsFromName(value: string, fallback: string): string {
  const name = value.trim();
  if (!name) return fallback;
  const parts = name.split(/\s+/);
  if (parts.length > 1) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return Array.from(name).slice(0, 2).join('').toUpperCase();
}

function userInitials(displayName: string): string {
  return initialsFromName(displayName, 'U');
}

function agentInitials(agentName: string): string {
  return initialsFromName(agentName, 'AI');
}

function UserAvatar({
  displayName,
  className,
}: {
  displayName: string;
  className?: string;
}): React.JSX.Element {
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-background/80 text-foreground">
        {userInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  );
}

function AgentAvatar({
  agentName,
  className,
}: {
  agentName: string;
  className?: string;
}): React.JSX.Element {
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-emerald-100 text-emerald-700">
        {agentInitials(agentName)}
      </AvatarFallback>
    </Avatar>
  );
}

// Conversation pane keeps search, grouped rows, empty state, and archived entry together for stable desktop density.
function ConversationPane(props: {
  conversations: ConversationListItem[];
  activeId?: string;
  query: string;
  onQueryChange: (value: string) => void;
  onOpen: (conversationId: string) => void;
  onNew: () => void;
  agents: AgentConfig[];
  defaultAgentId: string;
  showArchived: boolean;
  archivedCount: number;
  onToggleArchived: () => void;
  onQuickCreate: (input: { title?: string; agentId: string; firstPrompt?: string }) => void;
}): React.JSX.Element {
  const today = props.conversations.slice(0, 3);
  const older = props.conversations.slice(3);
  const selectableAgents = props.agents.filter((agent) => agent.availability !== 'disabled');
  const primaryAgent = selectableAgents.find((agent) => agent.id === props.defaultAgentId);
  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Workspace 3
        </h2>
        <NewConversationButton
          onNew={props.onNew}
          agents={selectableAgents}
          primaryAgentId={primaryAgent?.id ?? selectableAgents[0]?.id ?? props.defaultAgentId}
          onQuickCreate={props.onQuickCreate}
        />
      </div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search conversations"
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder="Search conversations"
          className="liquid-glass-control h-9 rounded-lg pl-9"
        />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <ConversationGroup
          title="Today"
          conversations={today}
          activeId={props.activeId}
          onOpen={props.onOpen}
        />
        <ConversationGroup
          title="Older"
          conversations={older}
          activeId={props.activeId}
          onOpen={props.onOpen}
        />
        {props.conversations.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No conversations found.
          </div>
        ) : null}
      </ScrollArea>
      <Button
        variant="ghost"
        className="mt-3 justify-start gap-2 px-2 text-muted-foreground"
        onClick={props.onToggleArchived}
      >
        <Archive data-icon="inline-start" />
        {props.showArchived
          ? 'Show active conversations'
          : `Show archived conversations (${props.archivedCount})`}
      </Button>
    </div>
  );
}

// Split create control exposes direct creation, recent agents, and practical starting templates.
function NewConversationButton(props: {
  agents: AgentConfig[];
  primaryAgentId: string;
  onNew: () => void;
  onQuickCreate: (input: { title?: string; agentId: string; firstPrompt?: string }) => void;
}): React.JSX.Element {
  const primaryAgent = props.agents.find((agent) => agent.id === props.primaryAgentId);
  return (
    <div className="flex overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-sm">
      <Button
        className="rounded-none border-0 bg-transparent text-primary-foreground hover:bg-primary/90"
        size="sm"
        onClick={props.onNew}
      >
        <Plus data-icon="inline-start" />
        New conversation
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="rounded-none border-0 bg-transparent px-2 text-primary-foreground hover:bg-primary/90 aria-expanded:bg-primary/90"
            size="sm"
            aria-label="New conversation options"
          >
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem
            onClick={() =>
              props.onQuickCreate({
                title: 'New conversation',
                agentId: primaryAgent?.id ?? props.primaryAgentId,
              })
            }
          >
            Start with {primaryAgent?.name ?? 'default agent'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {props.agents.slice(0, 4).map((agent) => (
            <DropdownMenuItem
              key={agent.id}
              onClick={() =>
                props.onQuickCreate({ title: `${agent.name} conversation`, agentId: agent.id })
              }
            >
              Recent agent: {agent.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              props.onQuickCreate({
                title: 'Code review',
                agentId: primaryAgent?.id ?? props.primaryAgentId,
              })
            }
          >
            Template: Code review
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              props.onQuickCreate({
                title: 'Research notes',
                agentId: primaryAgent?.id ?? props.primaryAgentId,
              })
            }
          >
            Template: Research notes
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Conversation group renders dense selectable rows with active and status indicators matching the reference.
 */
function ConversationGroup(props: {
  title: string;
  conversations: ConversationListItem[];
  activeId?: string;
  onOpen: (conversationId: string) => void;
}): React.JSX.Element | null {
  if (props.conversations.length === 0) return null;
  return (
    <section className="mb-4">
      <h3 className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">{props.title}</h3>
      <div className="flex flex-col gap-0.5">
        {props.conversations.map((conversation) => (
          <button
            key={conversation.id}
            className={cn(
              'group flex min-h-14 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-accent/60',
              conversation.id === props.activeId &&
                'liquid-glass-control text-accent-foreground ring-1 ring-inset ring-border',
            )}
            onClick={() => props.onOpen(conversation.id)}
          >
            <span
              className={cn(
                'h-8 w-1 rounded-full bg-transparent',
                conversation.id === props.activeId && 'bg-[color:var(--status-active)]',
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{conversation.title}</span>
              <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-[color:var(--status-connected)]" />
                <span className="truncate">{conversation.agentName}</span>
              </span>
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {conversation.starred ? (
                <Star className="size-3.5 fill-[color:var(--status-queued)] text-[color:var(--status-queued)]" />
              ) : null}
              10:42
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

// Workspace surface chooses between chat, profile pages, and workspace utility pages while preserving draft state upstream.
function WorkspaceSurface(props: {
  view: AppView;
  snapshot: WorkspaceSnapshot;
  active?: OpenConversation;
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
  onUserProfile: () => void;
  onBack: () => void;
  onTogglePanel: () => void;
  onProfileSave: (input: UpdateProfileInput) => void;
  onThemePreview: (theme: ThemePreference) => void;
  onIconThemePreview: (theme: IconThemePreference) => void;
  iconPreviewUrl: string;
}): React.JSX.Element {
  const active = props.active;
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
  if (props.view === 'overview') {
    return <WorkspaceOverviewPage snapshot={props.snapshot} onBack={props.onBack} />;
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
          'liquid-float-card grid h-full min-h-0 grid-cols-1 gap-0 overflow-hidden rounded-2xl border py-0 ring-0',
          props.panelOpen && active && 'xl:grid-cols-[minmax(0,1fr)_320px]',
        )}
      >
        <div className="flex min-h-0 flex-col">
          {active ? (
            <>
              <ChatHeader
                active={active}
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
                onCancelQueued={props.onCancelQueued}
              />
              <ChatComposer
                active={active}
                draft={props.draft}
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

/**
 * Chat header owns title actions, connection state, and compact right-side controls for the active conversation.
 */
function ChatHeader(props: {
  active: OpenConversation;
  onRename: () => void;
  onStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onReveal: () => void;
  onDetails: () => void;
  onExport: () => void;
  onTogglePanel: () => void;
}): React.JSX.Element {
  const connection = connectionState(props.active.agent);
  return (
    <header className="flex h-[70px] shrink-0 items-center px-6">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold">{props.active.conversation.title}</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span>{props.active.agent.name}</span>
          <span className={cn('size-2 rounded-full', connection.dotClass)} />
          <span>{connection.label}</span>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <IconButton
          label={props.active.conversation.starred ? 'Unstar conversation' : 'Star conversation'}
          icon={Star}
          pressed={props.active.conversation.starred}
          iconClassName={cn(
            props.active.conversation.starred &&
              'fill-[color:var(--status-queued)] text-[color:var(--status-queued)]',
          )}
          onClick={props.onStar}
        />
        <IconButton label="Export conversation" icon={Share} onClick={props.onExport} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="More actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={props.onRename}>Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={props.onDetails}>
              <Info data-icon="inline-start" />
              Conversation details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={props.onReveal}>
              <FolderOpen data-icon="inline-start" />
              Show file location
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={props.onArchive}>
              <Archive data-icon="inline-start" />
              {props.active.conversation.status === 'archived' ? 'Restore' : 'Archive'}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={props.onDelete}>
              <Trash2 data-icon="inline-start" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <IconButton
          label="Toggle agent panel"
          icon={PanelRight}
          className="xl:hidden"
          onClick={props.onTogglePanel}
        />
      </div>
    </header>
  );
}

function MessageTimeline(props: {
  active: OpenConversation;
  profileDisplayName: string;
  onCancelQueued: (messageId: string) => void;
}): React.JSX.Element {
  const messages = props.active.messages;
  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Start a conversation with {props.active.agent.name}.
      </div>
    );
  }
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-5">
        {messages.map((message) =>
          message.meta.status === 'queued' ? (
            <QueuedPromptCard
              key={message.meta.id}
              message={message}
              onCancel={props.onCancelQueued}
            />
          ) : message.meta.role === 'assistant' ? (
            <AgentMessage key={message.meta.id} active={props.active} message={message} />
          ) : (
            <UserMessage
              key={message.meta.id}
              message={message}
              profileDisplayName={props.profileDisplayName}
            />
          ),
        )}
      </div>
    </ScrollArea>
  );
}

function UserMessage({
  message,
  profileDisplayName,
}: {
  message: MessageRecord;
  profileDisplayName: string;
}): React.JSX.Element {
  return (
    <div className="flex gap-4">
      <UserAvatar displayName={profileDisplayName} className="size-10" />
      <div className="liquid-glass-control rounded-xl border p-4 text-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-medium">You</span>
          <span className="text-xs text-muted-foreground">10:31 AM</span>
        </div>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
          {message.body}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function AgentMessage({
  active,
  message,
}: {
  active: OpenConversation;
  message: MessageRecord;
}): React.JSX.Element {
  return (
    <div className="flex gap-4">
      <AgentAvatar agentName={active.agent.name} className="size-10" />
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-medium">{active.agent.name}</span>
          <Badge variant="secondary">
            {message.meta.status === 'streaming' ? 'Streaming...' : message.meta.status}
          </Badge>
          <span className="text-xs text-muted-foreground">10:31 AM</span>
        </div>
        <div className="liquid-glass-control rounded-xl border p-4 text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {message.body}
          </ReactMarkdown>
          {active.state.plan.length ? <InlinePlan steps={active.state.plan} /> : null}
          <div className="mt-5 flex items-center gap-2 text-sm">
            <span>
              {active.state.tools.filter((tool) => tool.status === 'running').length} tools running
            </span>
            <ChevronsUp className="size-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

function InlinePlan({ steps }: { steps: PlanStep[] }): React.JSX.Element {
  return (
    <div className="mt-4 flex flex-col gap-3">
      {steps.map((step) => (
        <div key={step.id} className="flex items-center gap-3">
          <StatusDot status={step.status} />
          <span className={cn('text-sm', step.status === 'pending' && 'text-muted-foreground')}>
            {step.title}
          </span>
        </div>
      ))}
    </div>
  );
}

function QueuedPromptCard({
  message,
  onCancel,
}: {
  message: MessageRecord;
  onCancel: (messageId: string) => void;
}): React.JSX.Element {
  return (
    <div className="ml-14 rounded-lg border border-amber-300 bg-amber-50/80 p-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="mb-2 flex items-center gap-2">
        <Badge
          variant="secondary"
          className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
        >
          Queued
        </Badge>
        <span className="text-xs text-muted-foreground">10:41 AM</span>
        <Button
          className="ml-auto"
          variant="outline"
          size="sm"
          onClick={() => onCancel(message.meta.id)}
        >
          Cancel
        </Button>
      </div>
      <p>{message.body}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        Agent will process this after current step completes.
      </p>
    </div>
  );
}

// Composer mirrors the reference design: tabs, Markdown indicator, compact tool icons, agent selector, and send.
function ChatComposer(props: {
  active: OpenConversation;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onRevealFiles: () => void;
  onTogglePanel: () => void;
  onAgentProfile: () => void;
}): React.JSX.Element {
  const busy = Boolean(props.active.state.activeTurnId);
  const connection = connectionState(props.active.agent);
  function insertText(value: string): void {
    props.onDraftChange(props.draft ? `${props.draft}\n${value}` : value);
  }
  return (
    <div className="shrink-0 px-6 pb-7">
      <div className="liquid-glass mx-auto w-full max-w-3xl rounded-xl border p-3">
        <Tabs defaultValue="message">
          <TabsList className="mb-2">
            <TabsTrigger value="message">Message</TabsTrigger>
            <TabsTrigger value="agent">@ Agent</TabsTrigger>
          </TabsList>
        </Tabs>
        <Textarea
          aria-label="Message composer"
          value={props.draft}
          placeholder={busy ? 'Agent is running. Send to queue...' : 'Ask anything...'}
          className="min-h-16 resize-none border-0 p-0 shadow-none focus-visible:ring-0"
          onChange={(event) => props.onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') props.onSend();
          }}
        />
        <div className="mt-3 flex items-center gap-2">
          <IconButton
            label="Show conversation files"
            icon={Paperclip}
            onClick={props.onRevealFiles}
          />
          <IconButton
            label="Insert code block"
            icon={Code2}
            onClick={() => insertText('```\\n\\n```')}
          />
          <IconButton label="Toggle agent panel" icon={Grid2X2} onClick={props.onTogglePanel} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2">
                Markdown <ChevronDown data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => insertText('## Heading')}>Heading</DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertText('- Item')}>Bullet list</DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertText('> Quote')}>Quote</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => insertText('| Column | Value |\\n| --- | --- |\\n|  |  |')}
              >
                Table
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-2"
            onClick={props.onAgentProfile}
          >
            <span className={cn('size-2 rounded-full', connection.dotClass)} />
            {props.active.agent.name}
          </Button>
          <Button
            size="icon"
            aria-label={busy ? 'Send to queue' : 'Send message'}
            onClick={props.onSend}
          >
            <Send />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Agent panel groups identity, plan, tools, session details, and log entry so status changes stay visually aligned.
function AgentProgressPanel({
  active,
  onAgentProfile,
  onClose,
  onRawLogs,
}: {
  active: OpenConversation;
  onAgentProfile: () => void;
  onClose: () => void;
  onRawLogs: () => void;
}): React.JSX.Element {
  const connection = connectionState(active.agent);
  return (
    <aside className="min-h-0 max-xl:hidden">
      <ScrollArea className="h-full">
        <div className="space-y-0">
          <PanelSection>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-semibold">Agent</h2>
              <IconButton label="Close agent panel" icon={X} onClick={onClose} />
            </div>
            <div className="flex items-start gap-3">
              <AgentAvatar agentName={active.agent.name} className="size-12" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{active.agent.name}</div>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={cn('size-2 rounded-full', connection.dotClass)} />
                  {connection.label}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onAgentProfile}>
                View agent
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{active.agent.description}</p>
            <Button variant="link" className="mt-2 h-auto p-0" onClick={onAgentProfile}>
              Agent profile <ArrowRight data-icon="inline-end" />
            </Button>
          </PanelSection>
          <PanelSection
            title="Plan"
            action={`${active.state.plan.filter((step) => step.status === 'completed').length} of ${active.state.plan.length} steps`}
          >
            <PlanStepList steps={active.state.plan} />
          </PanelSection>
          <PanelSection
            title="Tools"
            action={`${active.state.tools.filter((tool) => tool.status === 'running').length} active`}
          >
            <ToolActivityList tools={active.state.tools} />
          </PanelSection>
          <PanelSection title="ACP Session" action="Live">
            <AcpSessionDetails active={active} />
          </PanelSection>
          <button
            className="flex w-full items-center justify-between px-6 py-5 text-left text-sm hover:bg-accent"
            onClick={onRawLogs}
          >
            <span className="flex items-center gap-2">
              <FileText className="size-4" />
              View raw logs
            </span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </button>
        </div>
      </ScrollArea>
    </aside>
  );
}

function PanelSection({
  title,
  action,
  children,
}: {
  title?: string;
  action?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="border-b px-6 py-5">
      {title ? (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium">{title}</h3>
          {action ? <span className="text-xs text-muted-foreground">{action}</span> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function PlanStepList({ steps }: { steps: PlanStep[] }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      {steps.map((step) => (
        <div key={step.id} className="flex items-center gap-3 text-sm">
          <StatusDot status={step.status} />
          <span className={cn(step.status === 'pending' && 'text-muted-foreground')}>
            {step.title}
          </span>
        </div>
      ))}
    </div>
  );
}

function ToolActivityList({ tools }: { tools: ToolActivity[] }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      {tools.map((tool) => (
        <div key={tool.id} className="flex items-center gap-3 text-sm">
          <Database className="size-4 text-muted-foreground" />
          <span>{tool.name}</span>
          <span className={cn('ml-auto text-xs', tool.status === 'running' && 'text-green-600')}>
            {tool.status === 'running' ? 'Running' : tool.status}
          </span>
          {tool.elapsedSeconds ? (
            <span className="text-xs text-muted-foreground">{tool.elapsedSeconds}s</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function AcpSessionDetails({ active }: { active: OpenConversation }): React.JSX.Element {
  const isCodexCli = active.agent.kind === 'codex-cli';
  const rows = [
    ['Protocol', active.agent.protocolVersion ?? (isCodexCli ? 'Codex CLI' : 'ACP v1.0')],
    ['Session ID', isCodexCli ? 'Not applicable' : active.state.acpSessionId || 'Not started'],
    ['Connected since', '10:31:02 AM'],
    ['Endpoint', active.agent.command],
  ];
  return (
    <dl className="space-y-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[110px_1fr] gap-3">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="truncate">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ConversationDetailsDialog(props: {
  open: boolean;
  active?: OpenConversation;
  onOpenChange: (open: boolean) => void;
  onReveal: () => void;
}): React.JSX.Element {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conversation details</DialogTitle>
          <DialogDescription>
            Markdown files and local runtime state for this conversation.
          </DialogDescription>
        </DialogHeader>
        {props.active ? (
          <div className="space-y-3">
            <ProfileRow label="ID" value={props.active.conversation.id} />
            <ProfileRow label="Agent" value={props.active.agent.name} />
            <ProfileRow label="Status" value={props.active.conversation.status} />
            <ProfileRow label="Messages" value={String(props.active.conversation.messageCount)} />
            <ProfileRow label="Updated" value={props.active.conversation.updatedAt} />
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={props.onReveal}>
            <FolderOpen data-icon="inline-start" />
            Show files
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RawLogsDialog(props: {
  open: boolean;
  active?: OpenConversation;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const logText = props.active
    ? JSON.stringify(
        {
          conversation: props.active.conversation,
          state: props.active.state,
          agent: props.active.agent,
          messages: props.active.messages.map((message) => message.meta),
        },
        null,
        2,
      )
    : '';
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Raw logs</DialogTitle>
          <DialogDescription>
            Local conversation metadata, runtime state, agent config, and message frontmatter.
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-[520px] overflow-auto rounded-lg border bg-muted/40 p-4 text-xs">
          {logText}
        </pre>
        <DialogFooter>
          <Button onClick={() => props.onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConversationDialog(props: {
  open: boolean;
  active?: OpenConversation;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}): React.JSX.Element {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete conversation</DialogTitle>
          <DialogDescription>
            This removes the conversation folder and its Markdown messages from local storage.
          </DialogDescription>
        </DialogHeader>
        {props.active ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="font-medium">{props.active.conversation.title}</div>
            <div className="mt-1 text-muted-foreground">{props.active.conversation.id}</div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={props.onDelete}>
            Delete conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function connectionState(agent: AgentConfig): { label: string; dotClass: string } {
  if (!agent.enabled || agent.availability === 'disabled') {
    return { label: 'Disabled', dotClass: 'bg-muted-foreground/50' };
  }
  if (agent.availability === 'available') {
    return {
      label: agent.kind === 'codex-cli' ? 'Codex CLI Ready' : 'ACP Connected',
      dotClass: 'bg-[color:var(--status-connected)]',
    };
  }
  return { label: 'Not connected', dotClass: 'bg-destructive' };
}

function WorkspaceOverviewPage({
  snapshot,
  onBack,
}: {
  snapshot: WorkspaceSnapshot;
  onBack: () => void;
}): React.JSX.Element {
  const activeCount = snapshot.conversations.filter(
    (conversation) => conversation.status === 'active',
  ).length;
  const archivedCount = snapshot.conversations.filter(
    (conversation) => conversation.status === 'archived',
  ).length;
  const messageCount = snapshot.conversations.reduce(
    (total, conversation) => total + conversation.messageCount,
    0,
  );
  return (
    <ProfileShell title="Workspace Overview" onBack={onBack}>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Active conversations" value={String(activeCount)} />
        <MetricCard label="Archived conversations" value={String(archivedCount)} />
        <MetricCard label="Messages" value={String(messageCount)} />
        <div className="rounded-lg border bg-muted/30 p-4 text-sm sm:col-span-3">
          <div className="font-medium">Workspace path</div>
          <div className="mt-2 break-all text-muted-foreground">{snapshot.workspacePath}</div>
          <Button className="mt-4" variant="outline" onClick={() => void f5Api.revealWorkspace()}>
            <FolderOpen data-icon="inline-start" />
            Show workspace folder
          </Button>
        </div>
      </CardContent>
    </ProfileShell>
  );
}

// Agents page lists every configured local agent with command, availability, and profile access.
function AgentsPage({
  agents,
  onBack,
  onOpenAgent,
}: {
  agents: AgentConfig[];
  onBack: () => void;
  onOpenAgent: () => void;
}): React.JSX.Element {
  return (
    <ProfileShell title="Agents" onBack={onBack}>
      <CardContent className="space-y-3">
        {agents.map((agent) => {
          const connection = connectionState(agent);
          return (
            <div key={agent.id} className="rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex items-start gap-3">
                <AgentAvatar agentName={agent.name} className="size-10" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{agent.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                    <span className={cn('size-2 rounded-full', connection.dotClass)} />
                    {connection.label}
                  </div>
                  <div className="mt-2 truncate text-muted-foreground">
                    {[agent.command, ...agent.args].join(' ')}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={onOpenAgent}>
                  View
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </ProfileShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

// User profile page keeps editable local settings aligned with the JSON profile stored in the workspace.
function UserProfilePage({
  snapshot,
  onBack,
  onSave,
  onThemePreview,
  onIconThemePreview,
  iconPreviewUrl,
}: {
  snapshot: WorkspaceSnapshot;
  onBack: () => void;
  onSave: (input: UpdateProfileInput) => void;
  onThemePreview: (theme: ThemePreference) => void;
  onIconThemePreview: (theme: IconThemePreference) => void;
  iconPreviewUrl: string;
}): React.JSX.Element {
  const [displayName, setDisplayName] = useState(snapshot.profile.displayName);
  const [defaultAgentId, setDefaultAgentId] = useState(snapshot.profile.defaultAgentId);
  const [theme, setTheme] = useState(snapshot.profile.theme);
  const [iconTheme, setIconTheme] = useState(snapshot.profile.iconTheme);

  function saveProfile(nextTheme = theme, nextIconTheme = iconTheme): void {
    onSave({
      displayName: displayName.trim() || snapshot.profile.displayName,
      defaultAgentId,
      theme: nextTheme,
      iconTheme: nextIconTheme,
    });
  }

  return (
    <ProfileShell title="User Profile" onBack={onBack}>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[160px_1fr] gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
          <span className="self-center text-muted-foreground">Display name</span>
          <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </div>
        <ProfileRow label="Workspace path" value={snapshot.workspacePath} />
        <div className="grid grid-cols-[160px_1fr] gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
          <span className="self-center text-muted-foreground">Default agent</span>
          <Select value={defaultAgentId} onValueChange={setDefaultAgentId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose default agent" />
            </SelectTrigger>
            <SelectContent>
              {snapshot.agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-[160px_1fr] gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
          <span className="self-center text-muted-foreground">Theme</span>
          <Select
            value={theme}
            onValueChange={(value: ThemePreference) => {
              setTheme(value);
              onThemePreview(value);
              saveProfile(value, iconTheme);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-[160px_1fr] gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
          <span className="self-center text-muted-foreground">App icon</span>
          <div className="flex items-center gap-3">
            <img
              src={iconPreviewUrl}
              alt=""
              aria-hidden="true"
              className="size-9 shrink-0 rounded-lg border bg-background object-cover shadow-sm"
            />
            <Select
              value={iconTheme}
              onValueChange={(value: IconThemePreference) => {
                setIconTheme(value);
                onIconThemePreview(value);
                saveProfile(theme, value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose icon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => saveProfile()}>Save changes</Button>
          <Button variant="outline" onClick={() => void f5Api.revealWorkspace()}>
            Show workspace folder
          </Button>
        </div>
      </CardContent>
    </ProfileShell>
  );
}

// Agent profile page shows adapter details and runs the lightweight connection check exposed by the main process.
function AgentProfilePage({
  agent,
  onBack,
}: {
  agent?: AgentConfig;
  onBack: () => void;
}): React.JSX.Element {
  const [result, setResult] = useState<AgentConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  async function runTest(): Promise<void> {
    if (!agent) return;
    setTesting(true);
    try {
      setResult(await f5Api.testAgentConnection(agent.id));
    } finally {
      setTesting(false);
    }
  }

  return (
    <ProfileShell title="Agent Profile" onBack={onBack}>
      <CardContent className="space-y-4">
        <ProfileRow label="Name" value={agent?.name ?? 'No agent'} />
        <ProfileRow label="Command" value={agent?.command ?? ''} />
        <ProfileRow label="Args" value={agent?.args.join(' ') ?? ''} />
        <ProfileRow label="Working directory" value={agent?.cwd ?? ''} />
        <ProfileRow label="Availability" value={agent?.availability ?? 'unavailable'} />
        <ProfileRow label="Protocol" value={agent?.protocolVersion ?? 'Not initialized'} />
        {agent?.id === 'codex-acp-real' ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            Codex ACP discovery appears here after `pnpm smoke:codex-acp` writes verification
            evidence.
          </div>
        ) : null}
        {result ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="font-medium">
              {result.ok ? 'Connection test passed' : 'Connection test did not run'}
            </div>
            <div className="mt-1 text-muted-foreground">{result.detail}</div>
          </div>
        ) : null}
        <Button variant="outline" disabled={!agent || testing} onClick={() => void runTest()}>
          {testing ? 'Testing...' : 'Test connection'}
        </Button>
      </CardContent>
    </ProfileShell>
  );
}

function ProfileShell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="flex h-full min-h-0 justify-center overflow-hidden">
      <Card className="liquid-float-card h-full w-full max-w-[1440px] overflow-hidden border">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Local workspace settings and connection details.</CardDescription>
          <CardAction>
            <Button variant="outline" onClick={onBack}>
              Back to conversation
            </Button>
          </CardAction>
        </CardHeader>
        {children}
      </Card>
    </section>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

// New conversation flow owns its draft fields and creates files only after the user confirms the dialog.
function NewConversationFlow(props: {
  open: boolean;
  agents: AgentConfig[];
  defaultAgentId: string;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: { title?: string; agentId: string; firstPrompt?: string }) => void;
}): React.JSX.Element {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [agentId, setAgentId] = useState(props.defaultAgentId);
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>
            Choose an agent and optionally start with a first prompt.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Optional title"
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
          <Button onClick={() => props.onCreate({ title, agentId, firstPrompt: prompt })}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
      <p>Create a conversation to start chatting with an agent.</p>
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

function StatusDot({ status }: { status: PlanStep['status'] }): React.JSX.Element {
  if (status === 'completed') {
    return (
      <span className="grid size-4 place-items-center rounded-full bg-[color:var(--status-connected)] text-white">
        <Check className="size-3" />
      </span>
    );
  }
  if (status === 'active')
    return <span className="size-4 rounded-full border-2 border-[color:var(--status-active)]" />;
  if (status === 'failed') return <span className="size-4 rounded-full bg-destructive" />;
  return <span className="size-4 rounded-full border border-muted-foreground/40" />;
}

function IconButton({
  label,
  icon: Icon,
  className,
  iconClassName,
  pressed,
  variant = 'ghost',
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  iconClassName?: string;
  pressed?: boolean;
  variant?: 'ghost' | 'outline';
  onClick?: () => void;
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          className={cn('shrink-0', className)}
          onClick={onClick}
        >
          <Icon className={iconClassName} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
