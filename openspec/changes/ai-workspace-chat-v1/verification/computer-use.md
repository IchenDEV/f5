# Computer Use Verification

- Status: passed
- App: Electron `com.github.Electron`
- URL: `localhost:5173`
- Checked at: 2026-04-30 04:24 Asia/Singapore

## Evidence

- Opened the real Electron app and inspected the accessibility tree.
- Created `Computer Use Market Brief` through the new conversation dialog.
- Confirmed the header, timeline, Markdown body, plan rows, tool rows, and session panel update when switching conversations.
- Created `Computer Use Switch Target` through the real new conversation dialog and switched back to `Computer Use Market Brief`; Computer Use confirmed the active row, chat header, timeline, and right Agent panel changed together.
- Confirmed the Codex CLI agent shows `Codex CLI Ready` and `Session ID: Not applicable`, so old ACP state cannot be mistaken for a live Codex CLI session.
- Opened the Agent Profile page from the right panel and ran `Test connection`; the configured real agent connection status was visible.
- Opened the User Profile page from the bottom avatar, edited the display name, and saved profile settings.
- Closed and restored the right Agent progress panel.
- Captured desktop screenshot: `verification/screenshots/desktop.png`.
- Captured narrow renderer screenshot: `verification/screenshots/narrow.png`.

## Fixes Found During Verification

- Fixed atomic write temp filename collisions by adding a UUID suffix before rename.
- Changed Codex CLI session display to `Not applicable` because Codex CLI does not create an ACP session id.

## Notes

- Real Codex ACP remained skipped because no runnable `codex-acp` command was available on this machine.
- The required product path uses the real installed Codex CLI.
