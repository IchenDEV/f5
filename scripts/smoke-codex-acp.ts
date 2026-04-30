import { mkdir, writeFile } from 'node:fs/promises';
import { platform } from 'node:os';
import { join } from 'node:path';
import type { CodexCandidateResult, CodexSmokeResult } from '../src/shared/types';
import { AcpStdioClient } from '../electron/main/acp-client';
import { discoverCodexAcp } from '../electron/main/codex-acp-discovery';

const repoRoot = process.cwd();
const verificationDir = join(repoRoot, 'openspec/changes/ai-workspace-chat-v1/verification');
const verificationPath = join(verificationDir, 'codex-acp.md');

const candidates: CodexCandidateResult[] = await discoverCodexAcp();

const runnable = candidates.find(
  (candidate) => candidate.source === 'codex-acp' && candidate.status === 'found',
);
let finalStatus: CodexSmokeResult['finalStatus'] = 'skipped';

if (runnable) {
  const client = new AcpStdioClient(runnable.command, runnable.args, repoRoot);
  try {
    const init = await client.initialize();
    const session = await client.createSession();
    const prompt = await client.prompt({
      sessionId: session.sessionId,
      turnId: `turn_codex_${Date.now()}`,
      prompt: 'Reply with one short sentence confirming Codex ACP is connected.',
    });
    runnable.status = prompt.stopReason === 'complete' ? 'passed' : 'prompt_failed';
    runnable.detail = `Initialized ${init.protocolVersion}, session ${session.sessionId}, stopReason ${prompt.stopReason}.`;
    finalStatus = runnable.status === 'passed' ? 'passed' : 'failed';
  } catch (error) {
    runnable.status = 'handshake_failed';
    runnable.detail = error instanceof Error ? error.message : String(error);
    finalStatus = 'failed';
  } finally {
    client.dispose();
  }
}

const result: CodexSmokeResult = {
  finalStatus,
  checkedAt: new Date().toISOString(),
  workspace: repoRoot,
  platform: platform() as NodeJS.Platform,
  candidates,
};

await mkdir(verificationDir, { recursive: true });
await writeFile(verificationPath, renderMarkdown(result), 'utf8');
console.log(JSON.stringify(result, null, 2));

function renderMarkdown(smoke: CodexSmokeResult): string {
  const candidates = smoke.candidates
    .map(
      (candidate) =>
        `- ${candidate.source}: \`${[candidate.command, ...candidate.args].join(' ')}\`\n  - Status: ${candidate.status}\n  - Detail: ${candidate.detail.replaceAll('\n', ' ')}`,
    )
    .join('\n');
  return `# Codex ACP Verification

- Status: ${smoke.finalStatus}
- Checked at: ${smoke.checkedAt}
- Workspace: ${smoke.workspace}
- Platform: ${smoke.platform}

## Candidates

${candidates}

Result: no runnable real Codex ACP adapter completed a prompt smoke. Agent execution remains unavailable until a real adapter is configured.
`;
}
