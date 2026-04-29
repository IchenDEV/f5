## ADDED Requirements

### Requirement: User profile page

The system SHALL provide a user profile page or panel from the bottom avatar.

#### Scenario: Open user profile page

- **WHEN** the user activates the bottom avatar
- **THEN** the app shows user name, avatar, local workspace path, default agent, and profile preferences

### Requirement: User profile editing

The system SHALL allow lightweight editing of local user profile fields.

#### Scenario: Edit profile display name

- **WHEN** the user changes the display name
- **THEN** the new name is persisted locally
- **AND** future user message blocks use the updated display name

### Requirement: Default agent preference

The system SHALL allow users to choose a default agent from the user profile page or settings.

#### Scenario: Change default agent

- **WHEN** the user selects a default agent
- **THEN** new conversation flows preselect that agent
- **AND** existing conversations keep their assigned agents

### Requirement: Agent profile page

The system SHALL provide an agent profile page from right-panel agent actions.

#### Scenario: Open agent profile

- **WHEN** the user activates `View agent` or `Agent profile`
- **THEN** the app shows agent name, description, command, args, working directory, capabilities, and connection state

### Requirement: Agent connection test

The system SHALL allow users to test a configured agent from the agent profile page.

#### Scenario: Test agent connection

- **WHEN** the user activates the connection test
- **THEN** the app attempts ACP initialization
- **AND** the page shows success, failure, protocol version, and capability summary

### Requirement: Profile page exit

The system SHALL provide a clear path back to the active conversation from profile pages.

#### Scenario: Return to conversation

- **WHEN** the user exits a profile page
- **THEN** the app returns to the previous active conversation and preserves draft composer text
