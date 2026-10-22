# Security policy

## Current support

AgentNest is Pre-alpha with a minimal desktop shell. There are no released
application versions or supported production deployments. Dependency issues,
desktop IPC/renderer boundaries, and exposed sensitive material are relevant concerns.

## Report privately

If GitHub Private Vulnerability Reporting is enabled, use **Security → Report a
vulnerability** in this repository to submit a private report. Its availability
has not been verified or configured by this change. Do not use a public issue or
PR for secrets, exploitable details, private notes, or sensitive run output.

If the private-reporting option is unavailable, no alternative private security
contact is currently designated. Open only a minimal request for the owner to
enable private reporting or provide a private contact, without disclosure details.
The owner must configure the channel before an application release; see the
[roadmap](ROADMAP.md). No triage or remediation SLA is promised.

Once a private channel is available, include the affected commit or dependency,
impact, reproduction steps, and a sanitized example. Never send live credentials
or personal data. The owner coordinates fixes and any disclosure with the reporter.

## Desktop boundaries and future requirements

The current Electron shell enables context isolation and renderer sandboxing,
disables Node integration, denies new windows and permissions, and exposes only
validated application information through preload. Production assets use a custom
local protocol and restrictive CSP. See [desktop architecture](docs/adr/ADR-002-desktop-foundation.md).
The development server is loopback-only; development CSP additionally permits Vite
styles and its local WebSocket. It must not be used as a production server.
The [pixel office](docs/OFFICE.md) is isolated presentation with opt-in fictional
events. It does not add IPC operations, network access, approvals, or provider
credentials. Pixi uses static CSP-compatible polyfills; unsafe-eval remains denied.

The [architecture proposal](docs/adr/ADR-001-local-architecture.md) calls for
bounded tools, approved-directory reads, local API access checks, secret redaction,
and explicit user actions. The separate [CLI proof](docs/OLLAMA_PROOF.md) now
enforces a bounded read-only directory grant with no shell/write/publish tools.
The experimental [desktop notes flow](docs/DESKTOP_NOTES.md) adds native metadata
preflight, a window-owned single-use ten-minute permission, exact top-level-frame
IPC checks, strict request/event decoding and a bounded Node worker. Renderer CSP
still denies network access. Reload, renderer failure and window close revoke the
grant and stop its worker; inactive Clear drops the in-memory output. No run file,
SQLite record or telemetry is written. OS/model-service retention and swap/crash
dumps are outside that statement. Saved agents, persisted retention and export
remain unimplemented. A worker thread is not an OS sandbox. The CLI trusts a local loopback Ollama daemon and stable
input directories; its path checks are not an OS sandbox against malicious
same-user races. Public evidence must contain only approved public fixture notes.
Local-first design alone does not establish a
sandbox, encryption, or protection from prompt injection.
