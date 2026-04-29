## ADDED Requirements

### Requirement: Conversation list grouping

The system SHALL group conversations by recency.

#### Scenario: Group by date range

- **WHEN** conversations span today, yesterday, and older dates
- **THEN** the list shows grouped sections matching those date ranges
- **AND** each group keeps conversation order by updated time descending

### Requirement: Conversation row content

The system SHALL show title, agent name, status color, and last updated time for each conversation row.

#### Scenario: Render conversation row

- **WHEN** a conversation appears in the list
- **THEN** the row shows the conversation title, assigned agent, status indicator, and updated time

### Requirement: Active row state

The system SHALL make the active conversation visually distinct.

#### Scenario: Select conversation

- **WHEN** the user selects a conversation
- **THEN** that row has an active background and stable text contrast
- **AND** other rows keep their normal hover and idle states

### Requirement: Conversation search

The system SHALL provide a search entry for local conversation filtering.

#### Scenario: Filter conversations

- **WHEN** the user types a search query
- **THEN** the list filters by conversation title and agent name
- **AND** the active conversation remains visible if it matches the query

### Requirement: New conversation control

The system SHALL provide a primary control for creating a new conversation.

#### Scenario: Create from list

- **WHEN** the user activates the new conversation control
- **THEN** the app opens a new conversation flow with agent selection available

### Requirement: Archived conversations entry

The system SHALL provide an entry point for archived conversations without mixing them into the main active list.

#### Scenario: View archived conversations

- **WHEN** the user activates the archived conversations entry
- **THEN** archived conversations are shown separately from active conversations
