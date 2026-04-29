## ADDED Requirements

### Requirement: Conversation directory structure

The system SHALL store each conversation in its own directory under the selected workspace data directory.

#### Scenario: Create conversation directory

- **WHEN** the user creates a new conversation
- **THEN** the system creates `conversations/<conversationId>/conversation.md`
- **AND** the system creates `conversations/<conversationId>/messages/`
- **AND** the conversation id is stable across app restarts

### Requirement: Default workspace data directory

The system SHALL use Electron `app.getPath('userData')/workspace` as the first-version default workspace data directory.

#### Scenario: Initialize default workspace

- **WHEN** the app starts for the first time
- **THEN** the system creates the default workspace directory
- **AND** the user profile page can show the workspace path

### Requirement: Conversation frontmatter

The system SHALL store conversation metadata in YAML frontmatter at the top of `conversation.md`.

#### Scenario: Read conversation metadata

- **WHEN** the app scans existing conversations
- **THEN** it reads `id`, `title`, `agentId`, `createdAt`, `updatedAt`, and `status` from frontmatter
- **AND** it uses those fields to build the conversation list

### Requirement: Conversation schema v1

The system SHALL validate `conversation.md` frontmatter against the `f5.conversation.v1` schema.

| Field           | Type                         | Rule                                 |
| --------------- | ---------------------------- | ------------------------------------ |
| `schema`        | string                       | exactly `f5.conversation.v1`         |
| `id`            | string                       | starts with `conv_`                  |
| `title`         | string                       | non-empty after creation             |
| `agentId`       | string                       | configured agent id                  |
| `status`        | enum                         | `active`, `archived`, `needs_repair` |
| `starred`       | boolean                      | defaults to `false`                  |
| `createdAt`     | ISO datetime string          | UTC                                  |
| `updatedAt`     | ISO datetime string          | UTC                                  |
| `lastMessageAt` | ISO datetime string or empty | UTC when present                     |
| `messageCount`  | integer                      | `0` or greater                       |

#### Scenario: Validate conversation frontmatter

- **WHEN** a conversation file is loaded
- **THEN** frontmatter includes `schema`, `id`, `title`, `agentId`, `status`, `starred`, `createdAt`, `updatedAt`, `lastMessageAt`, and `messageCount`
- **AND** `status` is one of `active`, `archived`, or `needs_repair`

### Requirement: Message Markdown files

The system SHALL store each message as a Markdown file under the conversation's `messages/` directory.

#### Scenario: Persist user message

- **WHEN** the user sends a message
- **THEN** the system writes a Markdown file for that message
- **AND** the file frontmatter includes `id`, `conversationId`, `role`, `createdAt`, `status`, and `turnId`
- **AND** the Markdown body contains the message content

### Requirement: Message schema v1

The system SHALL validate message frontmatter against the `f5.message.v1` schema.

| Field            | Type                | Rule                                                                               |
| ---------------- | ------------------- | ---------------------------------------------------------------------------------- |
| `schema`         | string              | exactly `f5.message.v1`                                                            |
| `id`             | string              | starts with `msg_`                                                                 |
| `conversationId` | string              | starts with `conv_`                                                                |
| `sequence`       | integer             | `1` or greater                                                                     |
| `role`           | enum                | `user`, `assistant`, `system`, `tool`                                              |
| `agentId`        | string or empty     | configured agent id when present                                                   |
| `turnId`         | string or empty     | starts with `turn_` when present                                                   |
| `parentId`       | string or empty     | starts with `msg_` when present                                                    |
| `status`         | enum                | `queued`, `active`, `streaming`, `completed`, `failed`, `cancelled`, `interrupted` |
| `createdAt`      | ISO datetime string | UTC                                                                                |
| `updatedAt`      | ISO datetime string | UTC                                                                                |
| `errorCode`      | string or empty     | set for failed messages                                                            |
| `errorMessage`   | string or empty     | set for failed messages                                                            |

#### Scenario: Validate message frontmatter

