import {
  Bot,
  CheckCircle2,
  FileText,
  FolderOpen,
  LocateFixed,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Components } from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { EntityMarkdown } from '@/features/entity-markdown';
import { EntityMentionButton, useEntityMentionInput } from '@/features/entity-mentions';
import { textFromReactNode } from '@/features/react-node-text';
import { DeleteResourceDialog, ResourceShell } from '@/features/resources/resource-shell';
import { cn } from '@/lib/utils';
import type {
  CreateDocumentCommentInput,
  CreateDocumentInput,
  DeleteDocumentCommentInput,
  DeleteDocumentInput,
  DocumentCommentListItem,
  DocumentListItem,
  DocumentRecord,
  TaskListItem,
  UpdateDocumentCommentInput,
  UpdateDocumentInput,
  WorkspaceEntity,
  WorkspaceEntityRef,
} from '../../../shared/types';

type DocumentSaveState = 'idle' | 'saving' | 'saved' | 'error';
type DocumentCommentAnchor = {
  anchorText: string;
  anchorStart: number;
  anchorEnd: number;
};
type PreviewCommentAnchor = Pick<
  DocumentCommentListItem,
  'id' | 'anchorText' | 'anchorStart' | 'anchorEnd' | 'status'
>;

function normalizeCommentAnchor(
  text: string,
  start: number,
  end: number,
): DocumentCommentAnchor | null {
  const leadingWhitespace = text.match(/^\s*/)?.[0].length ?? 0;
  const trailingWhitespace = text.match(/\s*$/)?.[0].length ?? 0;
  const anchorText = text.trim();
  if (!anchorText) return null;
  return {
    anchorText,
    anchorStart: start + leadingWhitespace,
    anchorEnd: Math.max(start + leadingWhitespace, end - trailingWhitespace),
  };
}

function escapeMarkdownLinkText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function resolveAnchorRange(
  body: string,
  anchor: PreviewCommentAnchor,
): { id: string; start: number; end: number; text: string } | null {
  if (!anchor.anchorText) return null;
  const direct = body.slice(anchor.anchorStart, anchor.anchorEnd);
  if (direct.trim() === anchor.anchorText) {
    const leadingWhitespace = direct.match(/^\s*/)?.[0].length ?? 0;
    const trailingWhitespace = direct.match(/\s*$/)?.[0].length ?? 0;
    const start = anchor.anchorStart + leadingWhitespace;
    const end = Math.max(start, anchor.anchorEnd - trailingWhitespace);
    return { id: anchor.id, start, end, text: body.slice(start, end) };
  }
  const fallbackStart = body.indexOf(anchor.anchorText);
  if (fallbackStart < 0) return null;
  return {
    id: anchor.id,
    start: fallbackStart,
    end: fallbackStart + anchor.anchorText.length,
    text: anchor.anchorText,
  };
}

function markdownWithCommentAnchors(body: string, anchors: PreviewCommentAnchor[]): string {
  const ranges = anchors
    .map((anchor) => resolveAnchorRange(body, anchor))
    .filter((range): range is NonNullable<typeof range> => Boolean(range))
    .sort((a, b) => b.start - a.start);
  const applied: Array<{ start: number; end: number }> = [];
  return ranges.reduce((draft, range) => {
    if (applied.some((item) => range.start < item.end && range.end > item.start)) return draft;
    applied.push({ start: range.start, end: range.end });
    const link = `[${escapeMarkdownLinkText(range.text)}](#document-comment-${range.id})`;
    return `${draft.slice(0, range.start)}${link}${draft.slice(range.end)}`;
  }, body);
}

function fencedMarkdown(value: string): string {
  const fence = value.includes('```') ? '````' : '```';
  return `${fence}markdown\n${value.trimEnd()}\n${fence}`;
}

function documentAgentPrompt(document: DocumentRecord): string {
  return [
    '请阅读这份 Markdown 文档，并根据内容给出反馈或下一步处理建议。',
    '',
    `Document: ${document.title}`,
    `Document ID: ${document.id}`,
    '',
    fencedMarkdown(document.body),
  ].join('\n');
}

