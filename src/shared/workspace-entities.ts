import type {
  WorkspaceEntity,
  WorkspaceEntityKind,
  WorkspaceEntityRef,
  WorkspaceSnapshot,
} from './types';

const mentionableKinds = ['document', 'todo', 'todo-list', 'conversation', 'agent'] as const;

const kindLabels: Record<WorkspaceEntityKind, string> = {
  document: 'Document',
  todo: 'TODO',
  'todo-list': 'TODO List',
  conversation: 'Conversation',
  agent: 'Agent',
};

export function workspaceEntityKindLabel(kind: WorkspaceEntityKind): string {
  return kindLabels[kind];
}

export function workspaceEntityUri(kind: WorkspaceEntityKind, id: string): string {
  return `f5://${kind}/${encodeURIComponent(id)}`;
}

export function parseWorkspaceEntityUri(
  uri: string,
): Pick<WorkspaceEntityRef, 'kind' | 'id'> | null {
  const match = uri.match(/^f5:\/\/(document|todo|todo-list|conversation|agent)\/([^/#?]+)$/);
  if (!match) return null;
  const kind = match[1] as WorkspaceEntityKind;
  return { kind, id: decodeURIComponent(match[2]) };
}

export function workspaceEntityMarkdown(entity: WorkspaceEntityRef): string {
  return `@[${escapeMarkdownLabel(entity.label)}](${entity.uri})`;
}

export function workspaceEntityDisplayMarkdown(content: string): string {
  return content.replace(entityMentionPattern(), '[$1]($2)');
}

export function parseWorkspaceEntityMentions(content: string): WorkspaceEntityRef[] {
  const mentions: WorkspaceEntityRef[] = [];
  const seen = new Set<string>();
  for (const match of content.matchAll(entityMentionPattern())) {
    const parsed = parseWorkspaceEntityUri(match[2]);
    if (!parsed) continue;
    const key = `${parsed.kind}:${parsed.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    mentions.push({
      ...parsed,
      label: unescapeMarkdownLabel(match[1]),
      uri: workspaceEntityUri(parsed.kind, parsed.id),
    });
  }
  return mentions;
}

function entityMentionPattern(): RegExp {
  const uriPattern = mentionableKinds.join('|');
  return new RegExp(`@\\[((?:\\\\.|[^\\\\\\]])+)\\]\\((f5://(?:${uriPattern})/[^\\s)]+)\\)`, 'g');
}

// Builds the single mention catalog from every workspace resource type already present in snapshots.
function workspaceEntitiesFromSnapshot(snapshot: WorkspaceSnapshot): WorkspaceEntity[] {
  const taskListsById = new Map(snapshot.taskLists.map((list) => [list.id, list]));
  const agentsById = new Map(snapshot.agents.map((agent) => [agent.id, agent]));

  const documents = snapshot.documents.map((document) =>
    makeEntity(
      'document',
      document.id,
      document.title,
      document.repairStatus === 'needs_repair' ? 'Needs repair' : 'Markdown document',
    ),
  );

  const tasks = snapshot.tasks.map((task) => {
    const listTitle = taskListsById.get(task.listId)?.title ?? 'TODO';
    const agentName = agentsById.get(task.agentId)?.name ?? task.agentId;
    return makeEntity(
      'todo',
      task.id,
      task.title,
      `${task.status === 'done' ? 'Done' : 'Open'} in ${listTitle} - ${agentName}`,
      task.body,
    );
  });

  const taskLists = snapshot.taskLists.map((list) =>
    makeEntity(
      'todo-list',
      list.id,
      list.title,
      `${list.openCount} open - ${list.taskCount} total`,
    ),
  );

  const conversations = snapshot.conversations.map((conversation) =>
    makeEntity(
      'conversation',
      conversation.id,
      conversation.title,
      `${conversation.agentName} - ${conversation.messageCount} messages`,
      conversation.preview,
    ),
  );

  const agents = snapshot.agents.map((agent) =>
    makeEntity(
      'agent',
      agent.id,
      agent.name,
      `${agent.kind} - ${agent.availability ?? 'available'}`,
      [agent.description, agent.command, ...agent.args].filter(Boolean).join(' '),
    ),
  );

  return [...documents, ...tasks, ...taskLists, ...conversations, ...agents];
}

export function filterWorkspaceEntities(
  entities: WorkspaceEntity[],
  query: string,
  limit = 12,
): WorkspaceEntity[] {
  const normalized = query.trim().replace(/^@/, '').toLowerCase();
  if (!normalized) return entities.slice(0, limit);
  return entities
    .filter((entity) => entity.searchText.includes(normalized))
    .sort((left, right) => {
      const leftStarts = left.label.toLowerCase().startsWith(normalized) ? 0 : 1;
      const rightStarts = right.label.toLowerCase().startsWith(normalized) ? 0 : 1;
      return leftStarts - rightStarts || left.label.localeCompare(right.label);
    })
    .slice(0, limit);
}

function makeEntity(
  kind: WorkspaceEntityKind,
  id: string,
  label: string,
  subtitle: string,
  extraSearchText = '',
): WorkspaceEntity {
  return {
    kind,
    id,
    label,
    uri: workspaceEntityUri(kind, id),
    subtitle,
    searchText: `${kindLabels[kind]} ${label} ${subtitle} ${id} ${extraSearchText}`.toLowerCase(),
  };
}

function escapeMarkdownLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function unescapeMarkdownLabel(value: string): string {
  return value.replace(/\\./g, (match) => {
    const character = match[1];
    return character === '[' || character === ']' || character === '\\' ? character : match;
  });
}

export { workspaceEntitiesFromSnapshot };
