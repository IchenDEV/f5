## ADDED Requirements

### Requirement: Product smoke test script

The system SHALL provide a product-level smoke test that verifies the core local workflow.

#### Scenario: Run smoke test

- **WHEN** the smoke test command runs
- **THEN** it creates a temporary workspace, starts the app logic against real Codex CLI, creates a conversation, sends a prompt, verifies queue state handling, and verifies persisted files

### Requirement: Create-send workflow

The smoke test SHALL verify creating a conversation and sending a prompt through the real Codex CLI agent.

#### Scenario: Verify prompt workflow

- **WHEN** the smoke test sends a prompt
- **THEN** a user message and real assistant message are persisted
- **AND** both messages are visible after app logic restarts

### Requirement: Queue state workflow

The smoke test or unit suite SHALL verify that a prompt submitted during an active turn becomes queued.

#### Scenario: Verify prompt queue workflow

- **WHEN** a conversation already has an active turn id
- **THEN** a new prompt appears as queued
- **AND** the queued prompt is visible in local state

### Requirement: Restart persistence workflow

The smoke test SHALL verify that persisted Markdown can reload after app logic restarts.

#### Scenario: Restart and reload

- **WHEN** the app logic is restarted after messages are written
- **THEN** the conversation list loads from Markdown and derived index
- **AND** opening the conversation shows the previous messages in order

### Requirement: Human-readable files workflow

The smoke test SHALL verify that conversation files are readable outside the app.

#### Scenario: Inspect Markdown files

- **WHEN** the smoke test reads `conversation.md` and `messages/*.md`
- **THEN** each file has valid YAML frontmatter
- **AND** message bodies contain the prompt or real Codex CLI response text

### Requirement: Desktop smoke flow

The system SHALL pair the script smoke test with a desktop verification flow.

#### Scenario: Desktop flow verified

- **WHEN** Computer Use verification runs
- **THEN** the real Electron window can create a conversation, send text, switch conversations, open user profile, open agent profile, and return to the active conversation

### Requirement: Optional real Codex ACP smoke flow

The system SHALL include a real Codex ACP smoke flow when a runnable Codex ACP adapter is available.

#### Scenario: Real Codex ACP smoke run

- **WHEN** Codex ACP discovery and handshake succeed
- **THEN** the smoke flow creates a Codex-backed conversation, sends a short prompt, persists the response, and records the verification result
- **AND** failure of this optional flow does not replace the required real Codex CLI smoke flow
