# Changelog

Changes are recorded using [these conventions](docs/CHANGELOG_CONVENTIONS.md).
There are no product releases yet.

## [Unreleased]

### Changed

- Refined the office with a warm light palette, forest navigation, original SVG
  icons, matching procedural character portraits, clearer cards and inspector.
- Added workspace skip/focus navigation, inspector focus/return, forced-colors and
  coarse-pointer support; fictional demo labels remain persistent.
- Made production-browser UI review reproducible with keyboard, responsive, touch
  emulation and axe checks alongside the secure Electron smoke in Windows CI.
- Documented open manual NVDA, physical touch, contrast-theme and zoom review gates.

### Added

- Local notes-agent editor with explicit save/edit/delete, fixed tools/limits, and
  versioned immutable definitions selected from Tasks without reusable file permission.
- Built-in SQLite adapter behind a repository boundary: transactional migrations,
  saved real run events/results, interrupted recovery, bounded retention and explicit
  deletion. Local storage is unencrypted; offline backup/recovery is documented.
- Actual-file persistence tests and Electron editor/history restart checks; the
  opt-in live workflow verifies persisted provider results separately from mocks.

- Experimental desktop Tasks notes run with native folder metadata review, explicit
  one-use expiring permission, strict IPC/snapshot validation, and a Node worker.
- Actual runtime status/history, inert source-linked text, source hashes, model
  identity, cancellation, worker deadlines and in-memory session clearing.
- Permission mutation/replay/crash tests, actual Electron bridge/worker checks,
  responsive Tasks accessibility checks, and a separate real-provider proof workflow.

- Isolated Node CLI Ollama notes proof, backend-only adapter and SDK ToolLoopAgent
  runner, typed actual run events and core view projection, read-only grants,
  source hashes/citations, cancellation and bounded failure outcomes.
- Explicit real-provider evidence and mock-model permission/contract tests; desktop
  office remains empty by default and independent of inference and databases.
- Keyboard-only browser lifecycle and live reduced-motion regression coverage.

- Original procedural PixiJS office with four desks, lounge, coffee nook, lighting,
  characters, selection, inspector, bounded pan/zoom, and responsive text controls.
- Typed AgentEvent/AgentViewModel projection, all five status displays, and explicit
  deterministic Demo Mode; the default office remains empty with no runtime calls.
- Keyboard navigation, reduced-motion handling, graphics-failure fallback, status
  tests, and real-canvas Electron smoke with an axe accessibility scan.

- Pre-alpha Electron/React desktop shell with Office, Agents, Tasks, and Settings
  navigation, real application information, and explicit Coming soon content.
- Strict TypeScript npm workspaces, sandboxed preload, validated IPC, and a local
  asset protocol with restrictive production CSP.
- Vitest checks, an Electron e2e smoke, Windows/PowerShell CI, and Dependabot proposals.
- Planning product brief, staged roadmap, and proposed local architecture ADR.
- English README, Russian overview, and repository instructions.
- Contribution, conduct, security, issue, and pull request guidance.
- Proposed label catalog, licensing note, and unpublished communications drafts.
- Markdown, local-link, and repository-structure validation with a CI workflow.
