import {
  parseWorkspaceEntityMentions,
  workspaceEntityKindLabel,
} from '../../src/shared/workspace-entities';
import type { WorkspaceEntityRef } from '../../src/shared/types';
import type { WorkspaceStore } from './workspace-store';

const ENTITY_CONTEXT_CHAR_LIMIT = 20000;

export class WorkspaceEntityService {
  constructor(private readonly store: WorkspaceStore) {}

  async buildPromptContext(content: string): Promise<string> {
    const mentions = parseWorkspaceEntityMentions(content);
    if (mentions.length === 0) return '';
    const sections = await Promise.all(
      mentions.map((mention) => this.formatPromptContext(mention)),
    );
    return truncateFromStart(sections.join('\n\n'), ENTITY_CONTEXT_CHAR_LIMIT);
  }

  async listReferences() {
    return this.store.listEntityReferences();
  }

  // Formats each supported entity kind into a compact block the active agent can reason over.
  private async formatPromptContext(mention: WorkspaceEntityRef): Promise<string> {
    try {
      if (mention.kind === 'document') {
        const document = await this.store.readDocument(mention.id);
        return [
          `### Document: ${document.title}`,
          `ID: ${document.id}`,
          '',
          fencedBlock('markdown', document.body),
        ].join('\n');
      }
      if (mention.kind === 'todo') {
        const task = await this.store.readTask(mention.id);
        const list = await this.store.readTaskList(task.listId).catch(() => undefined);
        const agent = await this.store.getAgent(task.agentId);
        return [
          `### TODO: ${task.title}`,
          `ID: ${task.id}`,
          `Status: ${task.status}`,
          `List: ${list?.title ?? task.listId}`,
          `Agent: ${agent.name}`,
          '',
          task.body.trim() || '(empty)',
        ].join('\n');
      }
      if (mention.kind === 'todo-list') {
        const list = await this.store.readTaskList(mention.id);
        const tasks = (await this.store.listTasks()).filter((task) => task.listId === list.id);
        return [
          `### TODO List: ${list.title}`,
          `ID: ${list.id}`,
          '',
          tasks.length
            ? tasks
                .map((task) => `- [${task.status === 'done' ? 'x' : ' '}] ${task.title}`)
                .join('\n')
            : 'No tasks.',
        ].join('\n');
      }
      if (mention.kind === 'conversation') {
        const conversation = await this.store.openConversation(mention.id);
        const messages = conversation.messages
          .filter((message) => message.meta.status === 'completed')
          .slice(-8)
          .map((message) => {
            const role = message.meta.role === 'user' ? 'User' : 'Assistant';
            return [`### ${message.meta.sequence}. ${role}`, message.body.trim() || '(empty)'].join(
              '\n',
            );
          })
          .join('\n\n');
        return [
          `### Conversation: ${conversation.conversation.title}`,
          `ID: ${conversation.conversation.id}`,
          `Agent: ${conversation.agent.name}`,
          '',
          messages || 'No completed messages.',
        ].join('\n');
      }
      const agent = await this.store.getAgent(mention.id);
      return [
        `### Agent: ${agent.name}`,
        `ID: ${agent.id}`,
        `Kind: ${agent.kind}`,
        `Availability: ${agent.availability ?? 'available'}`,
        `Command: ${[agent.command, ...agent.args].join(' ')}`,
        '',
        agent.description ?? '',
      ]
        .filter((line) => line !== '')
        .join('\n');
    } catch {
      return [
        `### ${workspaceEntityKindLabel(mention.kind)}: ${mention.label}`,
        `ID: ${mention.id}`,
        'Status: unavailable',
      ].join('\n');
    }
  }
}

function truncateFromStart(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `[Earlier context truncated]\n${value.slice(value.length - maxLength)}`;
}

function fencedBlock(language: string, value: string): string {
  const longestBacktickRun =
    value.match(/`+/g)?.reduce((longest, run) => Math.max(longest, run.length), 0) ?? 0;
  const fence = '`'.repeat(Math.max(3, longestBacktickRun + 1));
  return `${fence}${language}\n${value.trimEnd() || '(empty)'}\n${fence}`;
}
