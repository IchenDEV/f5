import React, { useState } from 'react';
import { AgentAvatar } from '@/app/workbench-primitives';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { connectionState } from '@/features/chat/connection-state';
import { f5Api } from '@/lib/f5-api';
import { cn } from '@/lib/utils';
import type {
  AgentConfig,
  AgentConnectionTestResult,
  UpdateProfileInput,
  WorkspaceSnapshot,
} from '../../shared/types';

type ThemePreference = UpdateProfileInput['theme'];
type IconThemePreference = UpdateProfileInput['iconTheme'];

// Agents page lists every configured local agent with command, availability, and profile access.
function AgentsPage({
  agents,
  onBack,
  onOpenAgent,
}: {
  agents: AgentConfig[];
  onBack: () => void;
  onOpenAgent: () => void;
}): React.JSX.Element {
  return (
    <ProfileShell title="Agents" onBack={onBack}>
      <CardContent className="space-y-3">
        {agents.map((agent) => {
          const connection = connectionState(agent);
          return (
            <div key={agent.id} className="rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex items-start gap-3">
                <AgentAvatar agentName={agent.name} className="size-10" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{agent.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                    <span className={cn('size-2 rounded-full', connection.dotClass)} />
                    {connection.label}
                  </div>
                  <div className="mt-2 truncate text-muted-foreground">
                    {[agent.command, ...agent.args].join(' ')}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={onOpenAgent}>
                  View
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </ProfileShell>
  );
}

// User profile page keeps editable local settings aligned with the JSON profile stored in the workspace.
function UserProfilePage({
  snapshot,
  onBack,
  onSave,
  onThemePreview,
  onIconThemePreview,
  iconPreviewUrl,
}: {
  snapshot: WorkspaceSnapshot;
  onBack: () => void;
  onSave: (input: UpdateProfileInput) => void;
  onThemePreview: (theme: ThemePreference) => void;
  onIconThemePreview: (theme: IconThemePreference) => void;
  iconPreviewUrl: string;
}): React.JSX.Element {
  const [displayName, setDisplayName] = useState(snapshot.profile.displayName);
  const [defaultAgentId, setDefaultAgentId] = useState(snapshot.profile.defaultAgentId);
  const [theme, setTheme] = useState(snapshot.profile.theme);
  const [iconTheme, setIconTheme] = useState(snapshot.profile.iconTheme);

  function saveProfile(nextTheme = theme, nextIconTheme = iconTheme): void {
    onSave({
      displayName: displayName.trim() || snapshot.profile.displayName,
      defaultAgentId,
      theme: nextTheme,
      iconTheme: nextIconTheme,
    });
  }

  return (
    <ProfileShell title="User Profile" onBack={onBack}>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[160px_1fr] gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
          <span className="self-center text-muted-foreground">Display name</span>
          <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </div>
        <ProfileRow label="Workspace path" value={snapshot.workspacePath} />
        <div className="grid grid-cols-[160px_1fr] gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
          <span className="self-center text-muted-foreground">Default agent</span>
          <Select value={defaultAgentId} onValueChange={setDefaultAgentId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose default agent" />
            </SelectTrigger>
            <SelectContent>
              {snapshot.agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-[160px_1fr] gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
          <span className="self-center text-muted-foreground">Theme</span>
          <Select
            value={theme}
            onValueChange={(value: ThemePreference) => {
              setTheme(value);
              onThemePreview(value);
              saveProfile(value, iconTheme);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-[160px_1fr] gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
          <span className="self-center text-muted-foreground">App icon</span>
          <div className="flex items-center gap-3">
            <img
              src={iconPreviewUrl}
              alt=""
              aria-hidden="true"
              className="size-9 shrink-0 rounded-lg border bg-background object-cover shadow-sm"
            />
            <Select
              value={iconTheme}
              onValueChange={(value: IconThemePreference) => {
                setIconTheme(value);
                onIconThemePreview(value);
                saveProfile(theme, value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose icon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => saveProfile()}>Save changes</Button>
          <Button variant="outline" onClick={() => void f5Api.workspace.reveal()}>
            Show workspace folder
          </Button>
        </div>
      </CardContent>
    </ProfileShell>
  );
}

// Agent profile page shows adapter details and runs the lightweight connection check exposed by the main process.
function AgentProfilePage({
  agent,
  onBack,
}: {
  agent?: AgentConfig;
  onBack: () => void;
}): React.JSX.Element {
  const [result, setResult] = useState<AgentConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  async function runTest(): Promise<void> {
    if (!agent) return;
    setTesting(true);
    try {
      setResult(await f5Api.agents.testConnection(agent.id));
    } finally {
      setTesting(false);
    }
  }

  return (
    <ProfileShell title="Agent Profile" onBack={onBack}>
      <CardContent className="space-y-4">
        <ProfileRow label="Name" value={agent?.name ?? 'No agent'} />
        <ProfileRow label="Command" value={agent?.command ?? ''} />
        <ProfileRow label="Args" value={agent?.args.join(' ') ?? ''} />
        <ProfileRow label="Working directory" value={agent?.cwd ?? ''} />
        <ProfileRow label="Availability" value={agent?.availability ?? 'unavailable'} />
        <ProfileRow label="Protocol" value={agent?.protocolVersion ?? 'Not initialized'} />
        {agent?.id === 'codex-acp-real' ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            Codex ACP discovery appears here after `pnpm smoke:codex-acp` writes verification
            evidence.
          </div>
        ) : null}
        {result ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="font-medium">
              {result.ok ? 'Connection test passed' : 'Connection test did not run'}
            </div>
            <div className="mt-1 text-muted-foreground">{result.detail}</div>
          </div>
        ) : null}
        <Button variant="outline" disabled={!agent || testing} onClick={() => void runTest()}>
          {testing ? 'Testing...' : 'Test connection'}
        </Button>
      </CardContent>
    </ProfileShell>
  );
}

function ProfileShell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="flex h-full min-h-0 justify-center overflow-hidden">
      <Card className="liquid-float-card h-full w-full max-w-[1440px] overflow-hidden rounded-lg border ring-0">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Local workspace settings and connection details.</CardDescription>
          <CardAction>
            <Button variant="outline" onClick={onBack}>
              Back to conversation
            </Button>
          </CardAction>
        </CardHeader>
        {children}
      </Card>
    </section>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

export { AgentProfilePage, AgentsPage, UserProfilePage };
