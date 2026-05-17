# F5

F5 is a local AI workspace for assigning tasks, tracking AI and human work, and keeping chats and docs as Markdown files on disk.

![F5 workspace](docs/assets/f5-workspace.png)

## What It Does

- Task-first workspace with a Board for AI and human assignments.
- Markdown-backed task, chat, and document storage under the local workspace folder.
- Workspace-level TODO lists backed by local Markdown files, with AI and human assignment.
- Task-bound Markdown documents with automatic save, edit, preview, selected-text comments, Agent handoff, and preview highlights.
- Real Codex CLI agent integration with queued prompts and visible agent progress.
- Agent side panel for plan steps, tool activity, session details, and raw logs.
- Conversation actions for star, rename, archive, delete, export, and showing file location.
- Profile, agent, Board, Docs, theme switching, and macOS menu support.
- v2 workbench structure with separate app shell, chat, TODO, Docs, shared resource UI, and main storage primitives.

## Stack

- Electron desktop shell
- React + Vite renderer
- pnpm workspace tooling
- Tailwind CSS + shadcn/ui
- ESLint, Prettier, Husky, lint-staged
- OpenSpec for product and implementation specs
- Vitest for unit and integration tests

## Local Development

```bash
pnpm install
pnpm dev
```

The development app opens as an Electron window and serves the renderer at `http://localhost:5173/`.

## Scripts

- `pnpm dev`: run the Electron app in development mode.
- `pnpm build`: type-check and build the Electron main, preload, and renderer bundles.
- `pnpm check`: run type-check, lint, format check, 80% unit coverage, and OpenSpec validation.
- `pnpm test`: run Vitest tests.
- `pnpm test:coverage`: run Vitest with 80% statement, function, and line coverage thresholds.
- `pnpm format`: format the project.
- `pnpm smoke:product`: run the product smoke test.
- `pnpm smoke:codex-acp`: run Codex ACP discovery and verification.

## Local Data

F5 v2 stores new workspace data in the app support folder:

```text
~/Library/Application Support/F5/workspace-v2
```

Older development data under `~/Library/Application Support/F5/workspace` is left untouched.

Each conversation is stored as a folder with:

- `conversation.md`: conversation metadata frontmatter.
- `messages/*.md`: one Markdown file per message.
- `state.json`: queue, agent plan, tools, and session state.
- `attachments/`: local files attached to the conversation.

Workspace resources are stored beside conversations:

- `tasks/*.md`: one Markdown-backed TODO item per file.
- `tasks/lists/*.md`: one Markdown-backed TODO list per file.
- `tasks/index.json`: derived TODO index.
- `tasks/lists/index.json`: derived TODO list index.
- `documents/*.md`: one Markdown document per file.
- `documents/index.json`: derived document index.
- `documents/comments/*.md`: one Markdown-backed document comment per file.
- `documents/comments/index.json`: derived document comment index.

Use `Help > Show Workspace Folder` in the app menu to open the workspace folder directly.

## Code Structure

- `src/renderer/App.tsx`: React provider entry.
- `src/renderer/app/`: workspace shell, navigation, profile pages, and shared workbench primitives.
- `src/renderer/features/chat/`: conversation list, message timeline, composer, agent panel, and chat dialogs.
- `src/renderer/features/tasks/`: TODO list and task UI.
- `src/renderer/features/documents/`: Markdown document editor, preview, comments, and agent handoff.
- `src/renderer/features/resources/`: shared resource page shell and delete dialog.
- `src/renderer/lib/f5-api.ts`: typed v2 renderer API wrapper.
- `electron/main/storage/`: storage primitives and default agent configuration.

## Code Comments

- Functions over 40 lines must have a leading comment that explains what the function does and why it needs that shape.
- Keep comments focused on intent, edge cases, and non-obvious behavior. Do not repeat what the code already says.
