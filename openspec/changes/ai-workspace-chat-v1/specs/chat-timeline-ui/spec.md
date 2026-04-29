## ADDED Requirements

### Requirement: Message timeline layout

The system SHALL render messages in a readable vertical timeline.

#### Scenario: Mixed user and agent messages

- **WHEN** a conversation contains user and agent messages
- **THEN** the timeline distinguishes speaker, timestamp, content, and status
- **AND** the message layout remains aligned with the approved concept

### Requirement: User message treatment

The system SHALL show user prompts as compact message blocks.

#### Scenario: User prompt appears

- **WHEN** the user submits a prompt
- **THEN** the prompt appears immediately in the timeline with user identity and timestamp

### Requirement: Streaming agent response treatment

The system SHALL render active agent output with a streaming state label.

#### Scenario: Agent response is streaming

- **WHEN** the active agent turn is producing output
- **THEN** the timeline shows the agent name, streaming state, timestamp, and partial content

### Requirement: Inline plan summary

The system SHALL allow plan progress to appear in the timeline as part of the active agent response.

#### Scenario: Agent sends plan update

- **WHEN** a plan update belongs to the active turn
- **THEN** the timeline shows completed, active, and pending plan rows inside the agent response block

### Requirement: Queued prompt card

The system SHALL show queued prompts inside the timeline.

#### Scenario: Prompt waits behind active turn

- **WHEN** a prompt is queued
- **THEN** the timeline shows a queued card with the prompt text, queue position, timestamp, and cancel control

### Requirement: Markdown content rendering

The system SHALL render Markdown message content safely.

#### Scenario: Agent returns Markdown

- **WHEN** a message contains Markdown lists, code, links, or block quotes
- **THEN** the timeline renders readable Markdown without allowing unsafe HTML execution

### Requirement: Timeline empty state

The system SHALL provide an empty state for a new conversation.

#### Scenario: New conversation has no messages

- **WHEN** the active conversation has no messages
- **THEN** the center panel shows a quiet empty state and keeps the composer available
