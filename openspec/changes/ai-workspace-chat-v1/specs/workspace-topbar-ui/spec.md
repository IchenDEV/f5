## ADDED Requirements

### Requirement: Top search field

The system SHALL provide a top search field for conversations.

#### Scenario: Search by keyboard shortcut

- **WHEN** the user activates the search field or the configured shortcut
- **THEN** the search input receives focus
- **AND** typing filters conversations by title, agent, and message preview when indexed

### Requirement: Search empty state

The system SHALL show a clear empty state when no conversation matches the search query.

#### Scenario: No search results

- **WHEN** a search query has no matches
- **THEN** the conversation pane shows a compact no-results state
- **AND** the user can clear the query

### Requirement: Quick compose action

The system SHALL provide a top-bar quick compose action.

#### Scenario: Activate quick compose

- **WHEN** the user activates the top compose icon
- **THEN** the new conversation flow opens
- **AND** the user can choose an agent before creating the conversation

### Requirement: App identity

The system SHALL show the app identity in the top chrome.

#### Scenario: App identity visible

- **WHEN** the workspace opens
- **THEN** the top area shows the `f5` identity in the same visual weight as the approved concept

### Requirement: Top bar accessibility

The system SHALL expose accessible names for top-bar controls.

#### Scenario: Computer Use inspects top bar

- **WHEN** Computer Use captures the accessibility tree
- **THEN** search and quick compose controls are discoverable by stable names
