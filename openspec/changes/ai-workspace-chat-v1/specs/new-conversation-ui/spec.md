## ADDED Requirements

### Requirement: New conversation primary button

The system SHALL provide a primary new conversation button in the conversation pane.

#### Scenario: Open new conversation flow

- **WHEN** the user activates the primary new conversation button
- **THEN** the app opens the new conversation flow
- **AND** the flow defaults to the last used or default agent

### Requirement: New conversation dropdown

The system SHALL provide a dropdown next to the new conversation button for quick creation options.

#### Scenario: Open new conversation dropdown

- **WHEN** the user activates the dropdown segment
- **THEN** the app shows recent agents and quick templates
- **AND** selecting an option creates or prepares a conversation with that option

### Requirement: Agent selection before creation

The system SHALL allow users to choose an agent before the conversation is created.

#### Scenario: Select agent

- **WHEN** the user chooses an agent in the new conversation flow
- **THEN** the new conversation stores the selected `agentId`
- **AND** the chat header, composer, and agent panel use that agent

### Requirement: Optional conversation title

The system SHALL allow the new conversation title to be optional.

#### Scenario: Create without title

- **WHEN** the user creates a conversation without entering a title
- **THEN** the system creates a temporary title from the first prompt or agent label
- **AND** the user can rename the conversation later

### Requirement: First prompt creation path

The system SHALL support creating a conversation from the first prompt.

#### Scenario: Create with first prompt

- **WHEN** the user enters a first prompt in the new conversation flow
- **THEN** the system creates the conversation and adds the prompt as the first user message
- **AND** the prompt starts immediately or enters the queue based on agent state

### Requirement: Cancel new conversation flow

The system SHALL allow users to exit the new conversation flow without creating files.

#### Scenario: Cancel creation

- **WHEN** the user cancels before creating the conversation
- **THEN** no conversation directory or message file is created
