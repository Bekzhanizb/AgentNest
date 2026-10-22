# ADR-001: Local execution, provider adapters, and persistence

- Status: Proposed; owner review pending.
- Date: 2026-10-21.
- Scope: architecture for the first [product scenario](../../PRODUCT.md).
- Implementation status: a desktop shell and isolated experimental Node CLI now
  exist. [ADR-002](ADR-002-desktop-foundation.md) refines the proposed browser/API
  transport to Electron and narrow IPC. [ADR-003](ADR-003-ollama-notes-proof.md)
  records the limited real-provider proof. Saved editing, desktop execution and
  databases remain unimplemented; the broader proposal below is not an MVP claim.

## Context

The first user needs to define and run one inspectable agent over local notes.
A service-heavy deployment would increase setup cost before the core workflow is
proven. Coupling execution to pixel animation or a provider SDK would make testing
and later provider changes unnecessarily difficult.

## Proposed decision

Start with a modular monolith: a local Node.js/TypeScript process serving a local
browser interface and owning agent execution and persistence. The UI framework
and exact libraries remain open until the execution proof. No cloud service is
required by the proposed architecture.

```text
Local browser UI (agent editor, run inspector; optional pixel view later)
  -> loopback API (access checks, explicit user actions)
  -> application services (agent definitions, run lifecycle)
  -> bounded agent runner
       -> provider adapter -> configured model endpoint
       -> permitted read-only notes tool
       -> persistence interface -> SQLite
```

The runner owns the tool loop, state transitions, tool allowlist, and limits on
steps, time, input/output sizes, and provider context. It records real events;
renderers consume those events and cannot create evidence of completed work.
Persist terminal errors and cancellation as outcomes, not successful responses.

Bind to loopback by default. Require local API access controls, validate origins,
and protect state-changing requests before shipping the browser interface;
loopback alone is not authentication. Remote access is outside MVP scope.
Canonicalize file paths, reject symlink escapes and traversal, and enforce size
limits at the tool boundary. Treat notes and model tool requests as untrusted.
No shell tool or provider-selected arbitrary tool execution is allowed in MVP.

### Provider boundary

Agent definitions reference a provider identifier and model plus capability
requirements; they never embed credentials or a provider SDK object. A provider
registry resolves an adapter. Only adapters import provider-specific clients.

The contract must cover messages, structured tool requests/results, capability
discovery, cancellation/timeouts, and normalized errors. Usage is optional and
must be marked unknown when the provider does not report it. Unsupported features
must fail clearly; silently dropping tool requests or pretending capability parity
is unacceptable. Streaming is a later extension, not an MVP requirement.

Propose one Ollama adapter for the first local run, with a model that demonstrably
supports the required tool protocol. The Stage 1 proof must establish its actual
behavior and hardware/model prerequisites; the CLI proof now records those in
[ADR-003](ADR-003-ollama-notes-proof.md), independently of desktop integration. Local
execution still requires a running model service and downloaded model assets.
Hosted providers may follow after the contract is tested. They will need explicit
data-egress disclosure, credentials, and provider-specific capability checks.

Keep secrets out of definitions, exports, logs, and database records. Decide the
OS-appropriate credential mechanism before introducing a credentialed provider.
Local notes and run records are sensitive; define retention, deletion, and redaction
before MVP release. Do not claim encryption at rest without implementing it.

### Database choice

| Option | Strength | Cost / constraint | Decision |
| --- | --- | --- | --- |
| SQLite | Embedded, no database service, simple local backup | One writer at a time; unsuitable as a shared network file | MVP default |
| PostgreSQL | Strong concurrency and server operations for team use | Separate service, credentials, backup and deployment work | Preferred candidate for a later shared mode |
| MySQL | Fits organizations already operating MySQL | Another dialect, migration path, and test matrix | Deferred until a concrete user need |

Use SQLite for saved agent definitions and run/event history. Keep model files,
credentials, and original note directories outside the database. Store source
references and only the run content needed for inspection, with explicit deletion.

Enable foreign-key enforcement and use versioned migrations. Evaluate WAL for the
local workload and handle busy writers explicitly. Back up through a consistent
SQLite backup mechanism; copying an active database file alone is insufficient
when WAL is in use. Document restore and migration recovery before MVP release.

Put persistence behind a repository interface with explicit transactions. This
separates domain behavior from SQL; it does not make SQL dialects interchangeable.
PostgreSQL/MySQL support requires backend-specific migrations, data export/import,
and integration tests. No ORM or database dependency is selected in this phase.

## Alternatives and consequences

- A renderer-first prototype can explore appearance but cannot validate agent
  creation or execution; it cannot meet MVP acceptance.
- Direct provider calls from the UI would expose secrets and mix permissions with
  presentation. Provider execution stays behind the local process boundary.
- PostgreSQL from day one would simplify some later concurrency concerns but
  introduces a service dependency for a single local user.
- Supporting all three databases immediately would expand verification effort
  before there is evidence users need it.

The chosen direction favors a small inspectable first workflow. It limits initial
concurrency and delays team features. Additional providers still require real
integration work; an adapter interface alone is not portability evidence.

## Delivery and revisit triggers

1. Foundation: review this proposal and the product brief; no application code.
2. Execution proof: one real provider, bounded reads, error/cancellation evidence.
3. MVP: local agent editor, SQLite history, end-to-end notes workflow, explicit export.
4. Expansion: another verified adapter and optional event-driven pixel view.
5. Shared use: a new ADR covering identity, tenancy, concurrent runners, PostgreSQL,
   and migrations. Consider MySQL only with a deployment requirement and maintainer.

Revisit this ADR if the first provider cannot meet tool requirements, local hardware
requirements exclude intended users, or validated shared-use requirements exceed
SQLite's local single-writer scope. Track exit evidence in the
[roadmap](../../ROADMAP.md), not by marking proposals as delivered features.
