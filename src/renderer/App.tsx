import React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WorkspaceApp } from '@/app/workspace-app';

export function App(): React.JSX.Element {
  return (
    <TooltipProvider>
      <WorkspaceApp />
    </TooltipProvider>
  );
}

export { ChatComposer } from '@/features/chat/chat-workspace';
