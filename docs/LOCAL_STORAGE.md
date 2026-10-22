# Local agents and SQLite history

Status: experimental Pre-alpha. Agents can save, edit and delete reusable local
notes definitions. Tasks can select one and inspect saved real run records after
a restart. This is a bounded notes assistant, not a general tool builder or release.
See [ADR-005](adr/ADR-005-local-persistence.md) for the implementation boundary.

## Use the library

1. Open Agents in Electron. Enter a name, an installed local Ollama model and
   instructions, then Save agent. Saving performs no inference or file reads.
2. Open Tasks, select the definition, and review its instructions. The current
   runner always reads all approved notes and returns three cited bullets:
   Purpose, Permissions, Limits. Instructions can refine the focus. Tools, call
   budgets and deadline remain fixed; arbitrary tools and editable limits are deferred.
3. Choose a folder, review filenames/bytes, check the permission/storage disclosure
   and Run. Confirm the native dialog. Follow the [notes guide](DESKTOP_NOTES.md).
4. Inspect Saved run history. Reading a record never resumes it, opens its original
   files, calls a provider or restores permission. A saved source hash identifies
   the bytes read then; it does not establish that current files are unchanged.
5. Edit the agent for future runs. Historical instructions, model and revision are
   immutable snapshots. Deleting an agent retains these run snapshots.

Every run still requires a new one-use native folder grant. Changing the selected
definition/revision/model clears form consent. A stale or deleted definition is
rejected by main; the renderer cannot replace saved instructions in a run request.
The one-off notes option remains available and also records real attempts.
Unsaved editor drafts are not persisted across navigation/reload.

## Data and deletion

The database contains agent names/instructions/model choices, revisions, real run
events, generated summaries, relative source filenames, sizes, SHA-256 and reported
usage/model identity. Failed/cancelled attempts are records too. A record is created
on the first actual runtime event; refusing permission creates none. Demo Mode does
not write history. No model starts merely because a record or agent was loaded.

The app does not persist native grants, approval metadata, selected-folder absolute
paths, original note bodies, credentials or weights. Instructions and generated
text can themselves contain sensitive material, including text copied from notes.
Do not put secrets in instructions. **The database is not encrypted.** OS access
controls, swap, crash dumps, backups and the independent daemon have their own
retention. Use public notes during this experimental phase.

There are at most 32 agents and 100 runs; no automatic pruning. At capacity, delete
records before starting another run. Clear session revokes the current grant and
clears the in-memory view only. Delete this run / Delete all history require an
explicit confirmation and delete run snapshots/events/results, leaving agents.
Delete agent removes its definition, leaving historical snapshots. History deletion
is disabled during an active run. Backups may retain deleted content; SQLite
secure_delete is enabled, but no forensic-erasure guarantee is made.

Closing/reloading normally records cancellation before clearing the window session.
After process termination/power loss, an unfinished record becomes **Interrupted**
at next startup. No terminal runtime event, summary, or automatic resume is invented.
Events already committed survive; an event not committed before the crash can be lost.
Write failure stops the run and reports that history could not be saved. The last
saved record may remain unfinished until restart; do not infer success from it.

## Location, backup and recovery

The main process uses agentnest.sqlite under Electron's userData directory. With
the default Windows profile this is typically `%APPDATA%\AgentNest\agentnest.sqlite`.
Tests use isolated temporary user-data directories. A custom Electron user-data
argument changes the location. Do not place the database on a network share or in
an actively synchronized folder. Only one AgentNest instance owns the profile.

For a consistent offline backup on Windows, fully quit AgentNest, check in Task
Manager that its processes stopped, then use PowerShell. Adjust the source path
if your profile differs and choose a private backup destination:

```powershell
$agentnestDb = Join-Path $env:APPDATA "AgentNest\agentnest.sqlite"
$agentnestBackup = Join-Path $env:USERPROFILE "agentnest-backup.sqlite"
Copy-Item -LiteralPath $agentnestDb -Destination $agentnestBackup -ErrorAction Stop
```

These commands are **offline** instructions, not a live-backup API. Normal operation
uses DELETE journaling, not WAL. After an unclean exit, first let a healthy same-version
app complete SQLite recovery and quit; do not copy just a database with a hot journal.
If the app cannot open it, preserve the database and any sibling journal/WAL/SHM
files together for diagnosis. Do not delete these files to force an open.

To restore, fully quit, preserve the current database/sidecars in a separate private
folder, then copy the known-good closed backup into the profile as agentnest.sqlite.
Use the same app version or a reviewed newer version. Launch and inspect agents/history
before granting any file access. Restoration never restores runtime permissions.
Backup/restore is currently a manual offline procedure; no export/import UI is claimed.

Migrations use application_id and user_version with transactional rollback. Unknown,
newer, corrupt, unrelated or invalid records produce an explicit unavailable state;
the app never silently replaces them with an empty database. Busy writes time out
after one second. A failed history writer requires a restart after resolving the
cause (disk full, permissions, another writer). Preserve a copy before recovery or
upgrade; there is no automatic downgrade, repair, or pre-upgrade backup.

## Verification limits

Tests use actual temporary SQLite files for reopen, version-1 migration, rollback,
busy writers, immutable snapshots, deletion/cascades, limits and interrupted recovery.
Component/owner fixtures are explicitly mocks. The Electron suite verifies actual
editor save/edit/delete/restart and persisted worker failure; the opt-in live notes
suite additionally checks a real completed result and cancellation after restart.
Actual outcomes belong in [Verification](VERIFICATION.md); a test's existence is
not evidence it passed. Manual NVDA, native-dialog focus, OS contrast/text scaling
and physical touch remain open in [Accessibility](ACCESSIBILITY.md).
