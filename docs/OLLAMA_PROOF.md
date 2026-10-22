# Local Ollama notes proof

This is an experimental **real Node CLI run**, separate from the fictional office
Demo Mode. It reads public Markdown fixtures through one bounded tool and emits
actual runtime events plus a pure AgentViewModel projection. The later
[desktop Tasks slice](DESKTOP_NOTES.md) shares this runner through window-owned
permissions and a Node worker. Saved agent editing, SQLite and runtime-to-office
IPC are still Coming soon.

## Prerequisites and commands

Use the pinned Node/npm toolchain from [development](DEVELOPMENT.md). Install
[Ollama](https://ollama.com/) separately and download a local tool-capable model.
This proof was exercised on CPU with Ollama 0.40.8 and qwen3:1.7b. Model tags are
mutable: compare the manifest digest in the committed
[evidence](proofs/ollama-notes-2026-10-22.json). That historical CLI record belongs
to revision 70cae087c0246b7df9ce4e54bcfdb2f198f103b2; its implementation hashes
refer to that revision, before the desktop approval extension. Other models or hardware may fail
or need different limits; declaring tool capability alone does not prove quality.

In a dedicated PowerShell terminal, disable Ollama cloud features before starting
the local service. Stop an already running service first if necessary:

```powershell
$env:OLLAMA_NO_CLOUD = "1"
$env:OLLAMA_HOST = "127.0.0.1:11434"
ollama serve
```

In another terminal, from the repository root:

```powershell
ollama pull qwen3:1.7b
npm ci
npm run --silent proof:ollama -- --model qwen3:1.7b --notes fixtures/notes
```

Cloud disabling is an operator prerequisite, not an adapter claim about every
daemon setting. No API key, cloud inference or hosted gateway is needed. Model
downloads need network access; the proof itself only talks to literal loopback.
The application never starts Ollama or pulls a model for the user.

The command bundles only the CLI into ignored apps/proof/dist/cli.cjs, then spawns
Node without a shell. Arguments with spaces work as quoted PowerShell arguments.
The existing desktop build remains separate. Do not use private notes for public
evidence. Output contains the generated summary and source metadata; redirection
creates a sensitive artifact if personal notes are used.

## Contract and limits

| Boundary | Enforced behavior |
| --- | --- |
| Endpoint | Plain HTTP 127.0.0.1 or [::1], optional port; no DNS names, redirect, credentials or URL suffix |
| Model | Explicit installed local tag; GGUF, tools capability, recorded manifest digest; cloud routing rejected |
| Grant | One explicitly supplied directory, canonicalized at run start; at most 64 entries, no recursion |
| Inputs | 1–4 regular flat .md files; simple ASCII names; no symlinks or hard links |
| Bytes | At most 8 KiB per read and 16 KiB aggregate across reads, valid UTF-8 |
| Tool / model calls | At most 4 reads and 4 model calls; sequential tools, zero retries |
| Model context / generation | 4096-token context, at most 512 generated tokens per call, thinking off, temperature 0, seed 42 |
| Time | 180 seconds total by default, configurable 1–300000 ms; each HTTP request at most 90 seconds |
| HTTP bodies | Request at most 128 KiB; response at most 256 KiB |
| Completion | Successful stop, all listed sources actually read, SHA-256 recorded, summary cites each exact [filename.md] |
| Failure | Safe code/message; no raw provider bodies, credentials, internal prompts or thought content |

Paths in the output are grant-relative filenames. Files added after the grant are
not automatically allowed. Changed content on repeat reads fails. File/root
identity and bounded descriptor reads reduce substitution risk; the CLI does not
provide a process sandbox against hostile same-user filesystem races. A trusted
local daemon and stable input directory are required. The CLI cannot prevent
another local user/process from altering that daemon. There is no desktop API
access control or permission dialog because no new desktop/API operation exists.

Each output line is JSON containing event and view. Events include run_started,
provider_ready, provider_call_started/completed, note_read, and one terminal
run_completed, run_failed or run_cancelled. Metadata-only events leave the view
unchanged; view sequences can therefore have gaps. Origins cannot mix with demo
snapshots. Cancellation maps to idle with an explicit cancelled history entry;
it is not a sixth office status or a successful result.

Exit codes: 0 completed, 1 failed, 130 cancelled, 2 invalid CLI configuration.
Use Ctrl+C to cancel the running CLI. POSIX SIGTERM also cancels; Windows forced
process termination cannot promise a final JSON event. Broken output pipes cannot
promise delivery of a terminal event either.
The portable npm wrapper forwards Ctrl+C through one fixed parent-to-child cancel
message, allowing graceful Node cancellation on Windows rather than relying on
kill(SIGINT). It has a five-second forced-termination fallback for an unresponsive
child. This internal process channel is separate from Electron IPC.

## Reproduce failure controls

```powershell
npm run --silent proof:ollama -- --model qwen3:1.7b --notes fixtures/notes --max-steps 1
npm run --silent proof:ollama -- --model qwen3:1.7b --notes fixtures/notes --timeout-ms 1
npm run --silent proof:ollama -- --model qwen3:1.7b --notes fixtures/notes --endpoint http://127.0.0.1:1/
```

These are expected failures, not successful tasks. Step exhaustion depends on a
model actually calling the read tool; a model answering without reads instead
fails MISSING_EVIDENCE. No completion event should appear. For cancellation, run
the positive command and press Ctrl+C after provider_call_started.

Unit tests use an SDK mock model and mocked HTTP explicitly; they verify permission
and lifecycle contracts without inference or downloads. They cannot substitute for
the separately recorded real local run. Normal CI stays deterministic and offline
with respect to model inference. See [ADR-003](adr/ADR-003-ollama-notes-proof.md) for
the pinned SDK choice and scoped declaration-check exception.

The tiny qwen3:0.6b model failed the source-evidence requirement during development.
The first 1.7b iteration repeated reads until its budget was exhausted. These were
recorded as failures, never relabeled as completed activity. Seed/temperature
settings do not guarantee identical language output across versions and hardware.
Source links do not establish factual correctness: review the summary against the
actual inputs before using it. No private-note or production reliability claim is made.
