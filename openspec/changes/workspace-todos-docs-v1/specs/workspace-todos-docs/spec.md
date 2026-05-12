## ADDED Requirements

### Requirement: Workspace TODO storage

The system SHALL store workspace TODO lists as Markdown files under `tasks/lists/` and TODO items as Markdown files under `tasks/`.

#### Scenario: Create TODO list

- **WHEN** the user creates a TODO list
- **THEN** the system writes `tasks/lists/<taskListId>.md`
- **AND** the file frontmatter uses schema `f5.task-list.v1`
- **AND** the list appears in `tasks/lists/index.json`

#### Scenario: Create TODO item

- **WHEN** the user creates a TODO item
- **THEN** the system writes `tasks/<taskId>.md`
- **AND** the file frontmatter uses schema `f5.task.v1`
- **AND** `listId` points at the selected TODO list
- **AND** `agentId` points at the selected workspace agent
- **AND** the Markdown body stores the task notes

### Requirement: Workspace TODO list schema

The system SHALL validate TODO list frontmatter against `f5.task-list.v1`.

| Field       | Type                | Rule                      |
| ----------- | ------------------- | ------------------------- |
| `schema`    | string              | exactly `f5.task-list.v1` |
| `id`        | string              | starts with `tasklist_`   |
| `title`     | string              | non-empty                 |
| `createdAt` | ISO datetime string | UTC                       |
| `updatedAt` | ISO datetime string | UTC                       |
| `order`     | integer             | `0` or greater            |

#### Scenario: Validate TODO list

- **WHEN** the app scans the `tasks/lists/` directory
- **THEN** valid files appear in the TODO page list picker
- **AND** invalid frontmatter is represented as needing repair

### Requirement: Workspace TODO schema

The system SHALL validate TODO frontmatter against `f5.task.v1`.

| Field         | Type                         | Rule                    |
| ------------- | ---------------------------- | ----------------------- |
| `schema`      | string                       | exactly `f5.task.v1`    |
| `id`          | string                       | starts with `task_`     |
| `listId`      | string                       | starts with `tasklist_` |
| `agentId`     | string                       | non-empty agent id      |
| `title`       | string                       | non-empty               |
| `status`      | enum                         | `todo` or `done`        |
| `createdAt`   | ISO datetime string          | UTC                     |
| `updatedAt`   | ISO datetime string          | UTC                     |
| `completedAt` | ISO datetime string or empty | set when done           |
| `order`       | integer                      | `0` or greater          |

#### Scenario: Validate TODO item

- **WHEN** the app scans the `tasks/` directory
- **THEN** valid files appear in the TODO page
- **AND** invalid frontmatter is represented as needing repair

### Requirement: Workspace TODO actions

The system SHALL allow users to create, rename, select, and delete TODO lists, and create, edit, complete, reopen, delete, filter, search, and assign TODO items within the selected list.

#### Scenario: Manage TODO item

- **WHEN** the user edits a task title, notes, or status
- **THEN** the matching Markdown file is updated atomically
- **AND** the task list reflects the saved state

#### Scenario: Assign TODO item to agent

- **WHEN** the user chooses an agent while creating or editing a TODO item
- **THEN** the matching task frontmatter stores that agent id
- **AND** the TODO page shows the assigned agent on the task row

#### Scenario: Switch TODO lists

- **WHEN** the user selects a TODO list in the left list
- **THEN** the right panel shows only tasks whose `listId` matches the selected list
- **AND** new tasks are created with the selected list id

### Requirement: Workspace document storage

The system SHALL store workspace Markdown documents under the local workspace `documents/` directory.

#### Scenario: Create document

- **WHEN** the user creates a document
- **THEN** the system writes `documents/<documentId>.md`
- **AND** the file frontmatter uses schema `f5.document.v1`
- **AND** the Markdown body stores the document content

#### Scenario: Create document comment

