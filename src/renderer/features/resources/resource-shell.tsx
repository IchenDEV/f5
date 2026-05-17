import { Trash2 } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ResourceShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-5 overflow-hidden max-lg:grid-cols-1">
      <aside className="min-h-0 bg-transparent">{sidebar}</aside>
      {children}
    </section>
  );
}

export function DeleteResourceDialog({
  open,
  title,
  description,
  itemTitle,
  busy,
  onOpenChange,
  onDelete,
}: {
  open: boolean;
  title: string;
  description: string;
  itemTitle: string;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => Promise<void>;
}): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/30 p-4 text-sm font-medium">{itemTitle}</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={busy} onClick={() => void onDelete()}>
            <Trash2 data-icon="inline-start" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
