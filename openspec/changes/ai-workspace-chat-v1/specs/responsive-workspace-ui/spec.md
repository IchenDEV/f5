## ADDED Requirements

### Requirement: Desktop target layout

The system SHALL optimize the primary layout for desktop windows at or above 1280px width.

#### Scenario: Desktop width

- **WHEN** the app width is at least 1280px
- **THEN** left navigation, conversation list, chat area, and agent panel are visible together

### Requirement: Medium width layout

The system SHALL keep the active chat usable when the window is medium width.

#### Scenario: Medium width

- **WHEN** the app width is below the desktop threshold but still tablet-sized
- **THEN** the right agent panel collapses behind a toggle
- **AND** the active chat and conversation list remain visible

### Requirement: Narrow width layout

The system SHALL provide a narrow layout for small windows.

#### Scenario: Narrow width

- **WHEN** the app width is narrow
- **THEN** the conversation list and agent panel are reachable through toggles
- **AND** the active chat and composer remain usable

### Requirement: No text overflow

The system SHALL prevent visible text overflow in fixed UI controls.

#### Scenario: Long conversation title

- **WHEN** a conversation title or agent name is longer than the available width
- **THEN** the UI truncates or wraps it in a controlled way without overlapping adjacent controls

### Requirement: Stable composer on resize

The system SHALL keep composer controls stable during window resizing.

#### Scenario: Resize while composing

- **WHEN** the user resizes the window while typing
- **THEN** composer text remains intact
- **AND** send and agent controls remain reachable
