# Roadmap

Status: Pre-alpha desktop foundation. Stages are ordered by dependencies, without
release dates. Desktop preview, a Node CLI proof and experimental one-off Tasks
runs exist. Saved notes agents and SQLite history are implemented experimentally;
reviewed export, editable tool/limit configuration and release gates remain open.

## Stage 0 — Foundation

Deliverables: [product brief](PRODUCT.md),
[ADR-001](docs/adr/ADR-001-local-architecture.md), contribution and community
files, truthful capability map, and automated documentation checks.

Owner decisions still to record:

- [ ] Owner reviews the first scenario and proposed architecture.
- [ ] Owner confirms the existing MIT license policy.
- [ ] Owner configures private security and conduct reporting channels.

## Stage 0.1 — Desktop foundation

- [x] Electron shell, React navigation, explicit Coming soon states, loading and errors.
- [x] Strict TypeScript workspaces and provider/storage contracts without fake adapters.
- [x] Context isolation, sandboxed preload, restrictive CSP, and a validated IPC operation.
- [x] Unit/component checks and an Electron smoke test; Windows-first CI configuration.
- [x] Bounded notes authoring/execution delivered in experimental Stage 1/2 slices; broader MVP gates stay open.

## Presentation preview — independent of runtime gates

- [x] Original four-desk PixiJS office, typed event projection, and responsive inspector.
- [x] Explicit deterministic Demo Mode, empty default, no provider or database calls.
- [x] Keyboard selection and camera, text/symbol statuses, and reduced-motion support.
- [x] Unit/component status tests and real-canvas Electron/a11y smoke assertions.

This UI work does not complete any provider or MVP gate. See the
[pixel office](docs/OFFICE.md) for provenance, controls, and verification limits.
The actual office runtime feed remains future work. Tasks now shows real typed
events and results through a separate bridge without connecting the office.

## Stage 1 — Provider and execution proof

- [x] Define an adapter contract and a minimal agent definition.
- [x] Complete a real local model call; document provider/model prerequisites.
- [x] Exercise tool calls against approved fixture notes through the real adapter.
- [x] Verify bounded reads, symlink/path traversal rejection, and no shell tool.
- [x] Demonstrate timeout, cancellation, exhausted limits, and provider errors.

Exit evidence: reproducible commands, provider/model versions, sanitized real
run output, and meaningful contract and permission tests. A fake adapter is useful
for tests but cannot satisfy this gate.

Stage 1 evidence: [real local proof guide](docs/OLLAMA_PROOF.md) and
[sanitized run with source hashes and failure controls](docs/proofs/ollama-notes-2026-10-22.json),
2026-10-22 on managed Debian x64/CPU. This closes the experimental CLI proof only;
Windows inference, arbitrary model quality and the full desktop MVP are not claimed.

## Stage 2 — First usable MVP

Experimental slice: [desktop notes run](docs/DESKTOP_NOTES.md), governed by
[ADR-004](docs/adr/ADR-004-desktop-notes-permission.md), implements a native folder
preview, one-use permission, bounded worker execution, cancellation and an
current-session result/history. [ADR-005](docs/adr/ADR-005-local-persistence.md) and
the [local storage guide](docs/LOCAL_STORAGE.md) add saved definitions, immutable run
snapshots, SQLite migrations and explicit deletion. Real Electron/provider evidence
is tracked separately from unit mocks; this is not a full MVP/release claim.

- [x] Create, edit, save, and reload one bounded notes agent definition in a local interface.
- [x] Persist definitions and run events in SQLite with tested migrations.
- [x] Run a saved notes agent end to end and reload exact history; validate public source hashes/references.
- [x] Show running, completed, failed, and cancelled states with readable errors (experimental Tasks flow with saved history).
Evidence: [actual Windows saved-agent/SQLite run](docs/proofs/sqlite-notes-2026-10-22.json),
including completed/cancelled records after restart; manual accessibility remains open.

- [ ] Export a reviewed result only on explicit user action.
- [ ] Document installation, limits, secret handling, backup, and recovery.

Exit evidence: a new user can follow installation instructions and complete the
[product scenario](PRODUCT.md) with a real provider. Publish a release only after
those checks and a review of local API access controls.

## Stage 3 — Broaden deliberately

Consider a second provider adapter after capability and error contract tests.
An optional pixel workspace must reflect actual run events and remain replaceable.
Expand tools only with explicit permission boundaries and evidence of need.

## Stage 4 — Shared operation, if justified

Revisit authentication, authorization, tenancy, concurrency, deployment, and
PostgreSQL in a new ADR before enabling remote/team use. MySQL requires a concrete
deployment need and its own migration and compatibility evidence. Neither backend
is currently supported. Multi-agent work needs a separately scoped proposal.
