import { AtSign } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { workspaceEntityKindLabel } from '../../shared/workspace-entities';
import type { WorkspaceEntity } from '../../shared/types';

// EntityMentionButton renders the same compact picker regardless of which textarea owns insertion.
function EntityMentionButton({
  open,
  options,
  onOpen,
  onInsert,
  className,
  ariaLabel = 'Mention entity',
}: {
  open: boolean;
  options: WorkspaceEntity[];
  onOpen: () => void;
  onInsert: (entity: WorkspaceEntity) => void;
  className?: string;
  ariaLabel?: string;
}): React.JSX.Element {
  return (
    <div className={cn('relative', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={onOpen}
      >
        <AtSign />
      </Button>
      {open ? (
        <div className="absolute bottom-9 left-0 z-50 flex w-80 flex-col rounded-lg bg-popover p-1.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {options.length ? (
              options.map((entity) => (
                <button
                  key={`${entity.kind}:${entity.id}`}
                  type="button"
                  aria-label={`${workspaceEntityKindLabel(entity.kind)} ${entity.label}`}
                  className="grid w-full grid-cols-[72px_minmax(0,1fr)] gap-x-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  onClick={() => onInsert(entity)}
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {workspaceEntityKindLabel(entity.kind)}
                  </span>
                  <span className="truncate font-medium">{entity.label}</span>
                  <span className="col-start-2 truncate text-xs text-muted-foreground">
                    {entity.subtitle}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-2 py-3 text-sm text-muted-foreground">No entities found.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { EntityMentionButton };
