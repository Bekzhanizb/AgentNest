# Desktop development

AgentNest has a Pre-alpha Electron shell, not an agent runtime. Office, Agents,
Tasks, and Settings are navigation screens labeled Coming soon. Only navigation
and reading actual app/runtime versions are implemented; no fake activity is shown.

## Toolchain and install

Use Node.js 24.19.0 (also in .node-version) with npm 11.9.0. The exact root
package-lock.json and private npm workspaces are authoritative. Install from the
repository root; do not run package installs independently inside workspaces.

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run dev
```

`npm install` works for deliberate manifest changes; commit its resulting root
lockfile. Use `npm ci` in fresh clones and CI. There is no custom install lifecycle
script named install. Electron 45 downloads its binary on first use; initial dev
or smoke needs access to Electron's GitHub release assets in addition to npm.
No separate Playwright browser download is needed for Electron smoke tests.

| Tool | Selected version | Compatibility reason |
| --- | --- | --- |
| Node.js / npm | 24.19.0 / 11.9.0 | One pinned LTS toolchain for local work and Windows CI |
| Electron | 45.0.0 | Current stable desktop runtime, Node-based tooling requirement satisfied |
| React / React DOM | 19.3.1 | Matching runtime versions and compatible React 19 testing/types |
| Vite / Vitest | 8.3.5 / 5.0.5 | Vitest declares Vite 8 support; both accept selected Node |
| TypeScript | 6.0.3 | Within typescript-eslint 8.72.0's supported range below 6.1 |
| ESLint / typescript-eslint | 10.13.0 / 8.72.0 | Compatible declared peer ranges |
| Playwright | 1.64.1 | Electron launcher and a single desktop smoke; Node engine satisfied |

The existing patched KaTeX override is retained for documentation tooling.
Dependabot proposes reviewed updates; major changes and lockfile rewrites need
compatibility review and actual CI evidence, not blind upgrades.

## Commands and output

| Command | Result |
| --- | --- |
| npm ci | Restore all workspaces from the root lockfile |
| npm run dev | Build shell/preload, start loopback Vite, launch Electron |
| npm start | Open built production assets without a development server |
| npm run typecheck | Strict checks for configs, tests, shell, renderer, and packages |
| npm run lint | ESLint/import boundaries plus Markdown/link/structure checks |
| npm test | Vitest unit/component checks, with no model calls |
| npm run build | Emit apps/desktop/dist/electron and dist/renderer |
| npm run test:e2e | Launch built Electron and verify window/security/navigation |
| npm run check | Documentation-only checks retained from the foundation |

Commands use Node APIs and local binaries, without Bash variables, rm/cp commands,
or background-shell operators. npm's command chaining works through its Windows
command shell, including when invoked from PowerShell. Electron is spawned without
a shell; paths with spaces are passed as separate arguments.

Renderer edits reload in dev. Restart dev after main/preload changes. Port 5173 is
loopback-only and fixed; an occupied port fails rather than silently changing the
trusted IPC origin. A renderer-only browser preview reports a missing Electron
bridge as an error. Loading/error/retry states reflect the real app-info request.

## Structure and runtime boundaries

```text
apps/desktop/
  electron/         main, sandboxed preload, asset/IPC policy
  renderer/        React UI, no Node/Electron/provider/storage imports
  vite.config.ts
packages/
  core/            domain types and IPC data validation
  provider-sdk/    provider contract only
  storage/         repository contract only
scripts/           portable build/dev/start and documentation tooling
tests/e2e/         actual Electron smoke, isolated temporary user data
```

There is no packages/ui until another consumer needs shared UI. Provider and SQL
implementations must be separate from these interfaces and may only be invoked
from the main/application layer. The current interfaces are a starting boundary,
not a complete provider protocol, runner, or database adapter. Strict TypeScript
includes unchecked-index and exact-optional checks; Electron/renderer configs have
separate ambient libraries. ESLint enforces the import direction.

## Platform evidence and limitations

- Windows x64 is the primary target in GitHub Actions, using PowerShell and a fresh
  checkout for install, typecheck, lint, tests, build, and actual Electron smoke.
- Local verification uses Debian 13 x64 with Node 24.19.0; exact outcomes are recorded
  in the implementation PR. A display server and compatible GTK/NSS/graphics
  libraries are required for Linux GUI tests. Headless build/unit tests need no display.
- Windows CI must actually pass before Windows is described as verified. Configuration
  alone is not evidence. macOS, Windows ARM, Linux ARM, and WSL GUI are unverified.
- Linux environments blocking Chromium sandbox namespaces may not launch Electron;
  the project does not add a no-sandbox workaround. Test on a compatible host.
- This managed Debian container specifically aborts normal dev/start on the SUID
  sandbox helper configuration. Earlier diagnostic Playwright launches opened a
  window with its default Chromium sandbox disabled; those are not counted as a
  secure-launch pass. The committed smoke explicitly sets chromiumSandbox true.
- Build produces unpackaged development artifacts, not .exe/.msi/.dmg installers.
  Signing, packaging, distribution, updates, and production hardening are not included.
- Electron embeds its own Node runtime; the selected system Node is for tooling.
  Nothing in this phase verifies providers, models, SQL drivers, or agent behavior.

Security details and the change to the original local-browser proposal are in
[ADR-002](adr/ADR-002-desktop-foundation.md). The [roadmap](../ROADMAP.md) still
requires real provider and persistence evidence for the first agent workflow.
