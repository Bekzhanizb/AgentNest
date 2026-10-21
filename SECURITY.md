# Security policy

## Current support

AgentNest is in Planning. There are no released application versions or supported
production deployments. Documentation tooling still has dependencies; dependency
issues and accidentally exposed sensitive material are relevant security concerns.

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

## Planned boundaries

The [architecture proposal](docs/adr/ADR-001-local-architecture.md) calls for
bounded tools, approved-directory reads, local API access checks, secret redaction,
and explicit user actions. These are requirements to implement and verify, not
existing security guarantees. Local-first design alone does not establish a
sandbox, encryption, or protection from prompt injection.