function documentCommentAgentPrompt({
  document,
  comment,
}: {
  document: DocumentRecord;
  comment: Pick<DocumentCommentListItem, 'body' | 'anchorText' | 'anchorStart' | 'anchorEnd'>;
}): string {
  const lines = [
    '请处理这条 Markdown 文档评论。',
    '',
    `Document: ${document.title}`,
    `Document ID: ${document.id}`,
    '',
    'Comment:',
    comment.body.trim(),
  ];
  if (comment.anchorText) {
    lines.push(
      '',
      'Selected text:',
      `> ${comment.anchorText.replace(/\n/g, '\n> ')}`,
      '',
      `Range: ${comment.anchorStart}-${comment.anchorEnd}`,
    );
  }
  lines.push('', 'Full document:', fencedMarkdown(document.body));
  return lines.join('\n');
}

/**
 * MarkdownPreview renders regular Markdown while turning saved comment anchors into visible marks.
 */
function MarkdownPreview({
  body,
  commentAnchors = [],
  activeCommentId = '',
  mentionEntities = [],
  onShowAnchor,
  onOpenEntity,
}: {
  body: string;
  commentAnchors?: PreviewCommentAnchor[];
  activeCommentId?: string;
  mentionEntities?: WorkspaceEntity[];
  onShowAnchor?: (commentId: string) => void;
  onOpenEntity?: (entity: WorkspaceEntityRef) => void;
}): React.JSX.Element {
  const highlightedBody = useMemo(
    () => markdownWithCommentAnchors(body, commentAnchors),
    [body, commentAnchors],
  );
  const components = useMemo<Components>(
    () => ({
      a({ href, children }) {
        const commentId = href?.match(/^#document-comment-(comment_[a-f0-9]{24})$/)?.[1];
        if (commentId) {
          const text = textFromReactNode(children);
          return (
            <button
              type="button"
              aria-label={`Commented text: ${text}`}
              className={cn(
                'rounded px-0.5 text-left text-foreground ring-1 ring-amber-400/40 transition',
                activeCommentId === commentId
                  ? 'bg-amber-400/45 ring-amber-300'
                  : 'bg-amber-400/25 hover:bg-amber-400/35',
              )}
              onClick={() => onShowAnchor?.(commentId)}
            >
              {children}
            </button>
          );
        }
        return <a href={href}>{children}</a>;
      },
    }),
    [activeCommentId, onShowAnchor],
  );

  return (
    <EntityMarkdown
      body={highlightedBody}
      emptyText="_Empty document_"
      className="prose prose-sm max-w-none break-words text-sm dark:prose-invert"
      components={components}
      mentionEntities={mentionEntities}
      onOpenEntity={onOpenEntity}
    />
  );
}

/**
 * DocumentsPage keeps the selected document body loaded on demand and previews unsaved Markdown drafts.
 */
function DocumentsPage({
  documents,
  comments = [],
  tasks = [],
  mentionEntities = [],
  query,
  onQueryChange,
  onBack,
  onCreateDocument,
  onOpenDocument,
  onUpdateDocument,
  onDeleteDocument,
  onRevealDocument,
  onCreateDocumentComment,
  onUpdateDocumentComment,
  onDeleteDocumentComment,
  onSendToAgent,
  onOpenEntity,
  canSendToAgent = false,
  agentName = 'Agent',
}: {
  documents: DocumentListItem[];
  comments?: DocumentCommentListItem[];
  tasks?: TaskListItem[];
  mentionEntities?: WorkspaceEntity[];
  query: string;
  onQueryChange?: (value: string) => void;
  onBack: () => void;
  onCreateDocument: (input: CreateDocumentInput) => Promise<DocumentRecord>;
  onOpenDocument: (documentId: string) => Promise<DocumentRecord>;
  onUpdateDocument: (input: UpdateDocumentInput) => Promise<DocumentRecord>;
  onDeleteDocument: (input: DeleteDocumentInput) => Promise<void>;
  onRevealDocument: (documentId: string) => Promise<void>;
  onCreateDocumentComment?: (input: CreateDocumentCommentInput) => Promise<void>;
  onUpdateDocumentComment?: (input: UpdateDocumentCommentInput) => Promise<void>;
  onDeleteDocumentComment?: (input: DeleteDocumentCommentInput) => Promise<void>;
  onSendToAgent?: (content: string) => Promise<void>;
  onOpenEntity?: (entity: WorkspaceEntityRef) => void;
  canSendToAgent?: boolean;
  agentName?: string;
}): React.JSX.Element {
  const [selected, setSelected] = useState<DocumentRecord | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<DocumentSaveState>('idle');
  const [commentAnchor, setCommentAnchor] = useState<DocumentCommentAnchor | null>(null);
  const [activeCommentId, setActiveCommentId] = useState('');
  const selectedComments = useMemo(
    () => (selected ? comments.filter((comment) => comment.documentId === selected.id) : []),
    [comments, selected],
  );
  const taskNames = useMemo(() => new Map(tasks.map((task) => [task.id, task.title])), [tasks]);
  const dirty = Boolean(selected && (selected.title !== title || selected.body !== body));
  const latestDraftRef = useRef({
    documentId: '',
    savedTitle: '',
    savedBody: '',
    title: '',
    body: '',
  });
  const updateDocumentRef = useRef(onUpdateDocument);
  const saveRequestRef = useRef(0);
  const {
    textareaRef: documentBodyMentionRef,
    mentionOpen: documentBodyMentionOpen,
    mentionOptions: documentBodyMentionOptions,
    openMentionPicker: openDocumentBodyMentionPicker,
    insertMention: insertDocumentBodyMention,
    handleChange: handleDocumentBodyMentionChange,
    handleKeyDown: handleDocumentBodyMentionKeyDown,
  } = useEntityMentionInput({
    value: body,
    entities: mentionEntities,
    onValueChange: editBody,
  });
  const autoSaveText = useMemo(() => {
    if (!selected) return '';
    if (!title.trim()) return 'Title required';
    if (saveState === 'saving') return 'Saving...';
    if (saveState === 'error') return 'Save failed';
    if (dirty) return 'Autosaves after you pause';
    return 'Saved';
  }, [dirty, saveState, selected, title]);

  useEffect(() => {
    updateDocumentRef.current = onUpdateDocument;
  }, [onUpdateDocument]);

  useEffect(() => {
    latestDraftRef.current = {
      documentId: selected?.id ?? '',
      savedTitle: selected?.title ?? '',
      savedBody: selected?.body ?? '',
      title,
      body,
    };
  }, [body, selected, title]);

  useEffect(
    () => () => {
      const draft = latestDraftRef.current;
      const needsSave =
        draft.documentId &&
        draft.title.trim() &&
        (draft.savedTitle !== draft.title || draft.savedBody !== draft.body);
      if (!needsSave) return;
      void updateDocumentRef
        .current({
          documentId: draft.documentId,
          title: draft.title,
          body: draft.body,
        })
        .catch(() => undefined);
    },
    [],
  );

  const saveDocument = useCallback(async (): Promise<void> => {
    if (!selected || !title.trim()) return;
    const requestId = saveRequestRef.current + 1;
    saveRequestRef.current = requestId;
    const savedTitle = title;
    const savedBody = body;
    setBusy(true);
    setSaveState('saving');
    try {
      const document = await onUpdateDocument({
        documentId: selected.id,
        title: savedTitle,
        body: savedBody,
      });
      if (saveRequestRef.current !== requestId) return;
      setSelected(document);
      const latest = latestDraftRef.current;
      if (
        latest.documentId === document.id &&
        latest.title === savedTitle &&
        latest.body === savedBody
      ) {
        setTitle(document.title);
        setBody(document.body);
        setSaveState('saved');
      } else {
        setSaveState('idle');
      }
    } catch (reason) {
      if (saveRequestRef.current === requestId) setSaveState('error');
      throw reason;
    } finally {
      if (saveRequestRef.current === requestId) setBusy(false);
    }
  }, [body, onUpdateDocument, selected, title]);

  useEffect(() => {
    if (!selected || !dirty || busy || !title.trim()) return;
    const timeout = window.setTimeout(() => void saveDocument(), 800);
    return () => window.clearTimeout(timeout);
  }, [busy, dirty, saveDocument, selected, title]);

  async function openDocument(documentId: string): Promise<void> {
    if (selected?.id === documentId) return;
    if (dirty && title.trim()) await saveDocument();
    setBusy(true);
    try {
      const document = await onOpenDocument(documentId);
      setSelected(document);
      setTitle(document.title);
      setBody(document.body);
      setCommentAnchor(null);
      setActiveCommentId('');
      setSaveState('idle');
    } finally {
      setBusy(false);
    }
  }

  async function createDocument(): Promise<void> {
    if (dirty && title.trim()) await saveDocument();
    setBusy(true);
    try {
      const document = await onCreateDocument({
        title: 'Untitled document',
        body: '# Untitled document\n',
      });
      setSelected(document);
      setTitle(document.title);
      setBody(document.body);
      setCommentAnchor(null);
      setActiveCommentId('');
      setSaveState('idle');
    } finally {
      setBusy(false);
    }
  }

  async function deleteDocument(): Promise<void> {
    if (!selected) return;
    setBusy(true);
    try {
      await onDeleteDocument({ documentId: selected.id });
      setSelected(null);
      setCommentAnchor(null);
      setActiveCommentId('');
      setDeleteOpen(false);
      setSaveState('idle');
    } finally {
      setBusy(false);
    }
  }

  async function backToConversation(): Promise<void> {
    if (dirty && title.trim()) await saveDocument();
    onBack();
  }

  function editTitle(value: string): void {
    setTitle(value);
    if (saveState === 'error' || saveState === 'saved') setSaveState('idle');
  }

  function editBody(value: string): void {
    setBody(value);
    if (saveState === 'error' || saveState === 'saved') setSaveState('idle');
  }

  function captureEditorSelection(event: React.SyntheticEvent<HTMLTextAreaElement>): void {
    const element = event.currentTarget;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    setActiveCommentId('');
    setCommentAnchor(normalizeCommentAnchor(element.value.slice(start, end), start, end));
  }

  function capturePreviewSelection(): void {
    const selectedText = window.getSelection()?.toString() ?? '';
    const trimmedText = selectedText.trim();
    if (!trimmedText) {
      setCommentAnchor(null);
      return;
    }
    const start = body.indexOf(trimmedText);
    setActiveCommentId('');
    setCommentAnchor(
      normalizeCommentAnchor(
        trimmedText,
        Math.max(start, 0),
        Math.max(start, 0) + trimmedText.length,
      ),
    );
  }

  function showCommentAnchor(comment: DocumentCommentListItem): void {
    if (!comment.anchorText) return;
    setActiveCommentId(comment.id);
    const start = Math.min(comment.anchorStart, body.length);
    const end = Math.min(Math.max(comment.anchorEnd, start), body.length);
    documentBodyMentionRef.current?.focus();
    documentBodyMentionRef.current?.setSelectionRange(start, end);
  }

  function showCommentAnchorById(commentId: string): void {
    const comment = selectedComments.find((item) => item.id === commentId);
    if (comment) showCommentAnchor(comment);
  }

  async function sendDocumentToAgent(): Promise<void> {
    if (!selected || !onSendToAgent || !canSendToAgent) return;
    if (dirty && title.trim()) await saveDocument();
    await onSendToAgent(documentAgentPrompt({ ...selected, title, body }));
  }

  async function sendCommentToAgent(
    comment: Pick<DocumentCommentListItem, 'body' | 'anchorText' | 'anchorStart' | 'anchorEnd'>,
  ): Promise<void> {
    if (!selected || !onSendToAgent || !canSendToAgent) return;
    if (dirty && title.trim()) await saveDocument();
    await onSendToAgent(
      documentCommentAgentPrompt({ document: { ...selected, title, body }, comment }),
    );
  }

  return (
    <ResourceShell
      sidebar={
        <div className="flex h-full min-h-0 flex-col px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Docs
            </h2>
            <Button size="sm" onClick={() => void createDocument()}>
              <Plus data-icon="inline-start" />
              New
            </Button>
          </div>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search docs"
              value={query}
              onChange={(event) => onQueryChange?.(event.target.value)}
              placeholder="Search docs"
              className="liquid-glass-control h-9 rounded-lg pl-9"
            />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <section>
              <h3 className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">Documents</h3>
              <div className="flex flex-col gap-0.5">
                {documents.map((document) => (
                  <DocumentListButton
                    key={document.id}
                    document={document}
                    taskLabel={taskNames.get(document.taskId) ?? 'Unlinked'}
                    selected={selected?.id === document.id}
                    onOpen={() => void openDocument(document.id)}
                  />
                ))}
                {documents.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No documents found.
                  </div>
                ) : null}
              </div>
            </section>
          </ScrollArea>
        </div>
      }
    >
      <section className="liquid-float-card grid h-full min-h-0 grid-cols-1 gap-0 overflow-hidden rounded-lg border py-0 ring-0">
        {selected ? (
          <div className="flex min-h-0 flex-col">
            <header className="flex h-[70px] shrink-0 items-center px-6">
              <div className="min-w-0 flex-1">
                <Input
                  aria-label="Document title"
                  value={title}
                  className="h-8 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
                  onChange={(event) => editTitle(event.target.value)}
                />
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Markdown document</span>
                  <span className="size-1 rounded-full bg-muted-foreground/60" />
                  <span>
                    {selected.taskId ? (taskNames.get(selected.taskId) ?? 'Task') : 'Unlinked'}
                  </span>
                  <span className="size-1 rounded-full bg-muted-foreground/60" />
                  <span>
                    {selectedComments.length}{' '}
                    {selectedComments.length === 1 ? 'comment' : 'comments'}
                  </span>
                  <span className="size-1 rounded-full bg-muted-foreground/60" />
                  <span>{autoSaveText}</span>
                </div>
              </div>
              <div className="ml-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canSendToAgent || busy}
                  title={`Send to ${agentName}`}
                  onClick={() => void sendDocumentToAgent()}
                >
                  <Send data-icon="inline-start" />
                  Send to Agent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void onRevealDocument(selected.id)}
                >
                  <FolderOpen data-icon="inline-start" />
                  Show file
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete document"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                </Button>
              </div>
            </header>
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)_300px] border-t max-xl:grid-cols-1">
              <section className="flex min-h-0 flex-col border-r max-lg:border-b max-lg:border-r-0">
                <div className="flex h-9 shrink-0 items-center justify-between px-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Editor</span>
                  <EntityMentionButton
                    open={documentBodyMentionOpen}
                    options={documentBodyMentionOptions}
                    onOpen={openDocumentBodyMentionPicker}
                    onInsert={insertDocumentBodyMention}
                  />
                </div>
                <Textarea
                  ref={documentBodyMentionRef}
                  aria-label="Document markdown"
                  value={body}
                  className="min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent px-5 py-3 font-mono text-[13px] leading-6 shadow-none focus-visible:ring-0 dark:bg-transparent"
                  onChange={handleDocumentBodyMentionChange}
                  onKeyDown={handleDocumentBodyMentionKeyDown}
                  onMouseUp={captureEditorSelection}
                  onKeyUp={captureEditorSelection}
                />
              </section>
              <section className="flex min-h-0 flex-col bg-muted/10">
                <div className="flex h-9 shrink-0 items-center px-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Preview
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  <div className="px-5 py-4" onMouseUp={capturePreviewSelection}>
                    <MarkdownPreview
                      body={body}
                      commentAnchors={selectedComments}
                      activeCommentId={activeCommentId}
                      mentionEntities={mentionEntities}
                      onShowAnchor={showCommentAnchorById}
                      onOpenEntity={onOpenEntity}
                    />
                  </div>
                </ScrollArea>
              </section>
              <DocumentCommentsPanel
                comments={selectedComments}
                documentId={selected.id}
                anchor={commentAnchor}
                busy={busy}
                onCreate={onCreateDocumentComment}
                onUpdate={onUpdateDocumentComment}
                onDelete={onDeleteDocumentComment}
                onClearAnchor={() => setCommentAnchor(null)}
                activeCommentId={activeCommentId}
                onShowAnchor={showCommentAnchor}
                canSendToAgent={canSendToAgent}
                onSendDraftToAgent={sendCommentToAgent}
                onSendCommentToAgent={sendCommentToAgent}
                mentionEntities={mentionEntities}
                onOpenEntity={onOpenEntity}
              />
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-col">
            <header className="flex h-[70px] shrink-0 items-center px-6">
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold">Docs</h1>
                <div className="mt-1 text-sm text-muted-foreground">
                  {documents.length} documents in this workspace
                </div>
              </div>
              <Button
                variant="outline"
                className="ml-auto"
                onClick={() => void backToConversation()}
              >
                Back to conversation
              </Button>
            </header>
            <div className="grid min-h-0 flex-1 place-items-center border-t text-sm text-muted-foreground">
              Create or select a document.
            </div>
          </div>
        )}
      </section>
      <DeleteResourceDialog
        open={deleteOpen}
        title="Delete document"
        description="This removes the document Markdown file from local storage."
        itemTitle={title}
        busy={busy}
        onOpenChange={setDeleteOpen}
        onDelete={deleteDocument}
      />
    </ResourceShell>
  );
}

