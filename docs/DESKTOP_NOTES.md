# Experimental desktop notes run

Tasks can run the existing bounded Ollama proof through the actual Electron
bridge. It is a real local request, separate from Office Demo Mode. There is no
saved agent definition, database history, background queue or export yet.

## Run it

Install the pinned Node/npm toolchain and dependencies from
[development](DEVELOPMENT.md), then install/start Ollama and pull a local model as
described in the [provider proof guide](OLLAMA_PROOF.md#prerequisites-and-commands).
The operator must disable Ollama cloud features. The default loopback endpoint is
fixed; this screen has no credentials, remote endpoint or model-install control.

```powershell
npm ci
npm run dev
```

1. Open Tasks and choose a folder using the native dialog. Start with this
   repository's public fixtures/notes directory.
2. Review the displayed .md filenames and bytes. At most four flat regular files,
   8 KiB per file and 16 KiB total are allowed; links/subfolders are excluded.
   Supported filenames use ASCII letters/digits, dots, underscores or hyphens.
3. Enter an explicitly installed tool-capable local model tag. The real CLI proof
   used qwen3:1.7b; installed weights must match the intended manifest. A tag alone
   does not identify immutable weights.
4. Check permission to read and send those listed notes to local Ollama, then
   select Run notes summary. Confirm the actual folder, model and limits in the
   owned native permission dialog, or Cancel. Renderer consent alone cannot
   bypass that dialog. Nothing invokes a model before native confirmation.
5. Inspect actual status/history, generated plain text, source SHA-256, model
   identity and reported token usage. Review the text against the notes.

Choose is a metadata preflight, not consent to read contents. Permission expires
after ten minutes and is used once, including failed runs. Choose again to rerun.
A changed approved file or Markdown list is rejected; it is not silently accepted.
Changing the model in the form requires checking permission again.

The model service must be trusted. AgentNest restricts its own endpoint and local
model routing; it cannot authenticate an arbitrary process occupying that port
or configure all daemon settings. Use public notes during this experimental phase.
Citation checks establish actual read paths and hashes, not factual correctness.

## Cancel and clear

Cancel remains available during the real run. Cancelling is explicit and cannot
be mistaken for completion. The runner has the CLI's four model/read-call budgets
and three-minute deadline. Main adds a watchdog and a five-second cancellation
fallback for an unresponsive thread. Stopping locally does not promise that every
external daemon has immediately stopped its internal computation.

Office/Agents/Settings navigation preserves the active run and shows a return-to-run
control. It does not place real characters into the fictional office. Reload,
renderer failure or window close revokes the permission and stops its worker.
Clear session discards the in-memory grant/result when inactive. The app writes
no run file or database; the independently operated model service and OS may have
their own retention/swap/crash-dump behavior. No secure-memory-erasure claim is made.

An unavailable provider, invalid permission, changed input, timeout, cancelled run
or crashed worker produces an explicit error/cancelled outcome without a completed
summary. The browser preview shows the layout and explains why native notes/model
operations require Electron; it does not replace the bridge with simulated work.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npx playwright install chromium
npm run test:ui
```

The regular Electron suite substitutes only the native dialog response with an
actual temporary directory of public fixture files. It verifies the production
preload/main/worker path, explicit consent, no renderer path argument, rejection of
files added after review, and grant revocation on reload. It does not claim model
inference when no model is configured. Unit tests label their worker/model mocks.

For opt-in real inference on a compatible desktop host, start the trusted local
service/model and run in PowerShell:

```powershell
$env:AGENTNEST_LIVE_NOTES_MODEL = "qwen3:1.7b"
npx playwright test tests/e2e/notes.spec.ts
Remove-Item Env:AGENTNEST_LIVE_NOTES_MODEL
```

This is a test-only flag. Application code does not inspect it or replace a
provider. The live test uses actual public files and production IPC/runtime,
requires a real source-linked summary and hashes, then cancels another actual
call after returning from Office. It logs public-fixture snapshots and captures
screenshots under ignored test-results/electron. Do not point this harness at
private notes or change the native-dialog fixture to personal directories.

The separate Desktop provider proof workflow installs checksum-verified official
Ollama 0.40.8 CPU files and a digest-verified qwen3:1.7b on Windows, then runs that
live test with Electron sandboxing enabled. Its initial feature-branch trigger
records this integration; after merge, model downloads require workflow_dispatch.
Ordinary desktop CI installs no models. Artifacts contain only public test output,
never daemon keys, weights or model-service logs.

Consult the feature PR and [verification](VERIFICATION.md) for actual outcomes;
the existence of this workflow alone is not a successful live-run claim. Manual
NVDA, OS contrast/text scaling, actual browser zoom and physical touch remain
open in the [accessibility matrix](ACCESSIBILITY.md).

Actual Windows evidence is now available in the
[sanitized desktop record](proofs/desktop-notes-2026-10-22.json), tied to the exact
tested source commit and successful live workflow. It contains a real summary,
read hashes and cancellation, plus a seven-day artifact link. The native dialog
responses were automated; manual dialog accessibility remains unverified.
