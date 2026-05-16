import { describe, expect, it } from 'vitest';
import {
  parseWorkspaceEntityMentions,
  workspaceEntitiesFromSnapshot,
  workspaceEntityDisplayMarkdown,
  workspaceEntityMarkdown,
} from './workspace-entities';
import type { WorkspaceSnapshot } from './types';

const updatedAt = '2026-05-17T00:00:00.000Z';

function snapshot(): WorkspaceSnapshot {
  return {
    workspacePath: '/tmp/f5-workspace',
    profile: {
      schema: 'f5.profile.v1',
      displayName: 'You',
      defaultAgentId: 'codex-cli-real',
      workspacePath: '/tmp/f5-workspace',
      theme: 'light',
      iconTheme: 'system',
    },
    agents: [
      {
        id: 'codex-cli-real',
        name: 'Codex',
        kind: 'codex-cli',
        command: 'codex',
        args: [],
        cwd: '.',
        enabled: true,
        availability: 'available',
      },
    ],
    conversations: [
      {
        schema: 'f5.conversation.v1',
        id: 'conv_aaaaaaaaaaaaaaaaaaaaaaaa',
        taskId: '',
        title: 'Launch chat',
        agentId: 'codex-cli-real',
        status: 'active',
        starred: false,
        createdAt: updatedAt,
        updatedAt,
        lastMessageAt: updatedAt,
        messageCount: 2,
        agentName: 'Codex',
        agentStatus: 'available',
        preview: 'Previous launch decision',
      },
    ],
    taskLists: [
      {
        schema: 'f5.task-list.v1',
        id: 'tasklist_aaaaaaaaaaaaaaaaaaaaaaaa',
        title: 'Inbox',
        createdAt: updatedAt,
        updatedAt,
        order: 0,
        repairStatus: 'ok',
        taskCount: 1,
        openCount: 1,
      },
    ],
    tasks: [
      {
        schema: 'f5.task.v1',
        id: 'task_aaaaaaaaaaaaaaaaaaaaaaaa',
        listId: 'tasklist_aaaaaaaaaaaaaaaaaaaaaaaa',
        agentId: 'codex-cli-real',
        title: 'Ship release notes',
        status: 'todo',
        createdAt: updatedAt,
        updatedAt,
        completedAt: '',
        order: 0,
        body: 'Mention the new entity model.',
        repairStatus: 'ok',
      },
    ],
    documents: [
      {
        schema: 'f5.document.v1',
        id: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
        taskId: '',
        title: 'Entity design',
        createdAt: updatedAt,
        updatedAt,
        repairStatus: 'ok',
      },
    ],
    documentComments: [],
    entityReferences: [],
  };
}

describe('workspace entity mentions', () => {
  it('normalizes documents, TODO, conversations, and agents into one entity list', () => {
    const entities = workspaceEntitiesFromSnapshot(snapshot());

    expect(entities.map((entity) => `${entity.kind}:${entity.id}`)).toEqual([
      'document:doc_aaaaaaaaaaaaaaaaaaaaaaaa',
      'todo:task_aaaaaaaaaaaaaaaaaaaaaaaa',
      'todo-list:tasklist_aaaaaaaaaaaaaaaaaaaaaaaa',
      'conversation:conv_aaaaaaaaaaaaaaaaaaaaaaaa',
      'agent:codex-cli-real',
    ]);
    expect(entities.find((entity) => entity.kind === 'todo')?.subtitle).toContain('Inbox');
  });

  it('creates and parses stable Markdown mention tokens', () => {
    const [document] = workspaceEntitiesFromSnapshot(snapshot());
    const token = workspaceEntityMarkdown(document);
    const mentions = parseWorkspaceEntityMentions(`Please review ${token} with @plain text.`);

    expect(token).toBe('@[Entity design](f5://document/doc_aaaaaaaaaaaaaaaaaaaaaaaa)');
    expect(mentions).toEqual([
      {
        kind: 'document',
        id: 'doc_aaaaaaaaaaaaaaaaaaaaaaaa',
        label: 'Entity design',
        uri: 'f5://document/doc_aaaaaaaaaaaaaaaaaaaaaaaa',
      },
    ]);
  });

  it('converts persisted mention tokens into display Markdown links', () => {
    const [document] = workspaceEntitiesFromSnapshot(snapshot());

    expect(workspaceEntityDisplayMarkdown(`See ${workspaceEntityMarkdown(document)}.`)).toBe(
      'See [Entity design](f5://document/doc_aaaaaaaaaaaaaaaaaaaaaaaa).',
    );
  });
});
