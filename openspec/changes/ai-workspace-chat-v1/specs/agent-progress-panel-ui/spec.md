## ADDED Requirements

### Requirement: Agent identity card

The system SHALL show the active agent identity and connection state at the top of the right panel.

#### Scenario: Agent card renders

- **WHEN** a conversation has an assigned agent
- **THEN** the panel shows agent name, avatar or mark, connection state, protocol label, and profile action

### Requirement: Agent profile actions

The system SHALL provide right-panel actions for viewing the active agent profile.

#### Scenario: Open agent profile from right panel

- **WHEN** the user activates `View agent` or `Agent profile`
- **THEN** the app opens the agent profile page for the active agent
- **AND** the active conversation remains available when the profile page closes

### Requirement: Plan step list

The system SHALL show agent plan entries with clear state.

#### Scenario: Plan entries render

- **WHEN** the active turn has a plan
- **THEN** completed, active, pending, and failed steps render with distinct indicators
- **AND** the panel shows progress count when available

### Requirement: Tool activity list

The system SHALL show active and queued tool activity.

#### Scenario: Tool activity changes

- **WHEN** the agent reports tool activity
- **THEN** the panel shows tool name, status, and elapsed time or queue state

### Requirement: ACP session details

The system SHALL show ACP session details in a compact technical section.

#### Scenario: ACP details visible

- **WHEN** an ACP session exists
- **THEN** the panel shows protocol version, session id, connected time, and transport endpoint or command label

### Requirement: Log entry point

The system SHALL provide an entry point to inspect raw agent logs.

#### Scenario: Open raw logs

- **WHEN** the user activates the raw logs action
- **THEN** the app opens a readable log view for the active conversation or session

### Requirement: Panel close and restore

The system SHALL allow the right panel to be hidden and restored.

#### Scenario: Hide agent panel

- **WHEN** the user closes the agent panel
- **THEN** the chat area gains available width
- **AND** a visible control can restore the panel
