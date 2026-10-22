# Desktop development

AgentNest has a Pre-alpha Electron shell and an original PixiJS office preview.
The office is empty by default; explicit Demo Mode displays fictional events.
Tasks now provides an experimental [desktop notes run](DESKTOP_NOTES.md) using
a native one-use permission and a Node worker. Agents saves bounded definitions;
Tasks includes SQLite history. Provider settings, export and real office activity
remain Coming soon. See [local storage](LOCAL_STORAGE.md) for retention/recovery. The standalone
[Node CLI proof](OLLAMA_PROOF.md) shares that bounded runner. See the
[office guide](OFFICE.md) for controls, accessibility, and asset provenance.

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
The optional browser UI suite needs `npx playwright install chromium` once, then
`npm run test:ui` after a build. CI runs both suites; browser emulation is separate
from the actual Electron window. See the [accessibility review](ACCESSIBILITY.md).

| Tool | Selected version | Compatibility reason |
| --- | --- | --- |
| Node.js / npm | 24.19.0 / 11.9.0 | One pinned LTS toolchain for local work and Windows CI |
| Electron | 45.0.0 | Current stable desktop runtime, Node-based tooling requirement satisfied |
| React / React DOM | 19.3.1 | Matching runtime versions and compatible React 19 testing/types |
| Vite / Vitest | 8.3.5 / 5.0.5 | Vitest declares Vite 8 support; both accept selected Node |
| TypeScript | 6.0.3 | Within typescript-eslint 8.72.0's supported range below 6.1 |
| ESLint / typescript-eslint | 10.13.0 / 8.72.0 | Compatible declared peer ranges |
| PixiJS | 8.22.0 | Stable 8.x renderer, MIT, procedural canvas textures, CSP-safe static polyfills |
| axe Playwright | 4.14.0 | Development-only WCAG checks; selected Node satisfies its engine |
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
| npm run build | Emit main/preload/notes-worker bundles and dist/renderer |
| npm run test:e2e | Launch built Electron; verify window/security/office and actual notes IPC/worker permission failure; live inference is explicitly opt-in |
| npm run test:ui | Production browser layout, keyboard, forced-colors, touch-emulation, and axe checks |
| npm run preview:office | Loopback-only preview of built renderer assets on port 4173 |
| npm run --silent proof:ollama -- --model qwen3:1.7b --notes fixtures/notes | Explicit real Node proof; needs a separately installed local Ollama/model |
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
  worker/          Node notes runner + adapter; no UI or Electron APIs
  vite.config.ts
packages/
  core/            domain types, pure AgentEvent projection, IPC data validation
  office-scene/    original procedural sprites and Pixi snapshot presentation
  provider-sdk/    backend V4 model protocol and normalized errors
  provider-ollama/ local-only native Ollama adapter
  runtime/         bounded notes runner; no renderer or provider-specific client
  storage/         backend repository contract
  storage-sqlite/  built-in node:sqlite adapter, migrations, real-file tests
apps/proof/        independent Node CLI; NDJSON events and text-view projection
scripts/           portable build/dev/start/proof and documentation tooling
tests/e2e/         actual Electron smoke, isolated temporary user data
tests/browser/     production UI review with browser-only emulation
```

There is no packages/ui until another consumer needs shared UI. Provider and SQL
implementations must be separate from these interfaces and may only be invoked
from the main/application layer. The CLI is a separate entry point. Desktop main owns permission and launches the
same bounded runtime in a worker; main owns the SQLite repository through LibraryService. Main/preload
import only the runtime notes metadata subpath, with no model SDK. Strict TypeScript
includes unchecked-index and exact-optional checks; Electron/renderer configs have
separate ambient libraries. ESLint enforces the import direction. The renderer
and scene use skipLibCheck for an upstream PixiJS exact-optional declaration
defect. The proof, runtime, Ollama and desktop worker configs have a separate scoped exception
for AI SDK/provider-utils Tool declarations; all project source/tests keep strict
checks. Core, provider-sdk, storage and Electron dependency declarations stay
checked. See [ADR-003](adr/ADR-003-ollama-notes-proof.md#type-checking-and-consequences)
and the [office guide](OFFICE.md#verification-and-limits) for removal conditions.

## Platform evidence and limitations

- Windows x64 is verified in [GitHub Actions](https://github.com/Bekzhanizb/AgentNest/actions/runs/39662049102),
  2026-10-21, using PowerShell and a fresh checkout for install, typecheck, lint,
  eight Vitest checks, build, and actual Electron smoke with Chromium sandbox enabled.
- The pixel-office implementation also passed a fresh Windows/PowerShell run on
  2026-10-22: install, typecheck, lint, 25 Vitest checks, build, and a secure actual
  Electron smoke including Pixi hit selection, keyboard camera, fictional statuses,
  reduced motion, and axe. See the [run](https://github.com/Bekzhanizb/AgentNest/actions/runs/39709125696)
  and the latest feature PR checks for follow-up commits.
- Saved agents/SQLite also passed [fresh Windows checks](https://github.com/Bekzhanizb/AgentNest/actions/runs/39804597471):
  118 tests, 3 actual Electron cases and 6 browser cases. The separate
  [provider run](https://github.com/Bekzhanizb/AgentNest/actions/runs/39804584689) confirms
  real saved-agent inference and persisted records after restart; see
  [durable evidence](proofs/sqlite-notes-2026-10-22.json).
- Local verification uses Debian 13 x64 with Node 24.19.0; exact outcomes are recorded
  in the implementation PR. A display server and compatible GTK/NSS/graphics
  libraries are required for Linux GUI tests. Headless build/unit tests need no display.
- macOS, Windows ARM, Linux ARM, and WSL GUI are unverified. Passing the Windows
  workflow is not evidence for these other platforms.
- Linux environments blocking Chromium sandbox namespaces may not launch Electron;
  the project does not add a no-sandbox workaround. Test on a compatible host.
- This managed Debian container specifically aborts normal dev/start and the secure
  smoke on the SUID sandbox helper configuration. Its install/typecheck/lint/unit/build
  results pass, including a checkout in a path with spaces. The smoke explicitly
  sets chromiumSandbox true; sandboxed GUI support is not claimed for this container.
- Build produces unpackaged development artifacts, not .exe/.msi/.dmg installers.
  Signing, packaging, distribution, updates, and production hardening are not included.
- Electron embeds its own Node runtime; the selected system Node is for tooling.
  Earlier scaffold checks did not verify providers or persistence. See the latest
  [verification record](VERIFICATION.md) for subsequent real-provider/storage evidence.

Security details and the change to the original local-browser proposal are in
[ADR-002](adr/ADR-002-desktop-foundation.md). The [roadmap](../ROADMAP.md) still
requires real provider and persistence evidence for the first agent workflow.
