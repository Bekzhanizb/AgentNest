# ADR-002: Electron desktop foundation and npm workspaces

- Status: implementation decision for the desktop scaffold requested by the owner.
- Date: 2026-10-21.
- Refines: [ADR-001](ADR-001-local-architecture.md), transport and UI deployment only.
- Scope: shell and package boundaries; no agent runtime, provider, or database implementation.

This ADR records the original shell stage. The later isolated Node-only provider
proof is described by [ADR-003](ADR-003-ollama-notes-proof.md); it does not change
the desktop security boundary below.

## Decision and rationale

Use Electron with a React/Vite renderer, TypeScript strict, and a Node.js main
process. This replaces the initial browser-plus-loopback-product-API proposal with
an Electron window and IPC. Vite serves loopback only in development. Future agent
and persistence services still belong outside the renderer as ADR-001 requires.

Choose **npm workspaces**. The repository already uses npm; its workspace links and
single package-lock.json cover the initial four private workspaces without another
manager/bootstrap dependency. Internal packages use matching `0.0.0` versions so
npm links local workspaces. Do not mix pnpm/yarn lockfiles into this repository.

| Boundary | Responsibility |
| --- | --- |
| apps/desktop/renderer | React navigation, UI states, core types, preload API consumer |
| apps/desktop/electron | Window lifecycle, permissions, local asset protocol, validated IPC |
| packages/core | Platform-independent domain types and small boundary validators |
| packages/provider-sdk | Provider interface only; future implementations belong behind it |
| packages/storage | Repository interface only; future SQL adapters belong behind it |

There is only one UI consumer, so packages/ui is deferred until components are
actually shared. Private packages export TypeScript source for the app bundlers;
they are not independently published libraries. Build emits bundled main/preload
and renderer assets. An installer, signing, auto-updater, and release workflow are
separate future work.

## Electron security choices

Enable contextIsolation, sandbox, and webSecurity; disable nodeIntegration and
webviews. Bundle preload as CommonJS so its only external require is Electron's
permitted sandbox API. Do not expose ipcRenderer, generic invoke, file access,
shell commands, or arbitrary external URL opening.

The only bridge operation is getAppInfo, a read-only request with apiVersion 1.
Two immutable security booleans report the preload's actual isolation/sandbox state
for diagnostics and smoke verification, without exposing its process object.
Main validates the exact request shape, sending webContents, main-frame identity,
and exact trusted URL; preload and UI validate the result. Errors reveal no local
paths. Provider credentials and database handles never cross this boundary.

Production uses agentnest://desktop/ with validated asset paths constrained to the
built renderer directory. CSP permits local scripts/styles and denies network
connections, eval, inline scripts/styles, frames, forms, and objects. Deny permission
requests/checks, new windows, renderer navigation, and webview attachment.

Development additionally permits Vite's loopback WebSocket and injected styles;
it does not enable Node integration, disable isolation, or bypass the renderer
sandbox. The development flag is ignored for a packaged app. Vite transpiles JSX
without an additional React plugin; renderer edits reload, while shell/preload
edits require restarting dev. More elaborate watching is deferred.

## Compatibility and updates

Use the exact versions recorded in package.json and the root lockfile. The tool
selection checked Node engines, Vite/Vitest peers, React/testing-library peers,
and TypeScript/ESLint support. TypeScript 6.0.3 is selected because the chosen
typescript-eslint supports versions below 6.1; the latest TypeScript 7 is not
adopted merely because it is newer. See [development](../DEVELOPMENT.md).

Choose Dependabot over Renovate: GitHub-native configuration is sufficient for
this small npm monorepo and pinned Actions. Updates are reviewable PRs, with small
weekly groups and no automatic merge; major upgrades need deliberate review.
They must pass typecheck, lint, tests, build, and the Windows smoke. Do not use
automatic force upgrades or disable security controls to make tests pass.

## Limits

Contracts do not establish provider or SQL support. SQLite remains the proposed
first persistence adapter, PostgreSQL a later shared-use candidate, and MySQL
deferred. Windows is the primary CI target; other OS support is limited to the
evidence recorded in development documentation. This scaffold is not the agent MVP.
