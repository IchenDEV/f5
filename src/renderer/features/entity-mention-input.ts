import { useMemo, useRef, useState } from 'react';
import { filterWorkspaceEntities, workspaceEntityMarkdown } from '../../shared/workspace-entities';
import type { WorkspaceEntity } from '../../shared/types';
import type React from 'react';

type MentionRange = { start: number; end: number; query: string };

interface EntityMentionController {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  mentionOpen: boolean;
  mentionOptions: WorkspaceEntity[];
  openMentionPicker: () => void;
  insertMention: (entity: WorkspaceEntity) => void;
  handleChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => boolean;
}

// Keeps cursor-aware entity insertion reusable across chat, TODO notes, and document Markdown.
function useEntityMentionInput({
  value,
  entities,
  onValueChange,
}: {
  value: string;
  entities: WorkspaceEntity[];
  onValueChange: (value: string) => void;
}): EntityMentionController {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionRange, setMentionRange] = useState<MentionRange | null>(null);
  const mentionOptions = useMemo(
    () => filterWorkspaceEntities(entities, mentionQuery),
    [entities, mentionQuery],
  );

  function openMentionPicker(): void {
    const textarea = textareaRef.current;
    const cursor =
      textarea && document.activeElement === textarea ? textarea.selectionStart : value.length;
    setMentionRange({ start: cursor, end: cursor, query: '' });
    setMentionQuery('');
    setMentionOpen(true);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function syncMentionState(nextValue: string, cursor: number): void {
    const range = findMentionRange(nextValue, cursor);
    if (!range) {
      setMentionRange(null);
      setMentionQuery('');
      setMentionOpen(false);
      return;
    }
    setMentionRange(range);
    setMentionQuery(range.query);
    setMentionOpen(true);
  }

  function insertMention(entity: WorkspaceEntity): void {
    const range = mentionRange ?? {
      start: textareaRef.current?.selectionStart ?? value.length,
      end: textareaRef.current?.selectionEnd ?? value.length,
      query: '',
    };
    const next = replaceDraftRange(value, range, workspaceEntityMarkdown(entity));
    onValueChange(next.value);
    setMentionOpen(false);
    setMentionQuery('');
    setMentionRange(null);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(next.cursor, next.cursor);
    });
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    onValueChange(event.target.value);
    syncMentionState(event.target.value, event.target.selectionStart);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (mentionOpen && event.key === 'Escape') {
      event.preventDefault();
      setMentionOpen(false);
      return true;
    }
    if (mentionOpen && event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
      if (mentionOptions[0]) {
        event.preventDefault();
        insertMention(mentionOptions[0]);
        return true;
      }
    }
    return false;
  }

  return {
    textareaRef,
    mentionOpen,
    mentionOptions,
    openMentionPicker,
    insertMention,
    handleChange,
    handleKeyDown,
  };
}

function findMentionRange(value: string, cursor: number): MentionRange | null {
  const prefix = value.slice(0, cursor);
  const match = prefix.match(/(^|[\s([{])@([^\s@()[\]{}]*)$/);
  if (!match) return null;
  const query = match[2] ?? '';
  const start = prefix.length - query.length - 1;
  return { start, end: cursor, query };
}

function replaceDraftRange(
  draft: string,
  range: Pick<MentionRange, 'start' | 'end'>,
  insertion: string,
): { value: string; cursor: number } {
  const prefix = draft.slice(0, range.start);
  const suffix = draft.slice(range.end);
  const leading = prefix && !/\s$/.test(prefix) ? ' ' : '';
  const trailing = suffix && /^\s/.test(suffix) ? '' : ' ';
  const inserted = `${leading}${insertion}${trailing}`;
  return {
    value: `${prefix}${inserted}${suffix}`,
    cursor: prefix.length + inserted.length,
  };
}

export { useEntityMentionInput };
export type { EntityMentionController };
