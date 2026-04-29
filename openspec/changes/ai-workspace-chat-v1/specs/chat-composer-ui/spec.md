## ADDED Requirements

### Requirement: Composer layout

The system SHALL provide a bottom composer that matches the approved concept density.

#### Scenario: Composer visible

- **WHEN** a conversation is active
- **THEN** the composer is fixed at the bottom of the chat area
- **AND** the message timeline can scroll behind it without hiding the latest content

### Requirement: Prompt submission

The system SHALL submit prompts from the composer using keyboard and button actions.

#### Scenario: Submit prompt

- **WHEN** the user enters text and activates send
- **THEN** the composer clears after the message is accepted by local state
- **AND** the prompt appears in the timeline immediately

### Requirement: Composer tabs

The system SHALL provide composer tabs for message mode and agent-context mode.

#### Scenario: Switch composer tab

- **WHEN** the user activates the Message or Agent tab
- **THEN** the composer shows the selected mode
- **AND** draft text is preserved when switching tabs

### Requirement: Queue-aware submit state

The system SHALL show whether a submitted prompt starts now or joins the queue.

#### Scenario: Agent busy during submit

- **WHEN** the active conversation is running an agent turn
- **THEN** the composer allows submit
- **AND** the new prompt appears as queued

### Requirement: Agent selector

The system SHALL show the active agent in the composer.

#### Scenario: Composer agent selector

- **WHEN** the user views the composer
- **THEN** the active agent name and connection status are visible near the send control

### Requirement: Markdown mode

The system SHALL expose a Markdown mode indicator or selector.

#### Scenario: Markdown mode visible

- **WHEN** the composer is idle
- **THEN** the composer shows that prompts are authored as Markdown-compatible text

### Requirement: Attachment and tool action entries

The system SHALL reserve compact entries for attachment and developer-oriented actions.

#### Scenario: Composer action row

- **WHEN** the composer is visible
- **THEN** attachment, code, and layout-style actions appear as compact icon controls
- **AND** unavailable actions are disabled with accessible labels

### Requirement: Send split button

The system SHALL provide a primary send action with a secondary send menu.

#### Scenario: Send menu opens

- **WHEN** the user activates the secondary send segment
- **THEN** the composer shows available send options
- **AND** unavailable send options are disabled with a short reason
