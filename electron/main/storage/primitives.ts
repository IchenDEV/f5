import matter from 'gray-matter';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { access, mkdir, realpath, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve, sep } from 'node:path';
import {
  conversationIdSchema,
  documentCommentIdSchema,
  documentIdSchema,
  taskIdSchema,
  taskListIdSchema,
} from '../../../src/shared/schemas';
import type { LocalIdPrefix } from '../../../src/shared/types';

export function makeLocalId(prefix: LocalIdPrefix): string {
  return `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 24)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function conversationDir(workspacePath: string, conversationId: string): string {
  const parsed = conversationIdSchema.parse(conversationId);
  const root = resolve(workspacePath, 'conversations');
  const target = resolve(root, parsed);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`Conversation path escapes workspace: ${conversationId}`);
  }
  return target;
}

export function taskFilePath(workspacePath: string, taskId: string): string {
  const parsed = taskIdSchema.parse(taskId);
  const root = resolve(workspacePath, 'tasks');
  const target = resolve(root, `${parsed}.md`);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`Task path escapes workspace: ${taskId}`);
  }
  return target;
}

export function taskListFilePath(workspacePath: string, taskListId: string): string {
  const parsed = taskListIdSchema.parse(taskListId);
  const root = resolve(workspacePath, 'tasks', 'lists');
  const target = resolve(root, `${parsed}.md`);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`Task list path escapes workspace: ${taskListId}`);
  }
  return target;
}

export function documentFilePath(workspacePath: string, documentId: string): string {
  const parsed = documentIdSchema.parse(documentId);
  const root = resolve(workspacePath, 'documents');
  const target = resolve(root, `${parsed}.md`);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`Document path escapes workspace: ${documentId}`);
  }
  return target;
}

export function documentCommentFilePath(workspacePath: string, commentId: string): string {
  const parsed = documentCommentIdSchema.parse(commentId);
  const root = resolve(workspacePath, 'documents', 'comments');
  const target = resolve(root, `${parsed}.md`);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`Document comment path escapes workspace: ${commentId}`);
  }
  return target;
}

export function messageFileName(sequence: number, role: string, messageId: string): string {
  return `${String(sequence).padStart(6, '0')}-${role}-${messageId}.md`;
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function atomicWriteFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
  await writeFile(tempPath, content, 'utf8');
  await rename(tempPath, path);
}

export async function atomicWriteJson(path: string, value: unknown): Promise<void> {
  await atomicWriteFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function markdownWithFrontmatter(meta: Record<string, unknown>, body: string): string {
  return matter.stringify(body.trimEnd() ? `${body.trimEnd()}\n` : '', meta);
}

export async function ensureRealPathInside(root: string, target: string): Promise<void> {
  await mkdir(root, { recursive: true });
  const rootReal = await realpath(root);
  let targetReal: string;
  try {
    targetReal = await realpath(target);
  } catch {
    const parentReal = await realpath(dirname(target));
    targetReal = resolve(parentReal, basename(target));
  }
  if (targetReal !== rootReal && !targetReal.startsWith(`${rootReal}${sep}`)) {
    throw new Error(`Path escapes workspace: ${target}`);
  }
}
