## ADDED Requirements

### Requirement: Codex ACP discovery

The system SHALL attempt to discover a real Codex ACP adapter before final verification.

#### Scenario: Discover configured Codex ACP

- **WHEN** verification runs on a developer machine
- **THEN** the app checks user-configured agents, shell commands, and known editor registry hints for a Codex ACP adapter
- **AND** the discovery result records which candidate was found or why none was usable

### Requirement: Codex ACP candidate order

The system SHALL use a deterministic candidate order for Codex ACP discovery.

#### Scenario: Resolve Codex ACP candidate

- **WHEN** no explicit user agent config is present
- **THEN** discovery checks `codex-acp` command first
- **AND** then checks whether the installed `codex` CLI exposes an ACP-compatible mode
- **AND** then records editor registry hints such as a Zed `codex-acp` registry entry as non-shell hints that still need a runnable adapter command

### Requirement: Codex ACP handshake

The system SHALL verify a discovered Codex ACP adapter with a real ACP initialization handshake.

#### Scenario: Handshake succeeds

- **WHEN** a Codex ACP candidate command is runnable
- **THEN** the app starts it over stdio and sends `initialize`
- **AND** records protocol version, capabilities, command, cwd, and initialization time

### Requirement: Codex ACP prompt verification

The system SHALL run a minimal real prompt verification when Codex ACP handshake succeeds.

#### Scenario: Real Codex prompt turn

- **WHEN** the Codex ACP adapter initializes successfully
- **THEN** the app creates a session, sends a short prompt, records `session/update` events, and persists the resulting messages
- **AND** the verification note marks real Codex ACP as passed

### Requirement: Codex ACP failure does not block MVP

The system SHALL keep real ACP verification as the required MVP baseline when real Codex ACP is unavailable.

#### Scenario: Codex ACP unavailable

- **WHEN** no runnable Codex ACP adapter is discovered or handshake fails
- **THEN** the verification note records the command checked and error summary
- **AND** real ACP smoke test and Computer Use verification remain required
- **AND** the app does not claim real Codex ACP support

### Requirement: Codex ACP profile display

The system SHALL show real Codex ACP status in the Agent Profile page when configured or discovered.

#### Scenario: View Codex agent profile

- **WHEN** the user opens the Codex Agent Profile page
- **THEN** it shows discovered command, availability, last handshake result, capability summary, and last verification time
