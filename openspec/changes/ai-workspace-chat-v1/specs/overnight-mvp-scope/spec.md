## ADDED Requirements

### Requirement: One-night MVP target

The system SHALL define a one-night MVP target that can be completed by an autonomous agent without additional product decisions.

#### Scenario: Agent starts implementation

- **WHEN** the agent starts implementation from this OpenSpec change
- **THEN** the agent can identify the required one-night MVP tasks before optional tasks
- **AND** the agent can defer optional work without blocking a usable local app

### Requirement: Required one-night scope

The one-night MVP SHALL include local Markdown conversations, the approved workspace UI, real Codex CLI chat, queued prompts, profile pages, and verification evidence.

#### Scenario: One-night scope check

- **WHEN** one-night implementation is reviewed
- **THEN** the app can create conversations, write Markdown files, send prompts to the real Codex CLI agent, show queued prompts, switch conversations, open profile pages, and pass smoke tests

### Requirement: Real Codex ACP verification preference

The one-night MVP SHALL attempt real Codex ACP verification when a runnable adapter exists on the machine.

#### Scenario: Runnable Codex ACP exists

- **WHEN** the implementation environment provides a runnable Codex ACP adapter
- **THEN** the agent runs the real Codex ACP handshake and minimal prompt verification before final handoff
- **AND** the verification note includes the result

### Requirement: Deferred scope

The one-night MVP SHALL defer real Claude Code or Codex ACP adapter integration when the adapter command is unavailable.

#### Scenario: Real adapter unavailable

- **WHEN** a real ACP adapter command is missing or fails initialization
- **THEN** the app marks that agent unavailable
- **AND** the real Codex CLI agent remains usable for product verification and tests

### Requirement: No blocking optional features

The system SHALL prevent optional features from blocking one-night completion.

#### Scenario: Optional feature is incomplete

- **WHEN** raw log viewer, archived conversation browsing, export, or advanced profile editing is incomplete
- **THEN** the feature shows a disabled or placeholder state with accessible text
- **AND** core chat, queue, file persistence, and verification still pass

### Requirement: One-night done criteria

The one-night MVP SHALL have explicit done criteria.

#### Scenario: Mark one-night implementation done

- **WHEN** the agent claims implementation is done
- **THEN** `pnpm check`, `pnpm build`, `pnpm smoke:product`, `pnpm smoke:codex-acp`, and Computer Use verification have all completed
- **AND** the verification note records any deferred optional items
