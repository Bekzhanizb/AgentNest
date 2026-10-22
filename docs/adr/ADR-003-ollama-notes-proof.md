# ADR-003: Isolated local notes proof

- Status: Implemented experimental CLI boundary; not a desktop integration or MVP.
- Date: 2026-10-22.
- Refines: [ADR-001](ADR-001-local-architecture.md) and
  [ADR-002](ADR-002-desktop-foundation.md).

Later evolution: [ADR-004](ADR-004-desktop-notes-permission.md) adds a dedicated
Tasks bridge to the same runner, while preserving this standalone CLI and office
isolation. This ADR records the original proof boundary.

## Context and decision

The office must remain useful without AI or a database. A separate Node CLI proves
the first notes workflow before adding privileged desktop IPC or persistence.
Retain the existing npm workspaces and root lockfile; another package manager or
application framework would add migration work without improving this boundary.

```text
apps/proof (explicit CLI command, abort signals, NDJSON output)
  -> packages/runtime (permission grant, run policy, SDK tool loop)
       -> packages/provider-sdk (model protocol and safe errors)
       -> adapter supplied by CLI: packages/provider-ollama -> loopback Ollama
  -> packages/core (RunEvent -> AgentEvent -> AgentViewModel)

apps/desktop -> core + office-scene (presentation remains independent)
packages/storage (contract only; no database adapter)
```

Use AI SDK's built-in ToolLoopAgent, with explicit stop conditions, zero retries,
sequential tool execution, and one read_note tool. Runtime owns grants, limits,
source checks, cancellation and terminal outcomes. The adapter owns provider HTTP,
metadata and native model construction. Core imports no SDK and remains pure.
ESLint forbids runtime/provider SDK imports in core, renderer and office code.

Pin AI SDK 7.0.148, its V4 provider protocol 4.0.31, native community Ollama adapter
4.0.1, and Zod 4.6.7. Registry metadata, installed source and bundled SDK docs were
checked together. The Ollama adapter is community maintained, not an official
Ollama SDK. Native /api/chat supplies local model options and tool calls; a model
object is always supplied, so no hosted gateway model resolution is used.
Existing dependency versions are retained. Licenses are recorded in the
[licensing note](../LICENSING.md).

## Boundaries

Only literal IPv4/IPv6 loopback HTTP is accepted, with no credentials, query,
fragment or path prefix. Redirects are denied; requests and responses are bounded.
Metadata must identify an installed GGUF model declaring tool support, with a
manifest digest. Cloud tags and remote routing metadata are rejected. Installation,
model downloads, daemon configuration and cloud disabling are explicit operator
prerequisites, not application side effects. Loopback does not authenticate a
daemon; use a trusted local service and approved public notes for this experiment.

The caller grants one canonical directory, with at most four flat Markdown files.
Reject traversal, unapproved names, symlinks, hard links and non-regular files;
check opened-file and root identity, UTF-8, bytes, and source hashes. There is no
write, shell, publishing, recursive filesystem, dynamic tool or arbitrary URL tool.
This is an application permission boundary, not an OS sandbox against a malicious
same-user process racing parent directories or replacing the daemon.

RunEvent version 1 records actual lifecycle facts with runtime origin, run ID,
monotonic sequence and elapsed time. Model calls and successful tool reads produce
events. Only an actual summary citing every read input can complete the proof.
After all notes are read, the SDK removes active tools for the answer step.
Cancellation, timeout, invalid requests, unsupported responses and exhausted
budgets terminate without a completion event. Missing usage is null, never invented.
Reference checks establish source identity and citation presence, not semantic
correctness or prompt-injection immunity; output still needs human review.

The CLI prints the real event and its pure text-view projection. It exposes no
desktop bridge and makes no character animation simulate completion. An IPC
decoder, agent editor, consent UI, persistence and export remain later work.

## Type checking and consequences

Project source keeps strict, exactOptionalPropertyTypes and noUncheckedIndexedAccess.
The installed AI SDK/provider-utils declarations have an exact-optional generic
Tool constraint incompatibility under TypeScript 6.0.3. Only the three SDK-consuming
proof/runtime/Ollama configs skip dependency declaration checking. Their own source
and tests are still checked by those workspace configs. The root test config excludes
these two package test directories to avoid rechecking the defective dependency
declarations; it does not exclude their workspace type checks. Core, provider-sdk,
storage and Electron declaration checks remain enabled. The older, separate Pixi
exception remains scoped to renderer/scene. Remove each exception after its pinned
upstream declarations pass with the existing strict flags, without blind upgrades.

The experiment proves one small local scenario only. No database selection changes:
SQLite remains the proposed MVP default; PostgreSQL and MySQL stay deferred.
See the [proof guide](../OLLAMA_PROOF.md), [verification](../VERIFICATION.md), and
[roadmap](../../ROADMAP.md) for evidence and remaining gates.