- **WHEN** the user creates a comment on a Markdown document
- **THEN** the system writes `documents/comments/<commentId>.md`
- **AND** the file frontmatter uses schema `f5.document-comment.v1`
- **AND** `documentId` points at the commented document
- **AND** selected text is stored in `anchorText`, `anchorStart`, and `anchorEnd` when present
- **AND** the Markdown body stores the comment text

### Requirement: Workspace document schema

The system SHALL validate document frontmatter against `f5.document.v1`.

| Field       | Type                | Rule                     |
| ----------- | ------------------- | ------------------------ |
| `schema`    | string              | exactly `f5.document.v1` |
| `id`        | string              | starts with `doc_`       |
| `title`     | string              | non-empty                |
| `createdAt` | ISO datetime string | UTC                      |
| `updatedAt` | ISO datetime string | UTC                      |

#### Scenario: Validate document

- **WHEN** the app scans the `documents/` directory
- **THEN** valid files appear in the Docs page
- **AND** invalid frontmatter is represented as needing repair

### Requirement: Workspace document comment schema

The system SHALL validate document comment frontmatter against `f5.document-comment.v1`.

| Field         | Type                | Rule                              |
| ------------- | ------------------- | --------------------------------- |
| `schema`      | string              | exactly `f5.document-comment.v1`  |
| `id`          | string              | starts with `comment_`            |
| `documentId`  | string              | starts with `doc_`                |
| `anchorText`  | string              | selected Markdown or preview text |
| `anchorStart` | integer             | selected text start offset        |
| `anchorEnd`   | integer             | selected text end offset          |
| `authorName`  | string              | non-empty                         |
| `status`      | enum                | `open` or `resolved`              |
| `createdAt`   | ISO datetime string | UTC                               |
| `updatedAt`   | ISO datetime string | UTC                               |

#### Scenario: Validate document comment

- **WHEN** the app scans the `documents/comments/` directory
- **THEN** valid comments appear in the matching Docs page comment panel
- **AND** invalid frontmatter is represented as needing repair

### Requirement: Workspace document actions

The system SHALL allow users to create, open, rename, edit, preview, automatically save, delete, reveal, comment on, and manually send Markdown documents to the active agent.

#### Scenario: Edit document

- **WHEN** the user changes a document title or Markdown body and pauses editing
- **THEN** the matching Markdown file is updated atomically
- **AND** the preview renders the current Markdown draft safely

#### Scenario: Manage document comments

- **WHEN** the user adds, edits, resolves, reopens, or deletes a document comment
- **THEN** the matching comment Markdown file is updated atomically
- **AND** the Docs page comment panel reflects the current document comments

#### Scenario: Comment on selected document text

- **WHEN** the user selects text in the Markdown editor or preview and adds a comment
- **THEN** the comment stores the selected text and offsets in frontmatter
- **AND** the comment panel shows the selected text with the comment

#### Scenario: Locate selected-text comments

- **WHEN** a document comment has selected text metadata
- **THEN** the preview highlights the matching text
- **AND** activating the comment location action selects the matching range in the editor

#### Scenario: Send document to active agent

- **GIVEN** a conversation is active
- **WHEN** the user sends the current Markdown document to Agent
- **THEN** the app sends a chat message containing the document title, id, and Markdown body
- **AND** the workspace returns to the conversation view

#### Scenario: Mention agent from document comment

- **GIVEN** a conversation is active
- **WHEN** the user sends an existing document comment to Agent
- **THEN** the app sends a chat message containing the comment text, selected text metadata when present, and full document body
- **WHEN** the user writes a new comment and chooses `@ Agent`
- **THEN** the app saves the comment
- **AND** sends the same comment and document context to the active agent

### Requirement: Workspace navigation entries

The system SHALL expose TODO and Docs as workspace-level sections in the left navigation rail.

#### Scenario: Open workspace resources

- **WHEN** the user activates the TODO or Docs navigation item
- **THEN** the main workspace surface shows the selected resource page
- **AND** the top search field filters content for the active page
