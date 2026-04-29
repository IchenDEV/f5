## ADDED Requirements

### Requirement: Product smoke test script

The system SHALL provide a product-level smoke test that verifies the core local workflow.

#### Scenario: Run smoke test

- **WHEN** the smoke test command runs
- **THEN** it creates a temporary workspace, starts the app logic against mock ACP, creates conversations, sends prompts, queues prompts, and verifies persisted files

### Requirement: Create-send-queue workflow

The smoke test SHALL verify creating a conversation, sending a prompt, and queueing a second prompt.

#### Scenario: Verify prompt queue workflow

- **WHEN** the mock ACP agent is configured to respond slowly
- **THEN** the first prompt becomes active
- **AND** the second prompt appears as queued
- **AND** both prompts are visible in local state

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
- **AND** message bodies contain the prompt or mock agent response text

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
- **AND** failure of this optional flow does not replace the required mock ACP smoke flow
