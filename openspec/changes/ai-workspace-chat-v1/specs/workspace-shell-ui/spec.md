## ADDED Requirements

### Requirement: Three-pane workspace layout

The system SHALL provide a three-pane desktop workspace layout for the first version.

#### Scenario: Open main workspace

- **WHEN** the app opens
- **THEN** the UI shows a conversation list, active chat area, and agent progress panel
- **AND** the first screen is the usable workspace, not a landing page

### Requirement: Workspace top bar

The system SHALL provide a compact top bar for workspace-level actions.

#### Scenario: Top bar renders

- **WHEN** the main workspace is visible
- **THEN** the top bar shows the app identity, search entry, and workspace action controls
- **AND** the top bar does not reduce the visible height of the active chat beyond the concept layout

### Requirement: Workspace panel boundaries

The system SHALL use stable panel widths and visible dividers that match the approved concept.

#### Scenario: Desktop panel widths

- **WHEN** the workspace is displayed at desktop width
- **THEN** the left navigation rail, conversation list, chat area, and agent panel keep stable widths
- **AND** hovering or state changes do not shift the layout

### Requirement: Active conversation header

The system SHALL show the active conversation title, agent, connection state, and conversation actions in the chat header.

#### Scenario: Header reflects active conversation

- **WHEN** the user switches conversations
- **THEN** the chat header updates to the selected conversation title, agent name, and connection state

### Requirement: Global status feedback

The system SHALL show app-level loading and error feedback without hiding the active conversation.

#### Scenario: Storage scan fails

- **WHEN** conversation loading fails
- **THEN** the workspace shows a readable error state
- **AND** the app still offers a retry action

### Requirement: First UI concept reference

The system SHALL keep a reviewed UI concept image as the visual reference for the first workspace implementation.

#### Scenario: Design concept exists

- **WHEN** implementation begins
- **THEN** a UI concept image is available for the workspace shell
- **AND** implementation uses it as the visual reference unless the user asks for changes
