import { Check } from 'lucide-react';
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { agentInitials, userInitials } from '@/app/workbench-names';
import { cn } from '@/lib/utils';
import type { PlanStep } from '../../shared/types';

export function UserAvatar({
  displayName,
  className,
}: {
  displayName: string;
  className?: string;
}): React.JSX.Element {
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-background/80 text-foreground">
        {userInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  );
}

export function AgentAvatar({
  agentName,
  className,
}: {
  agentName: string;
  className?: string;
}): React.JSX.Element {
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-emerald-100 text-emerald-700">
        {agentInitials(agentName)}
      </AvatarFallback>
    </Avatar>
  );
}

export function StatusDot({ status }: { status: PlanStep['status'] }): React.JSX.Element {
  if (status === 'completed') {
    return (
      <span className="grid size-4 place-items-center rounded-full bg-[color:var(--status-connected)] text-white">
        <Check className="size-3" />
      </span>
    );
  }
  if (status === 'active')
    return <span className="size-4 rounded-full border-2 border-[color:var(--status-active)]" />;
  if (status === 'failed') return <span className="size-4 rounded-full bg-destructive" />;
  return <span className="size-4 rounded-full border border-muted-foreground/40" />;
}

export function IconButton({
  label,
  icon: Icon,
  className,
  iconClassName,
  pressed,
  variant = 'ghost',
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  iconClassName?: string;
  pressed?: boolean;
  variant?: 'ghost' | 'outline';
  onClick?: () => void;
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          className={cn('shrink-0', className)}
          onClick={onClick}
        >
          <Icon className={iconClassName} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
