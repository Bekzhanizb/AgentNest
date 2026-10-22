# ADR-004: Window-owned notes permission and a Node worker

- Status: Implemented experimental desktop slice; usable MVP remains incomplete.
- Date: 2026-10-22.
- Refines: [ADR-002](ADR-002-desktop-foundation.md) and
  [ADR-003](ADR-003-ollama-notes-proof.md).

## Decision

Expose the existing bounded notes runner through a dedicated Tasks screen. Keep
Office and its fictional Demo Mode independent. This ADR introduced a one-off,
in-memory run. [ADR-005](ADR-005-local-persistence.md) subsequently adds saved notes
definitions/SQLite without persisting permissions or changing the worker boundary.
Neither slice constitutes a production release.

```text
React Tasks (permission, status, plain result and history)
  -> frozen preload notes API (five named operations + snapshot subscription)
  -> main-process window owner (native picker, grant, validation, lifecycle)
  -> Node worker thread (runtime + injected Ollama adapter)
  -> trusted loopback Ollama service

Office -> independent demo events -> core -> Pixi/DOM
```

Use Node worker_threads rather than executing provider SDKs in main/preload or
renderer. The model runs in the separately installed Ollama service; the thread
only performs bounded file/tool and HTTP work. Its bundled entry has a 128-MiB
old-generation heap limit. Thread isolation keeps SDK work off the UI/main event
loops; it is **not** an OS security sandbox or a durable job service.

The existing CLI remains an independent entry point to the same runtime. No new
external dependency or SQL adapter is introduced. Keep the existing npm workspaces
and exact versions. Only internal workspace edges and a notes-only export change.

## Permission and lifetime

The renderer cannot supply a directory, filename, endpoint, tool, script or generic
IPC channel. Choose opens an owned native folder dialog. Main preflights metadata
only: supported names, file count and bytes, regular single-link files, canonical
directory and file identity/timestamps. File contents are not read or sent to a
provider at this point. Only a folder label, filenames/bytes, expiry and random
opaque grant ID cross into the UI. Absolute paths and private approval metadata
remain in the backend.

The grant belongs to that window, expires after ten minutes and is consumed once.
Starting requires exact versioned parameters, the current ID, a permitted local
model tag and literal consent true. Main additionally requires an owned native confirmation with the actual
folder, filenames, model and limits. The default button is Cancel. Renderer
consent alone cannot bypass that native decision; expiry/ownership are rechecked
after it resolves. The worker receives the backend approval,
not a reconstructed renderer path. It rejects a changed directory/list and checks
approved file metadata again at the actual descriptor read. New Markdown files
are not silently added after review. Content remains untrusted data.

Only one picker or run can own the window's session. Cancel requests abort and
has a five-second forced thread-stop fallback; the outer watchdog is 190 seconds,
in addition to the runtime's 180-second deadline. Cancellation accepted before a
completion snapshot wins over a late completed message. Worker crashes, malformed
events and watchdog expiry are failed outcomes, never successful activity.

Navigation among the app's four screens preserves the session and exposes a
return-to-run control. Actual document reload/navigation revokes permission and
stops work; renderer failure and window close do the same. Clear revokes the grant
and drops in-memory output. ADR-005 now records cancellation before revocation
and persists real events/definition snapshots/results separately; Clear does not
delete that history. Retention/unencrypted storage is disclosed in the native dialog.
No telemetry or export is added. OS/model-service retention remains independent.

## IPC and presentation

Main checks the exact trusted top-level frame and current webContents, one request
argument, version, exact keys, model and consent. Preload exposes only read,
choose, start, cancel, clear and a fixed snapshot subscription; it strips Electron
event objects and decodes all responses. A monotonic snapshot revision prevents a
late read/reply from overwriting newer pushed state. Subscriptions are removed on
unmount; app navigation does not unmount the root subscription.

Core decodes bounded runtime events and snapshots without Node or SDK imports.
Main additionally checks run identity, sequence, monotonic elapsed time, call and
read budgets, approved paths/bytes, read hashes and source-linked completion.
An invalid worker cannot create a completed result without the expected event
history. This is transport validation of trusted application code, not remote
attestation that an arbitrary daemon/model behaved honestly.

React renders summaries as inert plain text, with isolated direction and bounded
length. It never parses generated HTML, opens source paths, follows model links or
inserts Markdown via innerHTML. Status is textual, announcements are limited to
phase changes, and the ordinary DOM history remains keyboard-readable. The office
does not consume this feed yet, so it cannot confuse real and fictional characters.

Sandbox, contextIsolation, nodeIntegration=false, popup/permission denial and
production connect-src none remain in force. Only the worker adapter reaches
loopback; no renderer network exception is added. Main imports only the runtime's
notes metadata module. ESLint forbids model SDKs in main/preload and renderer.
The worker config shares ADR-003's scoped upstream declaration-check exception;
all source remains strict. Main/preload/core declaration checks remain enabled.

## Verification and limits

See the [desktop run guide](../DESKTOP_NOTES.md) and
[verification record](../VERIFICATION.md). Tests distinguish mocked workers/models,
actual filesystem grants, actual Electron IPC/worker failures, and opt-in real
Ollama inference. A normal CI pass without a model cannot establish real inference.

The local daemon must be trusted, cloud disabled by its operator, and inputs stable.
Path checks are not an OS sandbox against malicious same-user filesystem races.
Source identity/citations do not prove semantic correctness or injection immunity.
The broader MVP, reviewed export and manual assistive-technology gates remain open.
Saved bounded notes definitions and SQLite are subsequently implemented in ADR-005. Do not treat a worker thread or a passing axe scan as those guarantees.
