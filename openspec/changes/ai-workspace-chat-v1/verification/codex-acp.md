# Codex ACP Verification

- Status: skipped
- Checked at: 2026-04-30T00:47:03.705Z
- Workspace: /Users/chenli/projects/f5
- Platform: darwin

## Candidates

- codex-acp: `codex-acp`
  - Status: missing
  - Detail: `codex-acp` was not found on PATH.
- codex-cli: `codex --help`
  - Status: unsupported
  - Detail: `codex --help` does not expose an ACP-compatible mode.
- zed-registry: `/Users/chenli/.config/zed/settings.json`
  - Status: found
  - Detail: Zed settings include a codex-acp registry hint. This is evidence only, not a runnable command.

Result: no runnable real Codex ACP adapter completed a prompt smoke. Agent execution remains unavailable until a real adapter is configured.
