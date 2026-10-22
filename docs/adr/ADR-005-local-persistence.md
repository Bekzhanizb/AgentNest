# ADR-005: Saved notes agents and local SQLite history

- Status: Implemented experimental slice; full MVP/release remains open.
- Date: 2026-10-22.
- Refines: [ADR-001](ADR-001-local-architecture.md) and
  [ADR-004](ADR-004-desktop-notes-permission.md).

## Decision and boundaries

Use npm workspaces and the pinned Node 24/Electron 45 built-in node:sqlite.
No ORM, external driver, native ABI rebuild or dependency upgrade is needed.
packages/storage defines the repository contract; packages/storage-sqlite owns
SQL/migrations. The main process owns a single adapter and an application service.
Renderer/preload/core never import SQLite or filesystem APIs. Provider SDKs remain
in the existing Node worker and adapter, separate from storage and Pixi.

```text
React Agents / Tasks history -> six named, validated preload library operations
  -> trusted top-level-frame main handler -> LibraryService -> repository -> SQLite

Tasks start -> saved ID/revision lookup -> native permission -> immutable definition
  -> Node worker -> real runtime events -> owner validation -> SQLite transaction
  -> current Tasks snapshot (Office Demo Mode stays independent)
```

Saved definitions include name, instructions, Ollama model, revision and timestamps.
Provider, read-only tool and budgets remain fixed. This is authoring for the proven
notes scenario, not arbitrary agent orchestration. Model availability is checked
only by the actual runner, never fabricated when saving. Instructions cannot add
tools, permission, providers or larger limits. Full editor scope/export remains later work.

Start adds an optional exact saved-agent ID/revision beside the existing grant/model/
literal consent. Main resolves it before native confirmation and checks again after
the asynchronous dialog. Stale definitions/models fail without launching. The worker
receives the consented immutable definition, never renderer-supplied instructions.
Subsequent edits/deletion do not alter a running definition or historical snapshot.
Folder approval, root identities and one-use grants remain ephemeral under ADR-004.

## Database and lifecycle

The adapter opens agentnest.sqlite in main-owned userData. Single-instance ownership
avoids competing app writers. Prepared bindings, foreign keys, STRICT tables,
extension denial, trusted_schema off, defensive mode, quick_check and bounded row/
event decoding are enabled. POSIX files receive mode 0600; Windows uses profile ACLs,
without a claim of encryption or a custom Windows ACL implementation.

Two ordered migrations create definitions (v1) then runs/events (v2), tracked with
application_id/user_version and one BEGIN IMMEDIATE transaction. Failures roll back.
Unknown/newer/unrelated/corrupt databases fail closed, preserving data for recovery.
Startup validates all bounded records before classifying unfinished runs Interrupted.
This classification is recovery metadata, not a fabricated runtime terminal event.

Small bounded synchronous transactions run in main: at most 32 agents, 100 runs and
32 events per run, with instructions at most 4000 and generated output 4096 characters.
Busy timeout is one second; main can pause during a busy/slow write. Move persistence
to a dedicated owner thread before expanding retention/workload. WAL is deliberately
deferred: one local writer and short transactions do not justify its backup/sidecar
complexity now. DELETE journaling and secure_delete are selected. No forensic-erasure
guarantee is made. This does not establish support for untrusted/shared database files.

Each validated runtime event is committed atomically with run state before publishing
it to the UI. A started record includes an immutable definition/revision snapshot.
Event sequence, identity, monotonic time and terminal state cannot be overwritten.
Main continues to validate provider/read/citation semantics before persistence.
No fake/demo events enter this service. History contains actual attempts, including
failure/cancellation, not only successful summaries.

Normal reload/close cancels before clearing the in-memory session. Abrupt termination
can lose uncommitted work; previously committed running records become Interrupted
on next startup. An unexpected write error stops work, surfaces storage unavailability
and blocks further runs until restart/recovery. It cannot publish successful completion
as though it was saved. Permission review or a worker failing before its first event
does not produce a fabricated history entry.

## Retention and consequences

Retention/deletion/unencrypted storage are disclosed before permission and in the
editor/history. The app stores instructions, generated output, relative source names/
hashes and real events, not native grant IDs, selected roots, approval metadata,
original note bodies, credentials or weights. User text/output may still contain
sensitive material. The local daemon and OS have separate retention.

No automatic pruning: full history blocks new runs until explicit deletion. Agent
deletion sets the live run FK null, preserving its snapshot. Run deletion cascades
events; Clear session never deletes history. Deletion is confirmed in UI and blocked
while running. There is no automatic backup, downgrade or repair. Offline backup/
restore and hot-journal precautions are in [Local storage](../LOCAL_STORAGE.md).

SQLite remains single-user/local. PostgreSQL/MySQL, cloud sync, credentials,
automatic resume, streaming persistence, arbitrary tools and reviewed export remain
deferred. A passing storage test is not a real-provider or accessibility claim.
See [Verification](../VERIFICATION.md) for actual commands and
[Accessibility](../ACCESSIBILITY.md) for the still-open manual Windows matrix.
