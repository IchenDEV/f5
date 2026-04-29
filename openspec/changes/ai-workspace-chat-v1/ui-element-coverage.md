# UI Element Coverage

This checklist maps the approved concept image to OpenSpec coverage. Each visible or clickable product element must have a spec and a task before implementation starts.

Reference images:

- `assets/ui-concept-v3-light-reference.png`: default light visual style reference, based on the user's white Superconductor screenshot.
- `assets/ui-concept-v2-dark-reference.png`: dark mode visual style reference, based on the user's dark Superconductor screenshot.
- `assets/ui-concept-v1.png`: functional element map for the first chat workspace.

| Concept element                                 | Coverage                                    | Spec                                                   |
| ----------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| macOS window chrome                             | Covered by Electron shell and visual review | `workspace-shell-ui`, `computer-use-verification`      |
| `f5` app identity                               | Covered                                     | `workspace-topbar-ui`                                  |
| Top search field and shortcut hint              | Covered                                     | `workspace-topbar-ui`, `conversation-list-ui`          |
| Top quick compose icon                          | Covered                                     | `workspace-topbar-ui`, `new-conversation-ui`           |
| Left rail icons                                 | Covered                                     | `workspace-navigation-ui`                              |
| Left rail active state                          | Covered                                     | `workspace-navigation-ui`                              |
| Bottom user avatar                              | Covered                                     | `workspace-navigation-ui`, `profile-pages-ui`          |
| User Profile page                               | Covered                                     | `profile-pages-ui`                                     |
| New conversation primary button                 | Covered                                     | `new-conversation-ui`, `conversation-list-ui`          |
| New conversation dropdown segment               | Covered                                     | `new-conversation-ui`                                  |
| Conversation groups: Today, Yesterday, Older    | Covered                                     | `conversation-list-ui`                                 |
| Conversation row title, agent, status dot, time | Covered                                     | `conversation-list-ui`                                 |
| Active conversation row                         | Covered                                     | `conversation-list-ui`                                 |
| Archived conversations entry                    | Covered                                     | `conversation-list-ui`                                 |
| Chat header title and dropdown                  | Covered                                     | `conversation-header-actions-ui`, `workspace-shell-ui` |
| Chat header agent and ACP state                 | Covered                                     | `workspace-shell-ui`, `agent-chat-sessions`            |
| Star action                                     | Covered                                     | `conversation-header-actions-ui`                       |
| Share/export action                             | Covered                                     | `conversation-header-actions-ui`                       |
| More menu                                       | Covered                                     | `conversation-header-actions-ui`                       |
| User message card                               | Covered                                     | `chat-timeline-ui`                                     |
| Agent streaming message block                   | Covered                                     | `chat-timeline-ui`, `agent-chat-sessions`              |
| Inline plan rows in message                     | Covered                                     | `chat-timeline-ui`, `agent-chat-sessions`              |
| Source/tool chips inside message                | Covered                                     | `chat-timeline-ui`, `agent-progress-panel-ui`          |
| Queued prompt card and cancel button            | Covered                                     | `chat-timeline-ui`, `agent-chat-sessions`              |
| Composer tabs                                   | Covered                                     | `chat-composer-ui`                                     |
| Composer placeholder                            | Covered                                     | `chat-composer-ui`                                     |
| Attachment, code, layout icons                  | Covered                                     | `chat-composer-ui`                                     |
| Markdown selector                               | Covered                                     | `chat-composer-ui`                                     |
| Agent selector in composer                      | Covered                                     | `chat-composer-ui`                                     |
| Send split button                               | Covered                                     | `chat-composer-ui`                                     |
| Right panel close button                        | Covered                                     | `agent-progress-panel-ui`                              |
| Agent identity card                             | Covered                                     | `agent-progress-panel-ui`                              |
| View agent button                               | Covered                                     | `profile-pages-ui`, `agent-progress-panel-ui`          |
| Agent profile link                              | Covered                                     | `profile-pages-ui`, `agent-progress-panel-ui`          |
| Agent connection test                           | Covered                                     | `profile-pages-ui`, `acp-agent-connection`             |
| Codex ACP discovery status                      | Covered                                     | `codex-acp-verification`, `profile-pages-ui`           |
| Plan section and step count                     | Covered                                     | `agent-progress-panel-ui`                              |
| Tool activity list                              | Covered                                     | `agent-progress-panel-ui`                              |
| ACP Session section                             | Covered                                     | `agent-progress-panel-ui`, `acp-agent-connection`      |
| Raw logs entry                                  | Covered                                     | `agent-progress-panel-ui`                              |
| Desktop and narrow layouts                      | Covered                                     | `responsive-workspace-ui`                              |
| Desktop operation verification                  | Covered                                     | `computer-use-verification`                            |
| Real Codex ACP smoke evidence                   | Covered                                     | `codex-acp-verification`, `product-smoke-test`         |
