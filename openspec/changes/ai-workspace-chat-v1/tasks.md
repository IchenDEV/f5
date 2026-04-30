## 0. One-Night MVP Rules

- [x] 0.1 Treat local usable MVP as the first target: workspace UI, Markdown persistence, real ACP chat, queue, profile pages, and verification.
- [x] 0.2 Use `codex-cli-real` as the default agent and keep it runnable through the installed Codex CLI.
- [x] 0.3 Mark real Claude Code or Codex ACP adapter work optional when the command is unavailable.
- [x] 0.4 Keep optional raw logs, advanced export, archived browsing, and advanced settings behind visible placeholder states if time is limited.
- [x] 0.5 Do not claim done until `pnpm check`, `pnpm build`, `pnpm smoke:product`, `pnpm smoke:codex-acp`, and Computer Use verification have evidence.
- [x] 0.6 Treat `pnpm smoke:codex-acp` as required-to-run: it passes when a real Codex ACP prompt succeeds and reports skipped when no runnable adapter exists.

## 1. Data Model And Storage

- [x] 1.1 Add TypeScript types for conversations, messages, agents, turns, queues, plans, and tool calls.
- [x] 1.2 Add fixed dependencies: `gray-matter`, `zod`, `react-markdown`, `remark-gfm`, `rehype-sanitize`, `tailwindcss`, `@tailwindcss/vite`, `shadcn`, `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `lucide-react`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, and `@testing-library/jest-dom`.
- [x] 1.3 Configure `test`, `smoke:product`, `smoke:codex-acp`, and test setup scripts in `package.json`.
- [x] 1.4 Implement workspace directory discovery using Electron `app.getPath('userData')/workspace`.
- [x] 1.5 Implement conversation creation with `conversation.md`, `messages/`, `attachments/`, and `state.json`.
- [x] 1.6 Implement `f5.conversation.v1` frontmatter schema with `zod`.
- [x] 1.7 Implement `f5.message.v1` frontmatter schema with `zod`.
- [x] 1.8 Implement `f5.state.v1`, `f5.agents.v1`, and `profile.json` schemas with `zod`.
- [x] 1.9 Implement message Markdown read/write with `000001-role-msg_id.md` sortable filenames.
- [x] 1.10 Implement atomic file writes with temp file plus rename.
- [x] 1.11 Implement derived `index.json` creation and rebuild from Markdown files.
- [x] 1.12 Add storage tests for create, load, ordering, invalid frontmatter, profile settings, and index rebuild.

## 2. Electron API Boundary

- [x] 2.1 Define a preload API for conversation listing, opening, creation, message sending, queue changes, and agent cancellation.
- [x] 2.2 Implement IPC handlers in the main process for the conversation API.
- [x] 2.3 Add runtime validation for IPC inputs before file or agent operations.
- [x] 2.4 Add renderer-side API wrappers with typed return values and error states.

## 3. ACP Agent Runtime

- [x] 3.1 Add local agent configuration loading from `workspace/agents/agents.json` with default `codex-cli-real`.
- [x] 3.2 Add `codex-acp` with JSON-RPC stdio support for `initialize`, `session/new`, `session/prompt`, and `session/cancel`.
- [x] 3.3 Implement queue state handling so a new prompt is queued while a turn is active.
- [x] 3.4 Implement JSON-RPC over stdio process management for ACP agents.
- [x] 3.5 Implement ACP `initialize` and capability storage.
- [x] 3.6 Implement `session/new` and optional `session/load` based on agent capabilities.
- [x] 3.7 Implement `session/prompt` turn execution and map `session/update` events into local state.
- [x] 3.8 Implement `session/cancel` for active turns.
- [x] 3.9 Mark real adapter configs unavailable when command lookup or initialization fails, while keeping real agent adapter usable.
- [x] 3.10 Add tests for real ACP process messages, stop reasons, plan updates, cancellation, and process failure.
- [x] 3.11 Add the disabled-by-default `codex-acp-real` profile to default `workspace/agents/agents.json` generation.
- [x] 3.12 Implement Codex ACP discovery in main process code with this candidate order: user-configured Codex agent, `codex-acp` shell command, installed `codex` CLI ACP-compatible mode, editor registry hints.
- [x] 3.13 Treat Zed `codex-acp` registry configuration as evidence only; it must not become selectable until a runnable command is resolved.
- [x] 3.14 Record local discovery evidence for this machine: `/Users/chenli/n/bin/codex` exists, `codex --help` has no ACP subcommand, `/Users/chenli/.config/zed/settings.json` has a `codex-acp` registry entry, and shell lookup currently finds no `codex-acp` command.
- [x] 3.15 Implement `scripts/smoke-codex-acp.mjs` so it runs discovery, attempts `initialize` for a runnable Codex ACP adapter, and writes `openspec/changes/ai-workspace-chat-v1/verification/codex-acp.md`.
- [x] 3.16 When Codex ACP handshake succeeds, make `scripts/smoke-codex-acp.mjs` create a temporary Codex-backed conversation, send a short prompt, capture `session/update`, persist Markdown, and mark the evidence file passed.
- [x] 3.17 When Codex ACP discovery or handshake fails, make `scripts/smoke-codex-acp.mjs` write skipped or failed candidate details while leaving real ACP product smoke untouched.
- [x] 3.18 Add unit tests for Codex ACP discovery candidate ordering, Zed hint handling, skipped result, and passed result with a local ACP fixture process.

## 4. Queue And Session State

- [x] 4.1 Implement per-conversation FIFO prompt queue.
- [x] 4.2 Mark messages as queued, active, completed, failed, or cancelled.
- [x] 4.3 Persist runtime state in `state.json` and keep Markdown as the readable source for conversation content.
- [x] 4.4 Continue queued prompts after a turn completes.
- [x] 4.5 Allow removing queued prompts that have not started.

## 5. UI Foundation

- [x] 5.1 Use `assets/ui-concept-v3-light-reference.png` as the default light UI style reference.
- [x] 5.2 Use `assets/ui-concept-v2-dark-reference.png` as the dark mode UI style reference.
- [x] 5.3 Use `assets/ui-concept-v1.png` as the functional element checklist for chat, list, composer, agent panel, and profile entry coverage.
- [x] 5.4 Configure Tailwind CSS v4 in `electron.vite.config.ts` for the renderer and keep global styles in `src/renderer/styles.css`.
- [x] 5.5 Add `components.json` for shadcn/ui with `radix-nova`, `lucide`, `src/renderer/styles.css`, and `@/*` aliases.
- [x] 5.6 Add `src/renderer/lib/utils.ts` with `cn()` using `clsx` and `tailwind-merge`.
- [x] 5.7 Add base shadcn components: `button`, `card`, `dialog`, `sheet`, `dropdown-menu`, `input`, `textarea`, `select`, `tabs`, `badge`, `avatar`, `separator`, `scroll-area`, `tooltip`, `popover`, `progress`, and `skeleton`.
- [x] 5.8 Define shadcn/Tailwind theme variables for default light mode and dark mode surfaces, text, borders, state colors, spacing, radius, shadow, and motion in `src/renderer/styles.css`.
- [x] 5.9 Define shared Tailwind layout patterns for fixed panes, scroll regions, icon buttons, focus rings, and text truncation.
- [x] 5.10 Add static local loading state that covers active, running, queued, failed, and inactive states.
- [x] 5.11 Keep `ui-element-coverage.md` updated as design elements become implemented.

## 6. Navigation And Top Bar UI

- [x] 6.1 Build `NavigationRail` with chat, workspace overview, agents, settings, and user avatar entries.
- [x] 6.2 Add active, hover, focus, disabled, and placeholder states for rail entries.
- [x] 6.3 Wire the bottom avatar to `UserProfilePage`.
- [x] 6.4 Build `TopBar` with app identity, `WorkspaceSearch`, and `QuickComposeButton`.
- [x] 6.5 Wire top search to conversation filtering and keyboard focus.
- [x] 6.6 Wire quick compose to `NewConversationFlow`.
- [x] 6.7 Add accessible names for all rail and top-bar controls.

## 7. Workspace Shell UI

- [x] 7.1 Build `WorkspaceShell` with left rail, conversation pane, chat pane, and agent panel.
- [x] 7.2 Build stable panel width rules matching the concept at desktop size.
- [x] 7.3 Build app-level loading, error, and retry states.
- [x] 7.4 Build shared menu, popover, and modal flows using shadcn `DropdownMenu`, `Popover`, `Dialog`, and `Sheet`.

## 8. New Conversation And Conversation List UI

- [x] 8.1 Build `NewConversationButton` with split dropdown.
- [x] 8.2 Build `NewConversationFlow` with agent selection, optional title, first prompt, cancel, and create actions.
- [x] 8.3 Build recent-agent and quick-template options in the new conversation dropdown.
- [x] 8.4 Build `ConversationList` with today, yesterday, and older groups.
- [x] 8.5 Build `ConversationRow` with title, agent name, status dot, updated time, hover state, and active state.
- [x] 8.6 Build `ConversationSearch` filtering by title and agent name.
- [x] 8.7 Add archived conversations entry separate from the active list.
- [x] 8.8 Verify row height, truncation, and timestamp alignment against the concept.

## 9. Conversation Header And Timeline UI

- [x] 9.1 Build `ChatHeader` with title, agent name, ACP state, and header actions.
- [x] 9.2 Build `ConversationTitleMenu` with details, rename, archive, file location, and delete actions.
- [x] 9.3 Build `ConversationHeaderActions` with star, share/export, and more menu.
- [x] 9.4 Persist title and star changes to conversation metadata.
- [x] 9.5 Build `MessageTimeline` with scroll behavior and bottom padding for the composer.
- [x] 9.6 Build user message blocks with identity, timestamp, and content.
- [x] 9.7 Build streaming agent message blocks with status label and partial content.
- [x] 9.8 Build inline plan summary rows for completed, active, and pending plan steps.
- [x] 9.9 Build source/tool chips inside agent messages.
- [x] 9.10 Build `QueuedPromptCard` with queue position, timestamp, prompt preview, and cancel action.
- [x] 9.11 Add safe Markdown rendering for message body content.
- [x] 9.12 Add empty, failed, interrupted, and completed turn states.

## 10. Chat Composer UI

- [x] 10.1 Build `ChatComposer` fixed to the bottom of the chat pane.
- [x] 10.2 Add composer tabs for Message and Agent context.
- [x] 10.3 Add prompt submit through button and keyboard action.
- [x] 10.4 Add queue-aware submit feedback when the active agent turn is running.
- [x] 10.5 Add active agent selector with connection status.
- [x] 10.6 Add Markdown mode selector or indicator.
- [x] 10.7 Add compact icon entries for attachments, code, and layout-style actions.
- [x] 10.8 Add send split button and define the secondary send action menu.
- [x] 10.9 Verify long input text, disabled state, sending state, and queued state.

## 11. Agent Panel And Profile Pages UI

- [x] 11.1 Build `AgentIdentityCard` with agent mark, name, protocol label, state, and profile action.
- [x] 11.2 Build `PlanStepList` with completed, active, pending, and failed states.
- [x] 11.3 Build `ToolActivityList` with active, queued, completed, and failed tool rows.
- [x] 11.4 Build `AcpSessionDetails` with protocol, session id, connected time, and transport label.
- [x] 11.5 Add raw logs entry for the active conversation or session.
- [x] 11.6 Add panel close and restore controls.
- [x] 11.7 Build `UserProfilePage` from the bottom avatar with user identity, workspace path, default agent, and profile preferences.
- [x] 11.8 Build local editing for display name and default agent.
- [x] 11.9 Build `AgentProfilePage` from `View agent` and `Agent profile` actions.
- [x] 11.10 Build agent connection test with success, failure, protocol version, and capability summary.
- [x] 11.11 Show Codex ACP discovery status on the Codex Agent Profile page: command, args, cwd, availability, last handshake result, capability summary, and last verification time.
- [x] 11.12 Ensure unavailable Codex ACP can be inspected but cannot be chosen as the default agent until a real connection test succeeds.
- [x] 11.13 Ensure profile pages can return to the active conversation while preserving draft composer text.

## 12. Responsive UI

- [x] 12.1 Keep all four desktop regions visible at 1280px and wider.
- [x] 12.2 Collapse the right agent panel behind a toggle at medium width.
- [x] 12.3 Provide toggles for conversation list and agent panel at narrow width.
- [x] 12.4 Verify composer controls remain reachable while resizing.
- [x] 12.5 Verify long titles, agent names, tool names, and message metadata do not overlap adjacent controls.

## 13. Verification

- [x] 13.1 Run `pnpm check`.
- [x] 13.2 Run `pnpm build`.
- [x] 13.3 Run `pnpm smoke:product`.
- [x] 13.4 Run `pnpm smoke:codex-acp` and confirm `verification/codex-acp.md` says passed or skipped with candidate evidence.
- [x] 13.5 Start `pnpm dev` and verify the workspace opens.
- [x] 13.6 Verify creating two conversations and switching between them.
- [x] 13.7 Verify queued prompts with active-turn state and real agent execution kept on the Codex CLI path.
- [x] 13.8 Verify Markdown files remain readable outside the app.
- [x] 13.9 Capture desktop and narrow screenshots.
- [x] 13.10 Compare the implemented UI against the approved concept screenshot for layout, type, spacing, color, status states, and component density.
- [x] 13.11 Use `ui-element-coverage.md` to confirm every concept element has implementation and verification evidence.
- [x] 13.12 Use Computer Use to inspect the real Electron app window screenshot and accessibility tree.
- [x] 13.13 Use Computer Use to click new conversation, type a prompt, and send it.
- [x] 13.14 Use Computer Use to switch conversations and verify header, timeline, and agent panel changes.
- [x] 13.15 Use Computer Use to verify queued prompt UI while an active turn is present.
- [x] 13.16 Use Computer Use to open the user profile page from the bottom avatar.
- [x] 13.17 Use Computer Use to open the agent profile page from the right panel and confirm Codex ACP status is visible when configured or discovered.
- [x] 13.18 Use Computer Use to close and restore the agent progress panel.
- [x] 13.19 Record Computer Use verification evidence, failures found, fixes made, and optional items left for later.

## 14. Product Smoke Test

- [x] 14.1 Implement `pnpm smoke:product` using a temporary workspace directory and real Codex CLI agent.
- [x] 14.2 Smoke test creates a conversation with `codex-acp-real`.
- [x] 14.3 Smoke test sends a prompt and waits for a real Codex CLI assistant response.
- [x] 14.4 Test suite verifies a second prompt becomes queued while a turn is active.
- [x] 14.5 Test suite verifies queue state and response states remain valid after turn handling.
- [x] 14.6 Smoke test verifies `conversation.md`, `messages/*.md`, `state.json`, `index.json`, and `profile.json` exist and match schemas.
- [x] 14.7 Smoke test restarts app logic against the same temp workspace and verifies conversations and messages reload in order.
- [x] 14.8 Smoke test reads Markdown files directly and verifies frontmatter plus readable body text.
- [x] 14.9 Implement `pnpm smoke:codex-acp` as a separate smoke flow that never replaces the required real ACP product smoke.
- [x] 14.10 Codex ACP smoke writes `verification/codex-acp.md` with platform, workspace, candidate list, discovery result, handshake result, prompt result, and final status.
- [x] 14.11 Codex ACP smoke marks final status `passed` only after real `initialize`, `session/new`, `session/prompt`, `session/update`, and Markdown persistence succeed.
- [x] 14.12 Codex ACP smoke marks final status `skipped` when no runnable adapter exists and includes the exact checked candidates.
