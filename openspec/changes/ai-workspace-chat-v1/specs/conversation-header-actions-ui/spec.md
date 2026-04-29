## ADDED Requirements

### Requirement: Conversation title menu

The system SHALL provide a title menu in the chat header.

#### Scenario: Open title menu

- **WHEN** the user activates the title dropdown
- **THEN** the app shows conversation details, rename action, archive action, and file location action

### Requirement: Rename conversation

The system SHALL allow users to rename the active conversation from the header menu.

#### Scenario: Rename active conversation

- **WHEN** the user changes the conversation title
- **THEN** the title updates in the header, conversation list, and `conversation.md` frontmatter

### Requirement: Star conversation

The system SHALL allow users to mark a conversation with a star.

#### Scenario: Toggle star

- **WHEN** the user activates the star action
- **THEN** the conversation star state updates visually
- **AND** the state is persisted in conversation metadata

### Requirement: Share or export action

The system SHALL provide a share or export action for the active conversation.

#### Scenario: Export conversation

- **WHEN** the user activates the share/export action
- **THEN** the app offers a Markdown export path for the active conversation
- **AND** the export includes conversation metadata and messages

### Requirement: More menu actions

The system SHALL provide a more menu for secondary conversation actions.

#### Scenario: Open more menu

- **WHEN** the user activates the more action
- **THEN** the app shows secondary actions such as duplicate, reveal files, archive, and delete
- **AND** destructive actions require confirmation

### Requirement: Header action accessibility

The system SHALL expose accessible names for all chat header icon controls.

#### Scenario: Inspect header controls

- **WHEN** Computer Use reads the chat header
- **THEN** title menu, star, share/export, and more controls are discoverable by stable names
