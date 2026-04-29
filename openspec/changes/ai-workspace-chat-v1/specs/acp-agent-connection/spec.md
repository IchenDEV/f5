## ADDED Requirements

### Requirement: ACP agent configuration

The system SHALL allow local ACP agents to be configured with command, args, cwd, and environment values.

#### Scenario: Load configured agent

- **WHEN** the app starts
- **THEN** it loads configured agents from local agent configuration
- **AND** invalid agent entries are shown as unavailable instead of crashing the app

### Requirement: Default mock ACP agent

The system SHALL ship with a default mock ACP agent for first-version local operation and tests.

#### Scenario: Load default mock agent

- **WHEN** no user agent configuration exists
- **THEN** the system creates or uses a default `mock-market-analyst` agent
- **AND** that agent runs through `node scripts/mock-acp-agent.mjs`
- **AND** new conversations can use it without external tools

### Requirement: Real adapter fallback

The system SHALL keep the mock ACP agent usable when a real adapter is unavailable.

#### Scenario: Real adapter command missing

- **WHEN** a configured real ACP adapter command does not exist or fails initialization
- **THEN** the app marks that agent unavailable
- **AND** the default mock ACP agent remains selectable and runnable

### Requirement: Codex ACP real adapter profile

The system SHALL include a first-version profile for real Codex ACP verification.

#### Scenario: Codex ACP profile exists

- **WHEN** default agent profiles are created
- **THEN** the system includes `codex-acp-real` as a disabled-by-default real adapter profile
- **AND** it becomes available only after discovery and initialization succeed

### Requirement: ACP initialization

The system SHALL initialize an ACP agent before creating or using a session.

#### Scenario: Initialize agent process

- **WHEN** a conversation first needs its agent
- **THEN** the system starts the configured agent process
- **AND** sends `initialize`
- **AND** records the returned protocol version and capabilities

### Requirement: Mock ACP behavior

The mock ACP agent SHALL implement deterministic prompt behavior for UI and smoke tests.

#### Scenario: Mock agent prompt turn

- **WHEN** the app sends `session/prompt` to the mock ACP agent
- **THEN** the mock agent emits plan updates, tool updates, streaming text chunks, and a completed stop state
- **AND** slow mode can keep the first turn active long enough to queue a second prompt

### Requirement: ACP session lifecycle

The system SHALL create or resume ACP sessions according to the agent's capabilities.

#### Scenario: Create new ACP session

- **WHEN** a new conversation sends its first prompt
- **THEN** the system calls `session/new`
- **AND** stores the returned `sessionId` in the conversation runtime state

#### Scenario: Load existing ACP session when supported

- **WHEN** a conversation has a prior `sessionId` and the agent supports loading sessions
- **THEN** the system calls `session/load`
- **AND** replays or reconciles updates into the conversation state

### Requirement: ACP prompt turn

The system SHALL send user prompts through `session/prompt` and process `session/update` notifications.

#### Scenario: Send prompt to ACP agent

- **WHEN** a queued user prompt becomes active
- **THEN** the system calls `session/prompt` with the active ACP session id
- **AND** handles agent message chunks, tool call updates, plan updates, and final stop reason

### Requirement: ACP cancellation

The system SHALL map user cancellation to ACP cancellation for the active session.

#### Scenario: Cancel ACP turn

- **WHEN** the user cancels the active turn
- **THEN** the system sends `session/cancel`
- **AND** updates local message status when the agent returns a cancellation stop reason or exits unexpectedly

### Requirement: ACP capability-aware UI

The system SHALL enable ACP-dependent UI controls only when the agent advertises the matching capability.

#### Scenario: Agent does not support session listing

- **WHEN** the initialized agent does not advertise session listing
- **THEN** the UI hides or disables remote session list controls
- **AND** local Markdown conversations remain available