- **WHEN** a message file is loaded
- **THEN** frontmatter includes `schema`, `id`, `conversationId`, `sequence`, `role`, `agentId`, `turnId`, `status`, `createdAt`, and `updatedAt`
- **AND** `role` is one of `user`, `assistant`, `system`, or `tool`
- **AND** `status` is one of `queued`, `active`, `streaming`, `completed`, `failed`, `cancelled`, or `interrupted`

### Requirement: Message filename format

The system SHALL name message files using sortable sequence, role, and message id.

#### Scenario: Write message filename

- **WHEN** the system writes a message with sequence 2, role `assistant`, and id `msg_abc`
- **THEN** the filename follows `000002-assistant-msg_abc.md`
- **AND** loading messages sorted by filename preserves timeline order

### Requirement: Message ordering

The system SHALL preserve message order using sortable message filenames and message metadata.

#### Scenario: Load ordered messages

- **WHEN** the app opens a conversation
- **THEN** messages are displayed in chronological order
- **AND** duplicate or missing sequence numbers do not crash the app

### Requirement: Local id format

The system SHALL use stable prefixed ids generated from `crypto.randomUUID()`.

#### Scenario: Generate ids

- **WHEN** the system creates conversation, message, turn, tool, or plan ids
- **THEN** ids use the prefixes `conv_`, `msg_`, `turn_`, `tool_`, and `plan_`
- **AND** ids remain stable after app restart

### Requirement: Atomic file writes

The system SHALL write Markdown and JSON files using temp file plus rename.

#### Scenario: Interrupted write

- **WHEN** a write operation is interrupted
- **THEN** the previous valid file remains readable
- **AND** the app can mark partial temp files for cleanup on next startup

### Requirement: Derived conversation index

The system SHALL maintain a local derived index for fast conversation listing.

#### Scenario: Rebuild missing index

- **WHEN** `index.json` is missing or invalid
- **THEN** the system rebuilds the index by scanning conversation Markdown files
- **AND** existing conversation content remains unchanged

### Requirement: Runtime state schema v1

The system SHALL store transient conversation runtime state in `state.json` using `f5.state.v1`.

| Field            | Type            | Rule                                      |
| ---------------- | --------------- | ----------------------------------------- |
| `schema`         | string          | exactly `f5.state.v1`                     |
| `conversationId` | string          | starts with `conv_`                       |
| `acpSessionId`   | string or empty | agent session id                          |
| `activeTurnId`   | string or empty | starts with `turn_` when present          |
| `queue`          | array           | queued prompt descriptors                 |
| `plan`           | array           | plan entries with `id`, `title`, `status` |
| `tools`          | array           | tool entries with `id`, `name`, `status`  |

#### Scenario: Persist runtime state

- **WHEN** a conversation has active turn, queue, plan, or tool activity
- **THEN** `state.json` includes `schema`, `conversationId`, `acpSessionId`, `activeTurnId`, `queue`, `plan`, and `tools`
- **AND** deleting `state.json` does not delete Markdown messages

### Requirement: Profile schema v1

The system SHALL store local profile preferences in `profile.json`.

| Field            | Type            | Rule                    |
| ---------------- | --------------- | ----------------------- |
| `schema`         | string          | exactly `f5.profile.v1` |
| `displayName`    | string          | non-empty               |
| `avatarPath`     | string or empty | local path when present |
| `defaultAgentId` | string          | configured agent id     |
| `workspacePath`  | string          | absolute local path     |

#### Scenario: Persist profile settings

- **WHEN** the user edits display name or default agent
- **THEN** `profile.json` includes `schema`, `displayName`, `avatarPath`, `defaultAgentId`, and `workspacePath`
- **AND** new conversations use the persisted default agent

### Requirement: Frontmatter parse errors

The system SHALL handle invalid frontmatter without deleting user content.

#### Scenario: Invalid conversation frontmatter

- **WHEN** a conversation Markdown file has invalid frontmatter
- **THEN** the system marks the conversation as needing repair
- **AND** the original file content remains available for manual review
