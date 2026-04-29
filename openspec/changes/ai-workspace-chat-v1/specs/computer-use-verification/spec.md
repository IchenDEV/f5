## ADDED Requirements

### Requirement: Computer Use verification pass

The system SHALL include a Computer Use verification pass for the implemented Electron app.

#### Scenario: Start desktop verification

- **WHEN** the app is implemented and `pnpm dev` is running
- **THEN** verification uses Computer Use to inspect the real Electron app window
- **AND** verification records the app name or bundle identifier used for inspection

### Requirement: Window screenshot and accessibility state

The system SHALL verify the workspace through both screenshot and accessibility tree state.

#### Scenario: Inspect main window

- **WHEN** Computer Use captures the app state
- **THEN** the screenshot shows the workspace shell
- **AND** the accessibility tree exposes controls for conversation list, chat composer, send action, and agent panel controls

### Requirement: Primary desktop interaction path

The system SHALL verify the main chat path through real desktop interactions.

#### Scenario: Create and send through Computer Use

- **WHEN** Computer Use clicks the new conversation control, types a prompt, and activates send
- **THEN** the prompt appears in the message timeline
- **AND** the composer remains ready for the next prompt

### Requirement: Conversation switching verification

The system SHALL verify conversation switching through Computer Use clicks.

#### Scenario: Switch active conversation

- **WHEN** Computer Use clicks a different conversation row
- **THEN** the active row, chat header, message timeline, and agent panel update to that conversation

### Requirement: Queue state verification

The system SHALL verify queued prompt behavior through Computer Use.

#### Scenario: Submit while agent is busy

- **WHEN** Computer Use submits a second prompt while the active turn is running
- **THEN** the timeline shows a queued prompt card
- **AND** the queue count or queued state is visible

### Requirement: Agent panel verification

The system SHALL verify the right agent panel through Computer Use.

#### Scenario: Inspect agent progress panel

- **WHEN** the active conversation has plan or tool activity
- **THEN** Computer Use verifies agent identity, connection state, plan entries, tool rows, and ACP session details are visible

### Requirement: Profile page verification

The system SHALL verify user and agent profile pages through Computer Use.

#### Scenario: Open profile pages

- **WHEN** Computer Use opens the user profile from the bottom avatar and the agent profile from the right panel
- **THEN** each profile page displays identity fields and a path back to the active conversation
- **AND** returning to the conversation preserves the active conversation context

### Requirement: Responsive desktop verification

The system SHALL verify at least one resized or narrow-window state through Computer Use or a paired browser automation step.

#### Scenario: Verify narrow layout

- **WHEN** the app is viewed in a narrow window
- **THEN** the active chat and composer remain usable
- **AND** conversation list and agent panel controls remain reachable

### Requirement: Verification evidence

The system SHALL keep a short verification note for the Computer Use pass.

#### Scenario: Record evidence

- **WHEN** Computer Use verification completes
- **THEN** the verification note lists inspected flows, screenshot paths if captured, app state checks, failures found, and fixes made
