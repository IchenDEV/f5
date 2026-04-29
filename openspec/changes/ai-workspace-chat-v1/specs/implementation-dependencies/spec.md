## ADDED Requirements

### Requirement: Fixed runtime dependencies

The system SHALL use the fixed dependency set for first-version implementation.

#### Scenario: Add runtime dependencies

- **WHEN** dependencies are added for the MVP
- **THEN** the app uses `gray-matter` for frontmatter parsing, `zod` for runtime validation, `react-markdown` with `remark-gfm` and `rehype-sanitize` for Markdown rendering, Tailwind CSS v4 for styling, shadcn/ui source components for interface primitives, and `lucide-react` for icons

### Requirement: Tailwind CSS renderer setup

The system SHALL use Tailwind CSS v4 through the Vite plugin in the Electron renderer.

#### Scenario: Configure renderer styling

- **WHEN** the renderer build is configured
- **THEN** `@tailwindcss/vite` is included in the renderer plugin list
- **AND** `src/renderer/styles.css` imports Tailwind CSS, `tw-animate-css`, and shadcn theme CSS
- **AND** the app uses Tailwind utility classes and semantic shadcn theme variables for shared visual styling

### Requirement: shadcn/ui source component setup

The system SHALL use shadcn/ui as source-owned React components for common UI primitives.

#### Scenario: Configure shadcn

- **WHEN** UI implementation begins
- **THEN** `components.json` points shadcn output to `src/renderer/components/ui`
- **AND** `style` is `radix-nova`
- **AND** `iconLibrary` is `lucide`
- **AND** `src/renderer/lib/utils.ts` exports `cn()` using `clsx` and `tailwind-merge`

### Requirement: shadcn component preference

The system SHALL prefer shadcn/ui primitives before writing custom repeated UI controls.

#### Scenario: Build repeated controls

- **WHEN** the app needs buttons, cards, dialogs, sheets, menus, inputs, tabs, badges, avatars, separators, scroll areas, tooltips, popovers, progress indicators, or skeleton loading states
- **THEN** the implementation uses the matching shadcn/ui component from `src/renderer/components/ui`
- **AND** business components compose those primitives with Tailwind layout utilities

### Requirement: Built-in Node APIs for local platform work

The system SHALL use built-in Node APIs for local file, id, and subprocess operations where sufficient.

#### Scenario: Implement storage and process work

- **WHEN** file storage, atomic writes, ids, or ACP subprocess handling are implemented
- **THEN** the app uses `node:fs/promises`, `node:path`, `node:crypto`, and `node:child_process`
- **AND** it does not add a database, ORM, or UUID dependency for the first version

### Requirement: Fixed test dependencies

The system SHALL use a fixed lightweight test setup for the MVP.

#### Scenario: Add test dependencies

- **WHEN** tests are added
- **THEN** the app uses `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, and `@testing-library/jest-dom`

### Requirement: No heavy UI framework beyond source components

The system SHALL avoid adding a heavy runtime UI framework for the first version.

#### Scenario: Build UI components

- **WHEN** workspace UI components are implemented
- **THEN** the app uses local React business components, Tailwind CSS, shadcn/ui source components, shared theme variables, and `lucide-react` icons
- **AND** it does not add a separate full runtime component framework unless a later change explicitly approves it

### Requirement: Dependency documentation

The system SHALL document dependency choices in the implementation notes.

#### Scenario: Dependency added

- **WHEN** a dependency is added to `package.json`
- **THEN** its purpose is reflected in the dependency task or implementation note
