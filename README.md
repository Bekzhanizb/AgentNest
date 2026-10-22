# AgentNest

**Status: Pre-alpha desktop foundation.** Electron opens a React interface with
Office / Agents / Tasks / Settings navigation, an original PixiJS office, and real
application information. The office starts empty; its opt-in **Demo Mode** shows
clearly fictional characters and a deterministic timeline.
Agent execution, AI integrations, and database adapters are not implemented.
Unimplemented features are labeled **Coming soon**. There is no product release yet.

AgentNest is a proposed local-first workspace for creating and running AI agents:
define an agent's instructions, select a provider, grant specific tools, run a
bounded task, and inspect the result. A pixel workspace is an optional way to
display real execution state; the agent definition and execution engine are the
product's foundation.

The first planned workflow is a single agent reading an explicitly selected local
notes directory and producing a source-linked summary for human review. This
workflow is not implemented. See [Product](PRODUCT.md) for users, scope, and
acceptance criteria.

## Capability map

| Capability | Current state | Intended stage |
| --- | --- | --- |
| Product brief, architecture proposals, community files | Available | Foundation |
| Electron shell, navigation, loading/error states, app information | Implemented | Pre-alpha |
| Strict TypeScript workspaces, unit/component and Electron smoke tests | Available | Pre-alpha |
| Original pixel office, selection, inspector, pan/zoom, accessible text view | Implemented | Presentation preview |
| Explicit fictional Demo Mode; five typed display states, no provider calls | Implemented | Presentation preview |
| Define and save one agent with instructions and limits | Not implemented | MVP |
| Run one agent through a real local provider adapter | Not implemented | MVP |
| Read approved notes and inspect a source-linked result | Not implemented | MVP |
| Store agent definitions and run records in SQLite | Not implemented | MVP |
| Additional local or hosted provider adapters | Not implemented | After MVP |
| Optional pixel view of actual run events | Not implemented | After MVP |
| Shared deployments with PostgreSQL | Under consideration | Later |
| MySQL backend | Deferred; needs a demonstrated use case | Later |

The [roadmap](ROADMAP.md) defines evidence required to call each stage complete.
An adapter proposal is not a supported integration.

## Start here

- [Product and first real scenario](PRODUCT.md)
- [ADR-001: local architecture, adapters, and database choices](docs/adr/ADR-001-local-architecture.md)
- [ADR-002: Electron boundaries and npm workspaces](docs/adr/ADR-002-desktop-foundation.md)
- [Pixel office, Demo Mode, controls, and asset provenance](docs/OFFICE.md)
- [Accessibility checks and manual review gates](docs/ACCESSIBILITY.md)
- [Desktop development and platform limits](docs/DEVELOPMENT.md)
- [Roadmap and acceptance gates](ROADMAP.md)
- [Documentation index](docs/README.md)
- [Кратко по-русски](docs/ru/README.md)

## Participate

Review the first workflow, challenge the architecture assumptions, improve the
documentation, or propose a small implementation slice through the repository's
issue forms. Read [CONTRIBUTING](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md) before opening a PR. Report sensitive
findings using the [security policy](SECURITY.md).

Use Node.js **24.19.0** and npm **11.9.0**, with npm workspaces and the committed
root lockfile. In a fresh clone, the same commands work in PowerShell and other
supported terminals:

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run dev
```

`dev` starts Vite and Electron. After a build, `npm start` opens the production
assets without a Vite server. `build` creates unpackaged application bundles,
not a signed installer. E2E tests require a graphical desktop and the Electron
binary; they do not need a separate Playwright browser download. See
[development](docs/DEVELOPMENT.md) for version choices and platform evidence.

Verified target: **Windows x64 / PowerShell**, including an actual sandboxed
Electron window in [CI](https://github.com/Bekzhanizb/AgentNest/actions/runs/39709125696).
The managed Linux test container passes CLI checks/build but cannot launch the
Chromium sandbox; macOS and ARM are unverified.

## License

The repository already contains an [MIT license](LICENSE), preserved with its
original copyright notice. Retaining MIT is the recommendation; explicit owner
confirmation of that policy is pending. See the [licensing decision](docs/LICENSING.md).
