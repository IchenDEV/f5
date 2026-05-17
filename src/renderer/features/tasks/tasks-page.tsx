import { Pencil, Plus, Save, Search, Trash2, UserRound } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EntityMarkdown } from '@/features/entity-markdown';
import { EntityMentionButton, useEntityMentionInput } from '@/features/entity-mentions';
import { DeleteResourceDialog, ResourceShell } from '@/features/resources/resource-shell';
import { cn } from '@/lib/utils';
import { HUMAN_ASSIGNEE_ID } from '../../../shared/types';
import type {
  AgentConfig,
  CreateTaskListInput,
  CreateTaskInput,
  DeleteTaskListInput,
  DeleteTaskInput,
  TaskListItem,
  TaskListSummary,
  TaskStatus,
  UpdateTaskListInput,
  UpdateTaskInput,
  WorkspaceEntity,
  WorkspaceEntityRef,
} from '../../../shared/types';

type TaskFilter = 'all' | TaskStatus;

/**
 * TasksPage owns the local create and edit drafts while persistence stays behind the typed app API.
 */
function TasksPage({
  taskLists,
  tasks,
  agents = [],
  defaultAgentId = '',
  profileDisplayName = 'You',
  mentionEntities = [],
  query,
  onQueryChange,
  onBack,
  onCreateTaskList,
  onUpdateTaskList,
  onDeleteTaskList,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onOpenEntity,
}: {
  taskLists: TaskListSummary[];
  tasks: TaskListItem[];
  agents?: AgentConfig[];
  defaultAgentId?: string;
  profileDisplayName?: string;
  mentionEntities?: WorkspaceEntity[];
  query: string;
  onQueryChange?: (value: string) => void;
  onBack: () => void;
  onCreateTaskList: (input: CreateTaskListInput) => Promise<void>;
  onUpdateTaskList: (input: UpdateTaskListInput) => Promise<void>;
  onDeleteTaskList: (input: DeleteTaskListInput) => Promise<void>;
  onCreateTask: (input: CreateTaskInput) => Promise<void>;
  onUpdateTask: (input: UpdateTaskInput) => Promise<void>;
  onDeleteTask: (input: DeleteTaskInput) => Promise<void>;
  onOpenEntity?: (entity: WorkspaceEntityRef) => void;
}): React.JSX.Element {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [agentId, setAgentId] = useState(defaultAgentId || agents[0]?.id || HUMAN_ASSIGNEE_ID);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [activeListId, setActiveListId] = useState(taskLists[0]?.id ?? '');
  const [deleteTarget, setDeleteTarget] = useState<TaskListItem | null>(null);
  const [deleteListTarget, setDeleteListTarget] = useState<TaskListSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const {
    textareaRef: taskBodyMentionRef,
    mentionOpen: taskBodyMentionOpen,
    mentionOptions: taskBodyMentionOptions,
    openMentionPicker: openTaskBodyMentionPicker,
    insertMention: insertTaskBodyMention,
    handleChange: handleTaskBodyMentionChange,
    handleKeyDown: handleTaskBodyMentionKeyDown,
  } = useEntityMentionInput({
    value: body,
    entities: mentionEntities,
    onValueChange: setBody,
  });
  const resolvedActiveListId = taskLists.some((list) => list.id === activeListId)
    ? activeListId
    : (taskLists[0]?.id ?? '');
  const activeList = useMemo(
    () => taskLists.find((list) => list.id === resolvedActiveListId),
    [resolvedActiveListId, taskLists],
  );
  const activeListTasks = useMemo(
    () => (activeList ? tasks.filter((task) => task.listId === activeList.id) : []),
    [activeList, tasks],
  );
  const visibleTasks = useMemo(
    () => activeListTasks.filter((task) => filter === 'all' || task.status === filter),
    [activeListTasks, filter],
  );
  const remaining = activeListTasks.filter((task) => task.status === 'todo').length;
  const completed = activeListTasks.length - remaining;

  async function createTaskList(): Promise<void> {
    setBusy(true);
    try {
      await onCreateTaskList({ title: 'New list' });
    } finally {
      setBusy(false);
    }
  }

  async function saveTaskListTitle(nextTitle: string): Promise<void> {
    if (!activeList || !nextTitle.trim() || nextTitle.trim() === activeList.title) return;
    setBusy(true);
    try {
      await onUpdateTaskList({ taskListId: activeList.id, title: nextTitle });
    } finally {
      setBusy(false);
    }
  }

  async function createTask(): Promise<void> {
    if (!activeList || !title.trim()) return;
    setBusy(true);
    try {
      await onCreateTask({
        taskListId: activeList.id,
        title,
        body,
        agentId: agentId || defaultAgentId || agents[0]?.id,
      });
      setTitle('');
      setBody('');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await onDeleteTask({ taskId: deleteTarget.id });
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  }

  async function confirmListDelete(): Promise<void> {
    if (!deleteListTarget) return;
    setBusy(true);
    try {
      await onDeleteTaskList({ taskListId: deleteListTarget.id });
      setDeleteListTarget(null);
      setActiveListId(taskLists.find((list) => list.id !== deleteListTarget.id)?.id ?? '');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResourceShell
      sidebar={
        <div className="flex h-full min-h-0 flex-col px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              TODO
            </h2>
            <Button size="sm" onClick={() => void createTaskList()}>
              <Plus data-icon="inline-start" />
              New list
            </Button>
          </div>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search TODO"
              value={query}
              onChange={(event) => onQueryChange?.(event.target.value)}
              placeholder="Search TODO"
              className="liquid-glass-control h-9 rounded-lg pl-9"
            />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <section>
              <h3 className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">Lists</h3>
              <div className="flex flex-col gap-0.5">
                {taskLists.map((list) => (
                  <button
                    key={list.id}
                    aria-label={list.title}
                    className={cn(
                      'group flex min-h-14 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition hover:bg-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                      activeList?.id === list.id &&
                        'liquid-glass-control text-accent-foreground ring-1 ring-inset ring-border',
                    )}
                    onClick={() => setActiveListId(list.id)}
                  >
                    <span
                      className={cn(
                        'h-8 w-1 rounded-full bg-transparent',
                        activeList?.id === list.id && 'bg-[color:var(--status-active)]',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{list.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {list.openCount} open · {list.taskCount} tasks
                      </span>
                    </span>
                    {list.repairStatus === 'needs_repair' ? (
                      <Badge variant="destructive">Repair</Badge>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>
          </ScrollArea>
        </div>
      }
    >
      <section className="liquid-float-card flex h-full min-h-0 flex-col overflow-hidden rounded-lg border py-0 ring-0">
        <header className="flex h-[70px] shrink-0 items-center px-6">
          <div className="min-w-0 flex-1">
            <Input
              key={activeList?.id ?? 'no-task-list'}
              aria-label="TODO list title"
              defaultValue={activeList?.title ?? ''}
              disabled={!activeList}
              className="h-8 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
              onBlur={(event) => void saveTaskListTitle(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
            />
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{activeListTasks.length} tasks</span>
              <span className="size-1 rounded-full bg-muted-foreground/60" />
              <span>{remaining} open</span>
              <span className="size-1 rounded-full bg-muted-foreground/60" />
              <span>{completed} done</span>
            </div>
          </div>
          <div className="ml-4 flex items-center gap-2">
            {taskLists.length > 1 && activeList ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete TODO list"
                onClick={() => setDeleteListTarget(activeList)}
              >
                <Trash2 />
              </Button>
            ) : null}
            <Button variant="outline" onClick={onBack}>
              Back to conversation
            </Button>
          </div>
        </header>
        <div className="border-t px-6 py-4">
          <div className="liquid-glass-control w-full rounded-lg border p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Plus className="size-4" />
                New task
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Select
                  value={agentId || defaultAgentId || agents[0]?.id || HUMAN_ASSIGNEE_ID}
                  onValueChange={setAgentId}
                >
                  <SelectTrigger
                    aria-label="Task assignee"
                    size="sm"
                    className="liquid-glass-control w-40"
                  >
                    <UserRound className="size-3.5" />
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={HUMAN_ASSIGNEE_ID}>{profileDisplayName}</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  {(['all', 'todo', 'done'] as TaskFilter[]).map((value) => (
                    <Button
                      key={value}
                      variant={filter === value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter(value)}
                    >
                      {value === 'all' ? 'All' : value === 'todo' ? 'Open' : 'Done'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <Input
              aria-label="Task title"
              value={title}
              placeholder="Task title"
              className="liquid-glass-control h-9 rounded-lg"
              onChange={(event) => setTitle(event.target.value)}
            />
            <Textarea
              ref={taskBodyMentionRef}
              aria-label="Task notes"
              value={body}
              placeholder="Notes"
              className="mt-3 min-h-20 resize-none rounded-lg border bg-background/40"
              onChange={handleTaskBodyMentionChange}
              onKeyDown={handleTaskBodyMentionKeyDown}
            />
            <div className="mt-3 flex items-center justify-between">
              <EntityMentionButton
                open={taskBodyMentionOpen}
                options={taskBodyMentionOptions}
                onOpen={openTaskBodyMentionPicker}
                onInsert={insertTaskBodyMention}
              />
              <Button disabled={!activeList || !title.trim() || busy} onClick={createTask}>
                <Plus data-icon="inline-start" />
                Add task
              </Button>
            </div>
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex w-full flex-col gap-3 px-6 py-5">
            {visibleTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                agents={agents}
                defaultAgentId={defaultAgentId}
                profileDisplayName={profileDisplayName}
                mentionEntities={mentionEntities}
                busy={busy}
                onUpdate={onUpdateTask}
                onDelete={() => setDeleteTarget(task)}
                onOpenEntity={onOpenEntity}
              />
            ))}
            {visibleTasks.length === 0 ? (
              <div className="grid min-h-48 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No tasks found.
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </section>
      <DeleteResourceDialog
        open={Boolean(deleteTarget)}
        title="Delete task"
        description="This removes the task Markdown file from local storage."
        itemTitle={deleteTarget?.title ?? ''}
        busy={busy}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDelete={confirmDelete}
      />
      <DeleteResourceDialog
        open={Boolean(deleteListTarget)}
        title="Delete TODO list"
        description="This removes the list and its task Markdown files from local storage."
        itemTitle={deleteListTarget?.title ?? ''}
        busy={busy}
        onOpenChange={(open) => !open && setDeleteListTarget(null)}
        onDelete={confirmListDelete}
      />
    </ResourceShell>
  );
}

/**
 * TaskRow keeps edits local until Save, so browsing the list does not rewrite Markdown files.
 */
function TaskRow({
  task,
  agents,
  defaultAgentId,
  profileDisplayName,
  mentionEntities,
  busy,
  onUpdate,
  onDelete,
  onOpenEntity,
}: {
  task: TaskListItem;
  agents: AgentConfig[];
  defaultAgentId: string;
  profileDisplayName: string;
  mentionEntities: WorkspaceEntity[];
  busy: boolean;
  onUpdate: (input: UpdateTaskInput) => Promise<void>;
  onDelete: () => void;
  onOpenEntity?: (entity: WorkspaceEntityRef) => void;
}): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [body, setBody] = useState(task.body);
  const initialAgentId = task.agentId || defaultAgentId || agents[0]?.id || HUMAN_ASSIGNEE_ID;
  const [agentId, setAgentId] = useState(initialAgentId);
  const assigneeName = assigneeLabel(agents, profileDisplayName, initialAgentId);
  const {
    textareaRef: editTaskBodyMentionRef,
    mentionOpen: editTaskBodyMentionOpen,
    mentionOptions: editTaskBodyMentionOptions,
    openMentionPicker: openEditTaskBodyMentionPicker,
    insertMention: insertEditTaskBodyMention,
    handleChange: handleEditTaskBodyMentionChange,
    handleKeyDown: handleEditTaskBodyMentionKeyDown,
  } = useEntityMentionInput({
    value: body,
    entities: mentionEntities,
    onValueChange: setBody,
  });

  async function save(nextStatus = task.status): Promise<void> {
    if (!title.trim()) return;
    await onUpdate({
      taskId: task.id,
      title,
      body,
      status: nextStatus,
      agentId: agentId || undefined,
    });
    setEditing(false);
  }

  function cancelEdit(): void {
    setTitle(task.title);
    setBody(task.body);
    setEditing(false);
  }

  return (
    <div className="liquid-glass-control rounded-lg border p-4 text-sm">
      <div className="flex items-start gap-3">
        <Checkbox
          aria-label={`Mark ${task.title} complete`}
          checked={task.status === 'done'}
          disabled={task.repairStatus !== 'ok' || busy}
          onCheckedChange={(checked) => void save(checked ? 'done' : 'todo')}
        />
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-3">
              <Input
                aria-label="Edit task title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <Textarea
                ref={editTaskBodyMentionRef}
                aria-label="Edit task notes"
                value={body}
                className="min-h-24 resize-none"
                onChange={handleEditTaskBodyMentionChange}
                onKeyDown={handleEditTaskBodyMentionKeyDown}
              />
              <EntityMentionButton
                open={editTaskBodyMentionOpen}
                options={editTaskBodyMentionOptions}
                onOpen={openEditTaskBodyMentionPicker}
                onInsert={insertEditTaskBodyMention}
              />
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger aria-label="Edit task assignee" className="w-52">
                  <UserRound className="size-4" />
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={HUMAN_ASSIGNEE_ID}>{profileDisplayName}</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button size="sm" disabled={!title.trim() || busy} onClick={() => void save()}>
                  <Save data-icon="inline-start" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-2">
                <h3
                  className={cn(
                    'truncate font-medium',
                    task.status === 'done' && 'text-muted-foreground line-through',
                  )}
                >
                  {task.title}
                </h3>
                {task.repairStatus === 'needs_repair' ? (
                  <Badge variant="destructive">Needs repair</Badge>
                ) : null}
              </div>
              {task.body ? (
                <EntityMarkdown
                  body={task.body}
                  className="mt-2 whitespace-pre-wrap text-muted-foreground"
                  mentionEntities={mentionEntities}
                  onOpenEntity={onOpenEntity}
                />
              ) : null}
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs text-muted-foreground">
                <UserRound className="size-3" />
                Assignee: {assigneeName}
              </div>
            </>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit task"
            onClick={() => {
              setTitle(task.title);
              setBody(task.body);
              setEditing(true);
            }}
          >
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Delete task" onClick={onDelete}>
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  );
}

function assigneeLabel(
  agents: AgentConfig[],
  profileDisplayName: string,
  assigneeId: string,
): string {
  if (assigneeId === HUMAN_ASSIGNEE_ID) return profileDisplayName;
  return agents.find((agent) => agent.id === assigneeId)?.name ?? (assigneeId || 'Unassigned');
}

export { TasksPage };
