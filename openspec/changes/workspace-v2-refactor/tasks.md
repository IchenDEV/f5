## 1. Baseline

- [x] 1.1 Add this OpenSpec change.
- [x] 1.2 Record clean typecheck, lint, test, and OpenSpec baseline.
- [x] 1.3 Add app shell and chat focused tests for navigation, errors, send, entity opening, and panel toggle.

## 2. Renderer Refactor

- [x] 2.1 Move app state and routing into `src/renderer/app/`.
- [x] 2.2 Move chat UI into `src/renderer/features/chat/`.
- [x] 2.3 Split TODO and Docs into feature-specific modules.
- [x] 2.4 Add shared resource/workbench primitives.

## 3. API And Main Refactor

- [x] 3.1 Add v2 renderer API wrapper.
- [x] 3.2 Add v2 preload namespace.
- [x] 3.3 Move storage primitives out of the monolithic store.
- [x] 3.4 Split main store responsibilities by domain while preserving facade behavior.
- [x] 3.5 Use `workspace-v2` as the app data directory.

## 4. UI And Docs

- [x] 4.1 Apply unified workbench visual styling.
- [x] 4.2 Update README to describe v2 structure and data path.
- [x] 4.3 Run final verification.
