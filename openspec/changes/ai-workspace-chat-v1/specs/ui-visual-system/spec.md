## ADDED Requirements

### Requirement: Design token baseline

The system SHALL define reusable UI tokens for color, spacing, border, shadow, radius, typography, and motion.

#### Scenario: Component uses shared tokens

- **WHEN** a workspace component is implemented
- **THEN** it uses Tailwind CSS utility classes, shadcn theme variables, and shared semantic tokens instead of one-off visual values for common surfaces, borders, text colors, spacing, and status colors

### Requirement: shadcn visual primitives

The system SHALL use shadcn/ui primitives for repeated controls and panels.

#### Scenario: Render common UI controls

- **WHEN** the app renders buttons, cards, dialogs, sheets, menus, inputs, tabs, badges, avatars, separators, scroll areas, tooltips, popovers, progress indicators, or skeleton states
- **THEN** those controls are built from shadcn/ui components installed under `src/renderer/components/ui`
- **AND** product-specific components only add layout, data binding, and domain states around those primitives

### Requirement: Typography scale

The system SHALL use a compact typography scale suited for a repeated-use desktop workspace.

#### Scenario: Dense panel text remains readable

- **WHEN** the user views conversation rows, message metadata, plan rows, tool rows, and session details
- **THEN** text is readable without oversized headings or browser-default button text

### Requirement: Status color language

The system SHALL use a consistent color language for connected, running, queued, warning, failed, and inactive states.

#### Scenario: Same status across panels

- **WHEN** an agent is running in the conversation list, chat timeline, and progress panel
- **THEN** each place uses the same running status color and label treatment

### Requirement: Icon control treatment

The system SHALL use familiar icon buttons for compact workspace actions.

#### Scenario: Header action controls

- **WHEN** the user views conversation header actions
- **THEN** favorite, export, more, close, and copy-style actions render as icon buttons with accessible names

### Requirement: Concept fidelity

The system SHALL treat `assets/ui-concept-v1.png` as the functional element reference for the first implementation.

#### Scenario: UI visual review

- **WHEN** the first UI implementation is reviewed
- **THEN** required elements, panes, controls, and states are compared against the concept
- **AND** differences are either fixed or documented as intentional changes

### Requirement: Default light visual reference image

The system SHALL treat `assets/ui-concept-v3-light-reference.png` as the default light visual style reference for the first workspace UI.

#### Scenario: Build light workspace style

- **WHEN** the first workspace UI is implemented
- **THEN** the UI follows the reference image's pale macOS window, off-white main surface, large rounded main panel, subtle shadows, thin light borders, compact toolbar icons, graphite text, blue-violet active states, green connection state, and amber queued state
- **AND** `assets/ui-concept-v1.png` remains the functional element checklist for conversation list, chat flow, composer, agent panel, and profile entry coverage

### Requirement: Dark mode visual reference image

The system SHALL treat `assets/ui-concept-v2-dark-reference.png` as the dark mode visual style reference for the first workspace UI.

#### Scenario: Build dark workspace style

- **WHEN** dark mode is active
- **THEN** the UI follows the reference image's dark graphite macOS window, large rounded main surface, subtle borders, compact toolbar icons, low-contrast secondary text, blue-violet active states, green connection state, and amber queued state
- **AND** dark mode uses the same component hierarchy, spacing, and interaction states as the default light UI

### Requirement: Theme mode support

The system SHALL support both light mode and dark mode with shared shadcn/Tailwind theme variables.

#### Scenario: Switch theme mode

- **WHEN** the app theme changes between light mode and dark mode
- **THEN** shared CSS variables update surfaces, text, borders, rings, muted areas, status colors, and shadows
- **AND** message content, composer controls, conversation rows, and agent panel details remain readable in both modes

### Requirement: No marketing layout

The system SHALL open directly into the working app interface.

#### Scenario: First screen

- **WHEN** the app starts
- **THEN** the first screen is the workspace UI
- **AND** there is no marketing hero, feature grid, or onboarding page before the workspace
