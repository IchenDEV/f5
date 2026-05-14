import { ArrowLeft, Bot, FileText, MessageCircle, Plus, UserRound } from 'lucide-react';
import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HUMAN_ASSIGNEE_ID } from '../../shared/types';
import type { AgentConfig, WorkspaceSnapshot } from '../../shared/types';

/**
 * TaskWorkbenchPage groups the task, its linked chats, and its linked docs without duplicating storage state.
 */
function TaskWorkbenchPage({
  snapshot,
  taskId,
  onBack,
  onOpenConversation,
  onStartChat,
  onCreateDocument,
}: {
  snapshot: WorkspaceSnapshot;
  taskId: string;
  onBack: () => void;
  onOpenConversation: (conversationId: string) => void;
  onStartChat: (taskId: string) => void;
  onCreateDocument: (taskId: string) => void;
}): React.JSX.Element {
  const task = useMemo(
    () => snapshot.tasks.find((item) => item.id === taskId),
    [snapshot.tasks, taskId],
  );
  const conversations = useMemo(
    () => snapshot.conversations.filter((conversation) => conversation.taskId === taskId),
    [snapshot.conversations, taskId],
  );
  const documents = useMemo(
    () => snapshot.documents.filter((document) => document.taskId === taskId),
    [snapshot.documents, taskId],
  );

  if (!task) {
    return (
      <section className="liquid-float-card grid h-full min-h-0 place-items-center rounded-2xl border p-8 text-sm text-muted-foreground">
        Task not found.
      </section>
    );
  }

  const assignee = assigneeName(snapshot.agents, snapshot.profile.displayName, task.agentId);
  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(280px,360px)_minmax(0,1fr)] gap-5 overflow-hidden max-lg:grid-cols-1">
      <aside className="liquid-float-card flex min-h-0 flex-col rounded-2xl border p-5">
        <div className="mb-5 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft data-icon="inline-start" />
            Back
          </Button>
          <Badge variant={task.status === 'done' ? 'secondary' : 'outline'}>
            {task.status === 'done' ? 'Done' : 'Open'}
          </Badge>
        </div>
        <div className="min-w-0">
          <h1 className="break-words text-xl font-semibold leading-7">{task.title}</h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            {task.agentId === HUMAN_ASSIGNEE_ID ? (
              <UserRound className="size-4" />
            ) : (
              <Bot className="size-4" />
            )}
            <span>Assignee: {assignee}</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Updated {task.updatedAt.slice(0, 10)}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onStartChat(task.id)}>
            <MessageCircle data-icon="inline-start" />
            Start chat
          </Button>
          <Button variant="outline" size="sm" onClick={() => onCreateDocument(task.id)}>
            <Plus data-icon="inline-start" />
            New doc
          </Button>
        </div>
        <section className="mt-6 min-h-0 flex-1">
          <h2 className="mb-2 text-xs font-medium uppercase text-muted-foreground">Notes</h2>
          <ScrollArea className="max-h-[320px] rounded-xl border bg-background/30">
            <div className="whitespace-pre-wrap break-words p-4 text-sm text-muted-foreground">
              {task.body || 'No notes.'}
            </div>
          </ScrollArea>
        </section>
      </aside>
      <section className="liquid-float-card flex min-h-0 flex-col overflow-hidden rounded-2xl border">
        <header className="flex h-[70px] shrink-0 items-center border-b px-6">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">Task workbench</h2>
            <div className="mt-1 text-sm text-muted-foreground">
              {conversations.length} chats · {documents.length} docs
            </div>
          </div>
        </header>
        <ScrollArea className="min-h-0 flex-1">
          <div className="grid gap-5 p-5 lg:grid-cols-2">
            <WorkbenchSection
              title="Linked Chat"
              empty="No linked chat yet."
              items={conversations}
              renderItem={(conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  aria-label={`Open chat ${conversation.title}`}
                  className="liquid-glass-control w-full rounded-xl border p-4 text-left text-sm transition hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  onClick={() => onOpenConversation(conversation.id)}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <MessageCircle className="size-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-muted-foreground">{conversation.preview}</p>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {conversation.messageCount} messages
                  </div>
                </button>
              )}
            />
            <WorkbenchSection
              title="Linked Docs"
              empty="No linked docs yet."
              items={documents}
              renderItem={(document) => (
                <div
                  key={document.id}
                  className="liquid-glass-control rounded-xl border p-4 text-sm"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{document.title}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Task document</div>
                </div>
              )}
            />
          </div>
        </ScrollArea>
      </section>
    </section>
  );
}

function WorkbenchSection<T>({
  title,
  empty,
  items,
  renderItem,
}: {
  title: string;
  empty: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}): React.JSX.Element {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="flex flex-col gap-3">
        {items.map(renderItem)}
        {items.length === 0 ? (
          <div className="grid min-h-32 place-items-center rounded-xl border border-dashed px-4 text-center text-sm text-muted-foreground">
            {empty}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function assigneeName(agents: AgentConfig[], displayName: string, assigneeId: string): string {
  if (assigneeId === HUMAN_ASSIGNEE_ID) return displayName;
  return agents.find((agent) => agent.id === assigneeId)?.name ?? assigneeId;
}

export { TaskWorkbenchPage };
