## ADDED Requirements

### Requirement: Renderer module boundaries

The system SHALL keep app shell, chat, task resources, document resources, and shared resource primitives in separate renderer modules.

#### Scenario: App entry remains small

- **WHEN** a developer opens `src/renderer/App.tsx`
- **THEN** it only wires global providers and the workspace shell
- **AND** chat, resource, and profile UI live in feature modules.

### Requirement: V2 API namespace

The system SHALL expose renderer operations through a typed v2 API wrapper.

#### Scenario: Renderer calls workspace snapshot

- **WHEN** renderer needs workspace state
- **THEN** it calls `f5Api.workspace.getSnapshot`
- **AND** source files do not import the old `src/renderer/lib/api.ts` wrapper.

### Requirement: Workspace v2 data path

The system SHALL use `workspace-v2` for new local development data.

#### Scenario: App starts

- **WHEN** Electron creates the workspace store
- **THEN** it points at `<userData>/workspace-v2`
- **AND** existing `<userData>/workspace` data is not modified.

### Requirement: Unified workbench UI

The system SHALL present Chat, Board, TODO, Docs, Profile, and Agents with consistent navigation, page density, empty states, and action placement.

#### Scenario: User changes sections

- **WHEN** the user switches sections from the left rail
- **THEN** search, primary action, content, and inspector regions keep the same visual rhythm
- **AND** controls do not overlap at desktop, tablet, or narrow widths.
