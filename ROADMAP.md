# Roadmap

Status: Planning. Stages are ordered by dependencies, without release dates.
Only documents and documentation checks exist in this foundation change.

## Stage 0 — Foundation

Deliverables: [product brief](PRODUCT.md),
[ADR-001](docs/adr/ADR-001-local-architecture.md), contribution and community
files, truthful capability map, and automated documentation checks.

Before starting application work:

- [ ] Owner reviews the first scenario and proposed architecture.
- [ ] Owner confirms the existing MIT license policy.
- [ ] Owner configures private security and conduct reporting channels.

## Stage 1 — Provider and execution proof

- [ ] Define an adapter contract and a minimal agent definition.
- [ ] Complete a real local model call; document provider/model prerequisites.
- [ ] Exercise tool calls against approved fixture notes through the real adapter.
- [ ] Verify bounded reads, symlink/path traversal rejection, and no shell tool.
- [ ] Demonstrate timeout, cancellation, exhausted limits, and provider errors.

Exit evidence: reproducible commands, provider/model versions, sanitized real
run output, and meaningful contract and permission tests. A fake adapter is useful
for tests but cannot satisfy this gate.

## Stage 2 — First usable MVP

- [ ] Create, edit, save, and reload one agent definition in a local interface.
- [ ] Persist definitions and run events in SQLite with tested migrations.
- [ ] Run the notes-to-summary workflow end to end; validate source references.
- [ ] Show running, completed, failed, and cancelled states with readable errors.
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
