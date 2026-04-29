## ADDED Requirements

### Requirement: Multiple conversations

The system SHALL allow users to create and switch between multiple conversations.

#### Scenario: Switch active conversation

- **WHEN** the user selects a conversation from the list
- **THEN** the message view shows that conversation's messages
- **AND** other running conversations keep their current state

### Requirement: Conversation agent binding

The system SHALL bind each conversation to one configured agent for its prompt turns.

#### Scenario: Create conversation with agent

- **WHEN** the user starts a conversation with an agent
- **THEN** the conversation stores the selected `agentId`
- **AND** future prompts in that conversation use the same agent unless the user changes it through an explicit action

### Requirement: Prompt queue per conversation

The system SHALL maintain a FIFO prompt queue per conversation.

#### Scenario: User sends prompt while agent is busy

- **WHEN** the user sends a prompt while the conversation has an active agent turn
- **THEN** the system stores the prompt as a queued user message
- **AND** the prompt is sent after the active turn completes

### Requirement: Agent streaming state

The system SHALL display streaming agent output while a prompt turn is running.

#### Scenario: Agent streams text

- **WHEN** the agent sends message chunks for the active turn
- **THEN** the system appends the chunks to the visible agent response
- **AND** the final response is persisted as Markdown when the turn completes

### Requirement: Cancel current turn

The system SHALL allow the user to cancel the active turn for a conversation.

#### Scenario: Cancel active agent turn

- **WHEN** the user cancels a running turn
- **THEN** the system asks the agent layer to cancel the turn
- **AND** the current message is marked as cancelled or interrupted
- **AND** queued prompts remain queued unless the user removes them

### Requirement: Agent progress display

The system SHALL show the current plan and tool activity for each running conversation.

#### Scenario: Agent sends plan update

- **WHEN** the agent sends a plan update with entries and statuses
- **THEN** the system displays the plan in the conversation progress panel
- **AND** completed, active, and pending entries are visually distinct