/**
 * DocumentCommentsPanel keeps comment creation and per-comment editing local while persistence flows through the workspace API.
 */
function DocumentCommentsPanel({
  comments,
  documentId,
  anchor,
  busy,
  onCreate,
  onUpdate,
  onDelete,
  onClearAnchor,
  activeCommentId,
  onShowAnchor,
  canSendToAgent,
  onSendDraftToAgent,
  onSendCommentToAgent,
  mentionEntities = [],
  onOpenEntity,
}: {
  comments: DocumentCommentListItem[];
  documentId: string;
  anchor: DocumentCommentAnchor | null;
  busy: boolean;
  onCreate?: (input: CreateDocumentCommentInput) => Promise<void>;
  onUpdate?: (input: UpdateDocumentCommentInput) => Promise<void>;
  onDelete?: (input: DeleteDocumentCommentInput) => Promise<void>;
  onClearAnchor: () => void;
  activeCommentId: string;
  onShowAnchor: (comment: DocumentCommentListItem) => void;
  canSendToAgent: boolean;
  onSendDraftToAgent: (
    comment: Pick<DocumentCommentListItem, 'body' | 'anchorText' | 'anchorStart' | 'anchorEnd'>,
  ) => Promise<void>;
  onSendCommentToAgent: (comment: DocumentCommentListItem) => Promise<void>;
  mentionEntities?: WorkspaceEntity[];
  onOpenEntity?: (entity: WorkspaceEntityRef) => void;
}): React.JSX.Element {
  const [body, setBody] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const {
    textareaRef: newCommentMentionRef,
    mentionOpen: newCommentMentionOpen,
    mentionOptions: newCommentMentionOptions,
    openMentionPicker: openNewCommentMentionPicker,
    insertMention: insertNewCommentMention,
    handleChange: handleNewCommentMentionChange,
    handleKeyDown: handleNewCommentMentionKeyDown,
  } = useEntityMentionInput({
    value: body,
    entities: mentionEntities,
    onValueChange: setBody,
  });
  const disabled = busy || commentBusy;

  async function createComment(sendToAgent = false): Promise<void> {
    if (!body.trim() || !onCreate) return;
    setCommentBusy(true);
    try {
      const input: CreateDocumentCommentInput = {
        documentId,
        body,
      };
      if (anchor) {
        input.anchorText = anchor.anchorText;
        input.anchorStart = anchor.anchorStart;
        input.anchorEnd = anchor.anchorEnd;
      }
      await onCreate(input);
      if (sendToAgent) {
        await onSendDraftToAgent({
          body,
          anchorText: anchor?.anchorText ?? '',
          anchorStart: anchor?.anchorStart ?? 0,
          anchorEnd: anchor?.anchorEnd ?? 0,
        });
      }
      setBody('');
      onClearAnchor();
    } finally {
      setCommentBusy(false);
    }
  }

  return (
    <aside className="flex min-h-0 flex-col border-l bg-background/20 max-xl:border-l-0 max-xl:border-t">
      <div className="flex h-9 shrink-0 items-center gap-2 px-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <MessageSquare className="size-3.5" />
        Comments
      </div>
      <div className="border-b px-5 pb-4">
        {anchor?.anchorText ? (
          <div className="mb-3 rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Selected text
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Clear selected text"
                onClick={onClearAnchor}
              >
                <X />
              </Button>
            </div>
            <blockquote className="line-clamp-4 border-l-2 border-[color:var(--status-active)] pl-3 text-muted-foreground">
              {anchor.anchorText}
            </blockquote>
          </div>
        ) : null}
        <Textarea
          ref={newCommentMentionRef}
          aria-label="New document comment"
          value={body}
          placeholder="Add a comment..."
          className="min-h-20 resize-none rounded-lg bg-background/40 text-sm"
          onChange={handleNewCommentMentionChange}
          onKeyDown={handleNewCommentMentionKeyDown}
        />
        <div className="mt-2 flex justify-end">
          <EntityMentionButton
            className="mr-auto"
            ariaLabel="Mention entity in comment"
            open={newCommentMentionOpen}
            options={newCommentMentionOptions}
            onOpen={openNewCommentMentionPicker}
            onInsert={insertNewCommentMention}
          />
          {canSendToAgent ? (
            <Button
              className="mr-2"
              variant="outline"
              size="sm"
              disabled={!body.trim() || disabled || !onCreate}
              onClick={() => void createComment(true)}
            >
              <Bot data-icon="inline-start" />@ Agent
            </Button>
          ) : null}
          <Button
            size="sm"
            disabled={!body.trim() || disabled || !onCreate}
            onClick={() => void createComment()}
          >
            <Plus data-icon="inline-start" />
            Add comment
          </Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 px-5 py-4">
          {comments.map((comment) => (
            <DocumentCommentRow
              key={comment.id}
              comment={comment}
              busy={disabled}
              active={activeCommentId === comment.id}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onShowAnchor={onShowAnchor}
              canSendToAgent={canSendToAgent}
              onSendToAgent={onSendCommentToAgent}
              mentionEntities={mentionEntities}
              onOpenEntity={onOpenEntity}
            />
          ))}
          {comments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No comments yet.
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
}

// DocumentCommentRow owns local edit state for a single comment so list updates stay focused.
function DocumentCommentRow({
  comment,
  busy,
  active,
  onUpdate,
  onDelete,
  onShowAnchor,
  canSendToAgent,
  onSendToAgent,
  mentionEntities,
  onOpenEntity,
}: {
  comment: DocumentCommentListItem;
  busy: boolean;
  active: boolean;
  onUpdate?: (input: UpdateDocumentCommentInput) => Promise<void>;
  onDelete?: (input: DeleteDocumentCommentInput) => Promise<void>;
  onShowAnchor: (comment: DocumentCommentListItem) => void;
  canSendToAgent: boolean;
  onSendToAgent: (comment: DocumentCommentListItem) => Promise<void>;
  mentionEntities: WorkspaceEntity[];
  onOpenEntity?: (entity: WorkspaceEntityRef) => void;
}): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const resolved = comment.status === 'resolved';
  const {
    textareaRef: editCommentMentionRef,
    mentionOpen: editCommentMentionOpen,
    mentionOptions: editCommentMentionOptions,
    openMentionPicker: openEditCommentMentionPicker,
    insertMention: insertEditCommentMention,
    handleChange: handleEditCommentMentionChange,
    handleKeyDown: handleEditCommentMentionKeyDown,
  } = useEntityMentionInput({
    value: body,
    entities: mentionEntities,
    onValueChange: setBody,
  });

  async function saveComment(nextStatus = comment.status): Promise<void> {
    if (!body.trim() || !onUpdate) return;
    await onUpdate({ commentId: comment.id, body, status: nextStatus });
    setEditing(false);
  }

  function cancelEdit(): void {
    setBody(comment.body);
    setEditing(false);
  }

  return (
    <article
      className={cn(
        'rounded-lg border bg-background/35 p-3 text-sm',
        active && 'border-amber-300/70 bg-amber-400/10',
        resolved && 'border-dashed opacity-75',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{comment.authorName}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {resolved ? 'Resolved' : 'Open'}
          </div>
        </div>
        <div className="flex gap-1">
          {canSendToAgent ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Send comment to Agent"
              disabled={busy}
              onClick={() => void onSendToAgent(comment)}
            >
              <Bot />
            </Button>
          ) : null}
          {comment.anchorText ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Show comment anchor"
              disabled={busy}
              onClick={() => onShowAnchor(comment)}
            >
              <LocateFixed />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={resolved ? 'Reopen comment' : 'Resolve comment'}
            disabled={busy || !onUpdate}
            onClick={() => void saveComment(resolved ? 'open' : 'resolved')}
          >
            <CheckCircle2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit comment"
            disabled={busy || comment.repairStatus !== 'ok'}
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete comment"
            disabled={busy || !onDelete}
            onClick={() => onDelete && void onDelete({ commentId: comment.id })}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      {editing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            ref={editCommentMentionRef}
            aria-label="Edit document comment"
            value={body}
            className="min-h-20 resize-none text-sm"
            onChange={handleEditCommentMentionChange}
            onKeyDown={handleEditCommentMentionKeyDown}
          />
          <EntityMentionButton
            ariaLabel="Mention entity in comment"
            open={editCommentMentionOpen}
            options={editCommentMentionOptions}
            onOpen={openEditCommentMentionPicker}
            onInsert={insertEditCommentMention}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!body.trim() || busy || !onUpdate}
              onClick={() => void saveComment()}
            >
              <Save data-icon="inline-start" />
              Save comment
            </Button>
            <Button variant="outline" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {comment.anchorText ? (
            <button
              type="button"
              className="mt-3 w-full border-l-2 border-[color:var(--status-active)] pl-3 text-left text-xs text-muted-foreground transition hover:text-foreground"
              onClick={() => onShowAnchor(comment)}
            >
              {comment.anchorText}
            </button>
          ) : null}
          <EntityMarkdown
            body={comment.body}
            className="mt-3 whitespace-pre-wrap text-muted-foreground"
            mentionEntities={mentionEntities}
            onOpenEntity={onOpenEntity}
          />
        </>
      )}
      {comment.repairStatus === 'needs_repair' ? (
        <Badge className="mt-3" variant="destructive">
          Repair
        </Badge>
      ) : null}
    </article>
  );
}

function DocumentListButton({
  document,
  taskLabel,
  selected,
  onOpen,
}: {
  document: DocumentListItem;
  taskLabel: string;
  selected: boolean;
  onOpen: () => void;
}): React.JSX.Element {
  return (
    <button
      aria-label={document.title}
      className={cn(
        'group flex min-h-14 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition hover:bg-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        selected && 'liquid-glass-control text-accent-foreground ring-1 ring-inset ring-border',
      )}
      onClick={onOpen}
    >
      <span
        className={cn(
          'h-8 w-1 rounded-full bg-transparent',
          selected && 'bg-[color:var(--status-active)]',
        )}
      />
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{document.title}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{taskLabel}</span>
      </span>
      {document.repairStatus === 'needs_repair' ? (
        <Badge variant="destructive">Repair</Badge>
      ) : null}
    </button>
  );
}

export { DocumentsPage, MarkdownPreview };
