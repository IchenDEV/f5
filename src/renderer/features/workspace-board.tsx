import {
  Bot,
  Check,
  Database,
  Grid2X2,
  MessageCircle,
  Plus,
  Search,
  UserRound,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { HUMAN_ASSIGNEE_ID } from '../../shared/types';
import type {
  AgentConfig,
  ConversationListItem,
  OpenConversation,
  PlanStep,
  TaskListItem,
  WorkspaceSnapshot,
} from '../../shared/types';

type BoardColumnKey = 'inProgress' | 'waiting' | 'notStarted';
type ActorKind = 'agent' | 'human';
type ActorStatus = 'running' | 'waiting' | 'assigned' | 'idle' | 'disabled';

interface BoardCard {
  id: string;
  taskId: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  assigneeKind: ActorKind;
  sourceLabel: string;
  statusLabel: string;
  updatedAt: string;
  details: string[];
}

interface ActorSummary {
  id: string;
  name: string;
  kind: ActorKind;
  status: ActorStatus;
  statusLabel: string;
  taskCount: number;
  currentWork: string;
}

const columnCopy: Record<BoardColumnKey, { title: string; description: string }> = {
  inProgress: {
    title: 'In progress',
    description: 'Live AI work and active tools',
  },
  waiting: {
    title: 'Waiting for input',
    description: 'Human replies and queued prompts',
  },
  notStarted: {
    title: 'Not started',
    description: 'Assigned open tasks',
  },
};

/**
 * WorkspaceBoardPage turns the existing workspace snapshot into an operational board for people and agents.
 */
function WorkspaceBoardPage({
  snapshot,
  query,
  onQueryChange,
  onOpenTask,
  onOpenTasks,
}: {
  snapshot: WorkspaceSnapshot;
  query: string;
  onQueryChange?: (value: string) => void;
  onOpenTask: (taskId: string) => void;
  onOpenTasks: () => void;
}): React.JSX.Element {
  const model = useMemo(() => buildBoardModel(snapshot, query), [query, snapshot]);
  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(0,300px)_minmax(0,1fr)] gap-5 overflow-hidden max-lg:grid-cols-1">
      <aside className="min-h-0 bg-transparent">
        <div className="flex h-full min-h-0 flex-col px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Board
            </h2>
            <Button size="sm" onClick={onOpenTasks}>
              <Plus data-icon="inline-start" />
              New task
            </Button>
          </div>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search board"
              value={query}
              onChange={(event) => onQueryChange?.(event.target.value)}
              placeholder="Search board"
              className="liquid-glass-control h-9 rounded-lg pl-9"
            />
          </div>
          <BoardMetrics
            openCount={model.openCount}
            runningCount={model.columns.inProgress.length}
            waitingCount={model.columns.waiting.length}
            doneCount={model.doneCount}
          />
          <ScrollArea className="mt-4 min-h-0 flex-1">
            <div className="flex flex-col gap-2 pr-2">
              {model.actors.map((actor) => (
                <ActorSummaryRow key={actor.id} actor={actor} />
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>
      <section className="liquid-float-card flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border py-0 ring-0">
        <header className="flex h-[70px] shrink-0 items-center border-b px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">Board</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{model.openCount} open tasks</span>
              <span className="size-1 rounded-full bg-muted-foreground/60" />
              <span>{model.actors.length} people and agents</span>
            </div>
          </div>
          <Button variant="outline" className="ml-auto" onClick={onOpenTasks}>
            <Check data-icon="inline-start" />
            Open TODO
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden p-5">
          <div className="grid h-full min-h-0 grid-cols-3 gap-4 max-xl:grid-cols-1">
            {(['inProgress', 'waiting', 'notStarted'] as BoardColumnKey[]).map((column) => (
              <BoardColumn
                key={column}
                columnKey={column}
                cards={model.columns[column]}
                onOpenTask={onOpenTask}
              />
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

function BoardMetrics({
  openCount,
  runningCount,
  waitingCount,
  doneCount,
}: {
  openCount: number;
  runningCount: number;
  waitingCount: number;
  doneCount: number;
}): React.JSX.Element {
  const metrics = [
    { label: 'Open', value: openCount },
    { label: 'Running', value: runningCount },
    { label: 'Waiting', value: waitingCount },
    { label: 'Done', value: doneCount },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {metrics.map((metric) => (
        <div key={metric.label} className="liquid-glass-control rounded-lg border p-3">
          <div className="text-lg font-semibold">{metric.value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{metric.label}</div>
        </div>
      ))}
    </div>
  );
}

function ActorSummaryRow({ actor }: { actor: ActorSummary }): React.JSX.Element {
  return (
    <div className="liquid-glass-control rounded-lg border p-3 text-sm">
      <div className="flex items-start gap-3">
        <AssigneeMark name={actor.name} kind={actor.kind} className="size-9" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{actor.name}</span>
            <StatusPill status={actor.status} label={actor.statusLabel} />
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{actor.currentWork}</div>
          <div className="mt-2 text-xs text-muted-foreground">{actor.taskCount} assigned open</div>
        </div>
      </div>
    </div>
  );
}

function BoardColumn({
  columnKey,
  cards,
  onOpenTask,
}: {
  columnKey: BoardColumnKey;
  cards: BoardCard[];
  onOpenTask: (taskId: string) => void;
}): React.JSX.Element {
  const copy = columnCopy[columnKey];
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background/30">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <ColumnIcon columnKey={columnKey} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{copy.title}</h2>
            <Badge variant="secondary" className="h-5 min-w-5 justify-center rounded-full px-1.5">
              {cards.length}
            </Badge>
          </div>
          <div className="truncate text-xs text-muted-foreground">{copy.description}</div>
        </div>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-3">
          {cards.map((card) => (
            <BoardTaskCard key={card.id} card={card} onOpenTask={onOpenTask} />
          ))}
          {cards.length === 0 ? (
            <div className="grid min-h-40 place-items-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground">
              Nothing here.
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </section>
  );
}

/**
 * BoardTaskCard is a full-card button so board navigation stays fast on desktop and keyboard.
 */
function BoardTaskCard({
  card,
  onOpenTask,
}: {
  card: BoardCard;
  onOpenTask: (taskId: string) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={`Open ${card.title}`}
      className="liquid-glass-control w-full rounded-xl border p-4 text-left text-sm transition hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      onClick={() => onOpenTask(card.taskId)}
    >
      <div className="mb-3 flex items-start gap-3">
        <AssigneeMark name={card.assigneeName} kind={card.assigneeKind} className="size-9" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{card.assigneeName}</span>
            <Badge variant="outline">{card.statusLabel}</Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{card.sourceLabel}</div>
        </div>
      </div>
      <h3 className="line-clamp-2 font-medium leading-5">{card.title}</h3>
      {card.description ? (
        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-muted-foreground">
          {card.description}
        </p>
      ) : null}
      {card.details.length ? (
        <div className="mt-3 flex flex-col gap-2">
          {card.details.map((detail) => (
            <div key={detail} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-[color:var(--status-active)]" />
              <span className="min-w-0 flex-1 truncate">{detail}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-3 text-xs text-muted-foreground">
        Updated {formatShortDate(card.updatedAt)}
      </div>
    </button>
  );
}

function ColumnIcon({ columnKey }: { columnKey: BoardColumnKey }): React.JSX.Element {
  if (columnKey === 'inProgress')
    return <Database className="size-4 text-[color:var(--status-active)]" />;
  if (columnKey === 'waiting')
    return <MessageCircle className="size-4 text-[color:var(--status-queued)]" />;
  return <Grid2X2 className="size-4 text-muted-foreground" />;
}

function StatusPill({ status, label }: { status: ActorStatus; label: string }): React.JSX.Element {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] text-muted-foreground">
      <span className={cn('size-1.5 rounded-full', statusDotClass(status))} />
      {label}
    </span>
  );
}

function AssigneeMark({
  name,
  kind,
  className,
}: {
  name: string;
  kind: ActorKind;
  className?: string;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full text-xs font-semibold',
        kind === 'human'
          ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200'
          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
        className,
      )}
    >
      {kind === 'human' ? <UserRound className="size-4" /> : <Bot className="size-4" />}
      <span className="sr-only">{name}</span>
    </span>
  );
}

/**
 * buildBoardModel derives board columns from real task assignments and the active conversation state.
 */
function buildBoardModel(
  snapshot: WorkspaceSnapshot,
  query: string,
): {
  actors: ActorSummary[];
  columns: Record<BoardColumnKey, BoardCard[]>;
  openCount: number;
  doneCount: number;
} {
  const normalizedQuery = query.trim().toLowerCase();
  const agentsById = new Map(snapshot.agents.map((agent) => [agent.id, agent]));
  const listsById = new Map(snapshot.taskLists.map((list) => [list.id, list]));
  const openTasks = snapshot.tasks.filter((task) => task.status === 'todo');
  const doneCount = snapshot.tasks.filter((task) => task.status === 'done').length;
  const active = snapshot.activeConversation;
  const agentHasActiveWork = hasActiveAgentWork(active);
  const conversationsByTaskId = linkedConversationsByTaskId(snapshot);
  const columns: Record<BoardColumnKey, BoardCard[]> = {
    inProgress: [],
    waiting: [],
    notStarted: [],
  };

  for (const task of openTasks) {
    const linkedConversation = conversationsByTaskId.get(task.id);
    const taskIsActive = active?.conversation.taskId === task.id;
    const card = taskToCard(
      task,
      agentsById,
      listsById,
      snapshot.profile.displayName,
      taskIsActive ? active : undefined,
      linkedConversation,
    );
    if (taskIsActive && agentHasActiveWork) {
      columns.inProgress.push(card);
    } else if (task.agentId === HUMAN_ASSIGNEE_ID || linkedConversation) {
      columns.waiting.push(card);
    } else {
      columns.notStarted.push(card);
    }
  }

  const filteredColumns = mapColumns(columns, (cards) =>
    cards.filter((card) => matchesBoardQuery(card, normalizedQuery)),
  );
  return {
    actors: buildActors(snapshot, openTasks, agentHasActiveWork),
    columns: filteredColumns,
    openCount: openTasks.length,
    doneCount,
  };
}

function buildActors(
  snapshot: WorkspaceSnapshot,
  openTasks: TaskListItem[],
  agentHasActiveWork: boolean,
): ActorSummary[] {
  const active = snapshot.activeConversation;
  const humanTaskCount = openTasks.filter((task) => task.agentId === HUMAN_ASSIGNEE_ID).length;
  const humanWaiting = Boolean(
    active &&
    active.conversation.taskId &&
    !agentHasActiveWork &&
    active.conversation.status === 'active',
  );
  const human: ActorSummary = {
    id: HUMAN_ASSIGNEE_ID,
    name: snapshot.profile.displayName,
    kind: 'human',
    status: humanWaiting ? 'waiting' : humanTaskCount > 0 ? 'assigned' : 'idle',
    statusLabel: humanWaiting ? 'Input needed' : humanTaskCount > 0 ? 'Assigned' : 'Idle',
    taskCount: humanTaskCount,
    currentWork: humanWaiting
      ? `Reply in ${active?.conversation.title ?? 'conversation'}`
      : 'No live input needed',
  };
  return [
    human,
    ...snapshot.agents.map((agent) => agentSummary(agent, openTasks, active, agentHasActiveWork)),
  ];
}

function agentSummary(
  agent: AgentConfig,
  openTasks: TaskListItem[],
  active: OpenConversation | undefined,
  agentHasActiveWork: boolean,
): ActorSummary {
  const taskCount = openTasks.filter((task) => task.agentId === agent.id).length;
  const isActiveAgent = active?.agent.id === agent.id;
  const status = agentStatus(agent, isActiveAgent, agentHasActiveWork, taskCount);
  return {
    id: agent.id,
    name: agent.name,
    kind: 'agent',
    status,
    statusLabel: actorStatusLabel(status),
    taskCount,
    currentWork: currentAgentWork(agent, active, isActiveAgent, agentHasActiveWork, taskCount),
  };
}

function agentStatus(
  agent: AgentConfig,
  isActiveAgent: boolean,
  agentHasActiveWork: boolean,
  taskCount: number,
): ActorStatus {
  if (!agent.enabled || agent.availability === 'disabled') return 'disabled';
  if (isActiveAgent && agentHasActiveWork) return 'running';
  if (taskCount > 0) return 'assigned';
  return 'idle';
}

function currentAgentWork(
  agent: AgentConfig,
  active: OpenConversation | undefined,
  isActiveAgent: boolean,
  agentHasActiveWork: boolean,
  taskCount: number,
): string {
  if (isActiveAgent && agentHasActiveWork && active)
    return `Working on ${active.conversation.title}`;
  if (!agent.enabled || agent.availability === 'disabled') return 'Disabled in this workspace';
  if (taskCount > 0) return `${taskCount} tasks assigned`;
  return 'No assigned work';
}

function taskToCard(
  task: TaskListItem,
  agentsById: Map<string, AgentConfig>,
  listsById: Map<string, { title: string }>,
  displayName: string,
  active: OpenConversation | undefined,
  linkedConversation: ConversationListItem | undefined,
): BoardCard {
  const agent = agentsById.get(task.agentId);
  const isHuman = task.agentId === HUMAN_ASSIGNEE_ID;
  const running = Boolean(active && hasActiveAgentWork(active));
  const details = [
    activePlanTitle(active?.state.plan ?? []),
    ...(active?.state.tools ?? [])
      .filter((tool) => tool.status === 'running')
      .map((tool) => `Tool running: ${tool.name}`),
    linkedConversation ? `Chat: ${linkedConversation.title}` : '',
    task.repairStatus === 'needs_repair' ? 'Needs repair' : '',
  ].filter((detail): detail is string => Boolean(detail));
  return {
    id: task.id,
    taskId: task.id,
    title: task.title,
    description: task.body,
    assigneeId: task.agentId,
    assigneeName: isHuman ? displayName : (agent?.name ?? task.agentId),
    assigneeKind: isHuman ? 'human' : 'agent',
    sourceLabel: listsById.get(task.listId)?.title ?? 'Task list',
    statusLabel: running
      ? 'Running'
      : isHuman
        ? 'Assigned to human'
        : linkedConversation
          ? 'Input needed'
          : 'Assigned to AI',
    updatedAt: linkedConversation?.updatedAt ?? task.updatedAt,
    details,
  };
}

function linkedConversationsByTaskId(
  snapshot: WorkspaceSnapshot,
): Map<string, ConversationListItem> {
  const byTaskId = new Map<string, ConversationListItem>();
  for (const conversation of snapshot.conversations) {
    if (conversation.taskId && !byTaskId.has(conversation.taskId)) {
      byTaskId.set(conversation.taskId, conversation);
    }
  }
  const active = snapshot.activeConversation?.conversation;
  if (active?.taskId) {
    byTaskId.set(active.taskId, {
      ...active,
      agentName:
        snapshot.agents.find((agent) => agent.id === active.agentId)?.name ?? active.agentId,
      agentStatus:
        snapshot.agents.find((agent) => agent.id === active.agentId)?.availability ?? 'available',
      preview: snapshot.activeConversation?.messages.at(-1)?.body ?? '',
    });
  }
  return byTaskId;
}

function hasActiveAgentWork(active: OpenConversation | undefined): boolean {
  if (!active) return false;
  return Boolean(
    active.state.activeTurnId ||
    active.state.tools.some((tool) => tool.status === 'running') ||
    active.messages.some((message) => ['active', 'streaming'].includes(message.meta.status)),
  );
}

function activePlanTitle(steps: PlanStep[]): string {
  const active = steps.find((step) => step.status === 'active');
  if (active) return `Plan: ${active.title}`;
  const pending = steps.find((step) => step.status === 'pending');
  return pending ? `Next: ${pending.title}` : '';
}

function matchesBoardQuery(card: BoardCard, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return `${card.title} ${card.description} ${card.assigneeName} ${card.sourceLabel} ${card.details.join(' ')}`
    .toLowerCase()
    .includes(normalizedQuery);
}

function mapColumns(
  columns: Record<BoardColumnKey, BoardCard[]>,
  mapper: (cards: BoardCard[]) => BoardCard[],
): Record<BoardColumnKey, BoardCard[]> {
  return {
    inProgress: mapper(columns.inProgress),
    waiting: mapper(columns.waiting),
    notStarted: mapper(columns.notStarted),
  };
}

function actorStatusLabel(status: ActorStatus): string {
  if (status === 'running') return 'Running';
  if (status === 'waiting') return 'Waiting';
  if (status === 'assigned') return 'Assigned';
  if (status === 'disabled') return 'Disabled';
  return 'Idle';
}

function statusDotClass(status: ActorStatus): string {
  if (status === 'running') return 'bg-[color:var(--status-active)]';
  if (status === 'waiting') return 'bg-[color:var(--status-queued)]';
  if (status === 'assigned') return 'bg-[color:var(--status-connected)]';
  if (status === 'disabled') return 'bg-muted-foreground/40';
  return 'bg-muted-foreground/60';
}

function formatShortDate(value: string): string {
  return value ? value.slice(0, 10) : 'unknown';
}

export { WorkspaceBoardPage };
