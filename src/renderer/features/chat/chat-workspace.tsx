import {
  Archive,
  ArrowRight,
  BadgeInfo,
  ChevronDown,
  ChevronsUp,
  Code2,
  Database,
  FileText,
  FolderOpen,
  Grid2X2,
  MoreHorizontal,
  PanelRight,
  Paperclip,
  Plus,
  Search,
  Send,
  Share,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import React from 'react';
import { AgentAvatar, IconButton, StatusDot, UserAvatar } from '@/app/workbench-primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { connectionState } from '@/features/chat/connection-state';
import { EntityMarkdown } from '@/features/entity-markdown';
import { EntityMentionButton, useEntityMentionInput } from '@/features/entity-mentions';
import { cn } from '@/lib/utils';
import type {
  AgentConfig,
  ConversationListItem,
  CreateTaskConversationInput,
  MessageRecord,
  OpenConversation,
  PlanStep,
  ToolActivity,
  WorkspaceEntity,
  WorkspaceEntityRef,
} from '../../../shared/types';

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
  onQuickCreate: (input: CreateTaskConversationInput) => void;
}): React.JSX.Element {
  const today = props.conversations.slice(0, 3);
  const older = props.conversations.slice(3);
  const selectableAgents = props.agents.filter((agent) => agent.availability !== 'disabled');
  const primaryAgent = selectableAgents.find((agent) => agent.id === props.defaultAgentId);
  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Chats
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
  onQuickCreate: (input: CreateTaskConversationInput) => void;
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
        New task
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="rounded-none border-0 bg-transparent px-2 text-primary-foreground hover:bg-primary/90 aria-expanded:bg-primary/90"
            size="sm"
            aria-label="New task options"
          >
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem
            onClick={() =>
              props.onQuickCreate({
                title: 'New task',
                agentId: primaryAgent?.id ?? props.primaryAgentId,
              })
            }
          >
            Task with {primaryAgent?.name ?? 'default agent'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {props.agents.slice(0, 4).map((agent) => (
            <DropdownMenuItem
              key={agent.id}
              onClick={() =>
                props.onQuickCreate({ title: `${agent.name} task`, agentId: agent.id })
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

/**
 * Chat header owns title actions, connection state, and compact right-side controls for the active conversation.
 */
function ChatHeader(props: {
  active: OpenConversation;
  taskTitle?: string;
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
          {props.taskTitle ? (
            <>
              <span className="size-1 rounded-full bg-muted-foreground/60" />
              <span className="truncate">Task: {props.taskTitle}</span>
            </>
          ) : null}
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
              <BadgeInfo data-icon="inline-start" />
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

// MessageTimeline renders all message states with the same entity mention display behavior.
function MessageTimeline(props: {
  active: OpenConversation;
  profileDisplayName: string;
  mentionEntities: WorkspaceEntity[];
  onOpenEntity: (entity: WorkspaceEntityRef) => void;
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
              mentionEntities={props.mentionEntities}
              onOpenEntity={props.onOpenEntity}
              onCancel={props.onCancelQueued}
            />
          ) : message.meta.role === 'assistant' ? (
            <AgentMessage
              key={message.meta.id}
              active={props.active}
              message={message}
              mentionEntities={props.mentionEntities}
              onOpenEntity={props.onOpenEntity}
            />
          ) : (
            <UserMessage
              key={message.meta.id}
              message={message}
              profileDisplayName={props.profileDisplayName}
              mentionEntities={props.mentionEntities}
              onOpenEntity={props.onOpenEntity}
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
  mentionEntities,
  onOpenEntity,
}: {
  message: MessageRecord;
  profileDisplayName: string;
  mentionEntities: WorkspaceEntity[];
  onOpenEntity: (entity: WorkspaceEntityRef) => void;
}): React.JSX.Element {
  return (
    <div className="flex gap-4">
      <UserAvatar displayName={profileDisplayName} className="size-10" />
      <div className="liquid-glass-control rounded-lg border p-4 text-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-medium">You</span>
          <span className="text-xs text-muted-foreground">10:31 AM</span>
        </div>
        <EntityMarkdown
          body={message.body}
          mentionEntities={mentionEntities}
          onOpenEntity={onOpenEntity}
        />
      </div>
    </div>
  );
}

function AgentMessage({
  active,
  message,
  mentionEntities,
  onOpenEntity,
}: {
  active: OpenConversation;
  message: MessageRecord;
  mentionEntities: WorkspaceEntity[];
  onOpenEntity: (entity: WorkspaceEntityRef) => void;
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
        <div className="liquid-glass-control rounded-lg border p-4 text-sm">
          <EntityMarkdown
            body={message.body}
            mentionEntities={mentionEntities}
            onOpenEntity={onOpenEntity}
          />
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

// QueuedPromptCard mirrors regular user messages while keeping cancellation visible.
function QueuedPromptCard({
  message,
  mentionEntities,
  onOpenEntity,
  onCancel,
}: {
  message: MessageRecord;
  mentionEntities: WorkspaceEntity[];
  onOpenEntity: (entity: WorkspaceEntityRef) => void;
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
      <EntityMarkdown
        body={message.body}
        mentionEntities={mentionEntities}
        onOpenEntity={onOpenEntity}
      />
      <p className="mt-3 text-xs text-muted-foreground">
        Agent will process this after current step completes.
      </p>
    </div>
  );
}

// ChatComposer owns inline mention picking because cursor range and draft updates need to stay together.
function ChatComposer(props: {
  active: OpenConversation;
  draft: string;
  mentionEntities: WorkspaceEntity[];
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onRevealFiles: () => void;
  onTogglePanel: () => void;
  onAgentProfile: () => void;
}): React.JSX.Element {
  const busy = Boolean(props.active.state.activeTurnId);
  const connection = connectionState(props.active.agent);
  const {
    textareaRef: mentionTextareaRef,
    mentionOpen,
    mentionOptions,
    openMentionPicker,
    insertMention,
    handleChange: handleMentionChange,
    handleKeyDown: handleMentionKeyDown,
  } = useEntityMentionInput({
    value: props.draft,
    entities: props.mentionEntities,
    onValueChange: props.onDraftChange,
  });

  function insertText(value: string): void {
    props.onDraftChange(props.draft ? `${props.draft}\n${value}` : value);
  }

  return (
    <div className="shrink-0 px-6 pb-7">
      <div className="liquid-glass mx-auto w-full max-w-3xl rounded-lg border p-3">
        <Tabs defaultValue="message">
          <TabsList className="mb-2">
            <TabsTrigger value="message">Message</TabsTrigger>
            <TabsTrigger value="entity">@ Entity</TabsTrigger>
          </TabsList>
        </Tabs>
        <Textarea
          ref={mentionTextareaRef}
          aria-label="Message composer"
          value={props.draft}
          placeholder={busy ? 'Agent is running. Send to queue...' : 'Ask anything...'}
          className="min-h-16 resize-none border-0 p-0 shadow-none focus-visible:ring-0"
          onChange={handleMentionChange}
          onKeyDown={(event) => {
            if (handleMentionKeyDown(event)) return;
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
          <EntityMentionButton
            open={mentionOpen}
            options={mentionOptions}
            onOpen={openMentionPicker}
            onInsert={insertMention}
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

// Conversation details dialog shows file metadata without exposing raw message bodies.
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
            <ChatDetailRow label="ID" value={props.active.conversation.id} />
            <ChatDetailRow label="Agent" value={props.active.agent.name} />
            <ChatDetailRow label="Status" value={props.active.conversation.status} />
            <ChatDetailRow
              label="Messages"
              value={String(props.active.conversation.messageCount)}
            />
            <ChatDetailRow label="Updated" value={props.active.conversation.updatedAt} />
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

// Raw logs dialog renders local metadata for debugging active conversation state.
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

// Delete dialog keeps destructive conversation removal behind an explicit confirmation.
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

function ChatDetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

export {
  AgentProgressPanel,
  ChatComposer,
  ChatHeader,
  ConversationDetailsDialog,
  ConversationPane,
  DeleteConversationDialog,
  MessageTimeline,
  RawLogsDialog,
};
