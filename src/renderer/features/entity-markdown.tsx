import React, { useMemo } from 'react';
import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import {
  parseWorkspaceEntityUri,
  workspaceEntityDisplayMarkdown,
  workspaceEntityKindLabel,
  workspaceEntityUri,
} from '../../shared/workspace-entities';
import type { WorkspaceEntity, WorkspaceEntityRef } from '../../shared/types';
import { textFromReactNode } from '@/features/react-node-text';
import { cn } from '@/lib/utils';

type MarkdownAnchorProps = React.ComponentPropsWithoutRef<'a'> & {
  node?: unknown;
};

const entitySanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: [...(defaultSchema.protocols?.href ?? []), 'f5'],
  },
};

export interface EntityMarkdownProps {
  body: string;
  className?: string;
  emptyText?: string;
  components?: Components;
  mentionEntities?: WorkspaceEntity[];
  onOpenEntity?: (entity: WorkspaceEntityRef) => void;
}

// EntityMarkdown keeps the same Markdown pipeline everywhere and upgrades f5 links into chips.
function EntityMarkdown({
  body,
  className,
  emptyText = '',
  components,
  mentionEntities = [],
  onOpenEntity,
}: EntityMarkdownProps): React.JSX.Element {
  const normalizedBody = useMemo(() => workspaceEntityDisplayMarkdown(body), [body]);
  const markdownComponents = useMemo<Components>(() => {
    const customLink = components?.a;
    return {
      ...components,
      a(anchorProps) {
        const entityLink = entityLinkElement(anchorProps, mentionEntities, onOpenEntity);
        if (entityLink) return entityLink;
        return typeof customLink === 'function'
          ? React.createElement(customLink, anchorProps)
          : defaultLinkElement(anchorProps);
      },
    };
  }, [components, mentionEntities, onOpenEntity]);

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, entitySanitizeSchema]]}
        components={markdownComponents}
        urlTransform={workspaceUrlTransform}
      >
        {normalizedBody || emptyText}
      </ReactMarkdown>
    </div>
  );
}

function entityLinkElement(
  props: MarkdownAnchorProps,
  entities: WorkspaceEntity[],
  onOpenEntity?: (entity: WorkspaceEntityRef) => void,
): React.JSX.Element | null {
  const parsed = props.href ? parseWorkspaceEntityUri(props.href) : null;
  if (!parsed) return null;
  const entity = entities.find(
    (candidate) => candidate.kind === parsed.kind && candidate.id === parsed.id,
  );
  const label = entity?.label || textFromReactNode(props.children) || parsed.id;
  const ref: WorkspaceEntityRef = {
    ...parsed,
    label,
    uri: workspaceEntityUri(parsed.kind, parsed.id),
  };
  return (
    <button
      type="button"
      aria-label={`Open ${workspaceEntityKindLabel(parsed.kind)}: ${label}`}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md border bg-muted/70 px-1.5 py-0.5 align-baseline text-xs font-medium text-foreground transition hover:bg-muted',
        !entity && 'border-dashed text-muted-foreground',
      )}
      title={entity?.subtitle ?? ref.uri}
      onClick={() => onOpenEntity?.(ref)}
    >
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
        {workspaceEntityKindLabel(parsed.kind)}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

function defaultLinkElement(props: MarkdownAnchorProps): React.JSX.Element {
  return <a href={props.href}>{props.children}</a>;
}

function workspaceUrlTransform(url: string): string {
  return parseWorkspaceEntityUri(url) ? url : defaultUrlTransform(url);
}

export { EntityMarkdown };
