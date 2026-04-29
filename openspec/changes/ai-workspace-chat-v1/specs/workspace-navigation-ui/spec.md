## ADDED Requirements

### Requirement: Left navigation rail

The system SHALL provide a fixed left navigation rail matching the approved concept.

#### Scenario: Navigation rail renders

- **WHEN** the workspace opens
- **THEN** the rail shows workspace section icons, the active chat section, settings entry, and user avatar entry
- **AND** the rail remains visible at desktop width

### Requirement: Active navigation state

The system SHALL show which workspace section is active.

#### Scenario: Chat section active

- **WHEN** the user is viewing conversations
- **THEN** the chat icon is visually active
- **AND** inactive icons keep hover and focus states

### Requirement: Section navigation actions

The system SHALL give every navigation rail icon a defined action.

#### Scenario: User activates a rail icon

- **WHEN** the user activates chat, workspace overview, agents, or settings
- **THEN** the app opens that section or a first-version placeholder panel with a clear title and return path
- **AND** no rail icon is inert

### Requirement: User avatar entry

The system SHALL use the bottom avatar as the entry to the user's profile page.

#### Scenario: Open user profile

- **WHEN** the user activates the bottom avatar
- **THEN** the app opens the user profile page or panel
- **AND** the profile page shows user identity and workspace preferences

### Requirement: Navigation accessibility

The system SHALL expose accessible names for all navigation rail controls.

#### Scenario: Computer Use inspects rail controls

- **WHEN** Computer Use reads the accessibility tree
- **THEN** each rail control has a stable accessible name
- **AND** keyboard focus can move through the rail controls
