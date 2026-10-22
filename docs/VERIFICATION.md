# Documentation verification

Use Node.js 24.19.0 and npm 11.9.0. Full desktop commands and platform evidence
are in [DEVELOPMENT.md](DEVELOPMENT.md).

```sh
npm ci
npm run check
git diff --check
```

`npm run check` runs these independent checks in order:

| Command | What it verifies |
| --- | --- |
| `npm run lint:md` | Markdown style using the pinned markdownlint library and repository configuration |
| `npm run check:links` | Relative Markdown links/images, file targets, and GitHub-style heading anchors |
| `npm run check:structure` | Issue forms, PR template, required documents, and workflow structure |

The link checker parses Markdown links and reference links, checks targets against
the repository root, and validates heading fragments with GitHub-style slugs.
External URLs are skipped: passing does not prove their availability. Code samples
and raw HTML links are not treated as Markdown links. It rejects unresolved local
targets and reports the source file.

The structure check is a static consistency check, not a GitHub platform schema
validation or a substitute for reviewing the rendered issue forms. The CI workflow
runs these checks on pushes and pull requests with read-only repository access;
a local pass does not prove GitHub Actions has run.

Automated checks cannot establish truthful product claims, owner approval, license
rights, or a working provider. Review those manually against
[the product brief](../PRODUCT.md), [capability map](../README.md#capability-map),
and [roadmap gates](../ROADMAP.md). None of the documentation checks verifies AI
execution, model quality, database behavior, or security controls.

The tooling uses markdownlint directly to avoid unnecessary CLI/glob dependencies.
A pinned KaTeX override addresses a transitive security advisory until the upstream
math extension updates its dependency range. Review that override when upgrading
markdownlint; it is part of documentation tooling, not an application dependency.

## Desktop checks

- `npm run typecheck`: strict TypeScript across configs, Electron, renderer, and packages.
- `npm run lint`: ESLint, React hooks, import boundaries, and the document checks above.
- `npm test`: Vitest validation, asset-path/IPC policy, loading/error/retry, and navigation.
- `npm run build`: Electron main/preload bundles and production renderer assets.
- `npm run test:e2e`: actual Electron window, preload isolation/sandbox state, absence
  of renderer Node globals, narrow bridge, navigation, CSP eval denial, and popup denial.

The smoke opens the built app; run build first. It creates an isolated temporary
user-data directory and a screenshot under ignored `test-results/`. Unit fixtures are synthetic test data. The office also ships a separate opt-in
Demo Mode with permanent fictional-data labels; it is not runtime evidence.
Playwright's Electron launcher disables Chromium sandboxing by default, so the
smoke explicitly enables it. A host incapable of running that sandbox must fail
the smoke instead of silently weakening the test.

## Recorded platform verification — 2026-10-21

| Check | Windows x64 / PowerShell CI | Managed Debian 13 x64 |
| --- | --- | --- |
| npm ci from clean checkout | Passed | Passed, also in a path with spaces |
| npm run typecheck | Passed | Passed |
| npm run lint | Passed | Passed: 20 Markdown files and 89 local links included |
| npm test | Passed: 8 checks | Passed: 8 checks |
| npm run build | Passed | Passed |
| npm run test:e2e with Chromium sandbox enabled | Passed: real window, bridge, navigation, CSP, popup denial | Cannot launch: host SUID sandbox configuration |
| npm run dev | Not separately exercised by this CI | Vite starts, Electron aborts on host sandbox; nonzero exit |
| npm audit --audit-level=moderate | Not a CI gate | Passed: 0 vulnerabilities |

The [Windows run](https://github.com/Bekzhanizb/AgentNest/actions/runs/39662049102)
verified code commit b8a59188214401e1620bd0bb45c187eb063b9e95. A documentation-only
follow-up records these results; inspect the PR checks for its latest head.
No platform result establishes working agents, providers, databases, installers,
or supported production deployment.

## Pixel-office verification — 2026-10-22

The presentation preview adds [these boundaries and controls](OFFICE.md).
On managed Debian 13 x64, Node 24.19.0 / npm 11.9.0:

| Check | Result |
| --- | --- |
| npm ci with the committed lockfile | Passed: 313 packages restored |
| npm run typecheck | Passed across all five workspaces and test/config projects |
| npm run lint | Passed: ESLint, 21 Markdown files, relative links, repository structure |
| npm test | Passed: 25 checks in 6 files, including every requested status |
| npm run build | Passed: Electron bundles and lazy-loaded Pixi renderer chunks |
| npm audit --audit-level=moderate | Passed: 0 vulnerabilities at verification time |
| npm run test:e2e | Cannot launch secure Electron on this host; Windows passed as recorded below |
| git diff --check | Passed |

A separate Playwright harness opened the production assets through Vite preview
with the installed system Chromium and software WebGL. It verified an actual Pixi
canvas, keyboard roster/focus, sprite hit selection, drag, zoom/reset, reduced
motion, explicit demo cleanup, graphics-loss fallback/retry, dynamic-eval denial,
zero uncaught page errors, and zero external HTTP requests. Axe WCAG 2 A/AA and
2.1 AA scans reported **zero violations** at 1440, 390, and 320 pixels; none of those
widths overflowed horizontally. Full-page screenshots were visually inspected.
This browser harness is separate from Electron verification and uses no provider.

For that preview, run `npm run build`, then the local Vite preview binary with
`preview --config apps/desktop/vite.config.ts --host 127.0.0.1 --port 4173`.
Use Playwright with a locally installed Chromium for the browser-only checks.
The committed Electron smoke reproduces the central interactions and axe scan
without requiring a separate Playwright browser installation.

The first local Electron attempt could not fetch its lazy binary without the
managed host's proxy configuration. Retrying with Node's environment-proxy support
and the existing Electron cache restored the binary but still could not launch
with the Chromium sandbox enabled. No application or test sandbox setting was
weakened. The Windows workflow checks a fresh checkout through PowerShell; consult
the feature PR for the exact commit and final run, rather than applying historical
foundation results to new code.

Manual screen-reader, high-contrast OS settings, physical touch devices, macOS,
ARM, and other GPUs are not verified. Passing axe is not a complete accessibility
certification. The scoped Pixi dependency declaration-check exception is recorded
in the [office guide](OFFICE.md#verification-and-limits).

Windows x64 / PowerShell passed a fresh checkout on 2026-10-22 in
[Desktop checks](https://github.com/Bekzhanizb/AgentNest/actions/runs/39709125696):
`npm ci`, `npm run typecheck`, `npm run lint`, `npm test` (25 checks),
`npm run build`, and `npm run test:e2e` all succeeded. That smoke opened an actual
sandboxed Electron/Pixi window and passed the fictional-state, keyboard, sprite
selection/drag, reduced-motion, axe, narrow-bridge, CSP, and popup assertions.
The recorded run tested e26cf438e2c04ff515869e0b0e805b8826b2ab5b. A follow-up
adds a clearer procedural door panel and records this evidence; the
[feature PR](https://github.com/Bekzhanizb/AgentNest/pull/7) carries checks for its
latest head. AI, providers, and persistence remain unimplemented.

## Office polish and accessibility review — 2026-10-22

The UI now uses a warm light palette with forest navigation, original geometric
icons, and DOM portraits sharing the Pixi character rectangles. Provider/runtime
scope is unchanged. The inferred flow under review is explicit Demo Mode controls
→ deterministic AgentEvent projection → Pixi scene and DOM roster/inspector.
There is no API, database, or provider layer in that flow.

| Boundary / command | Managed Debian 13 x64 result |
| --- | --- |
| npm ci | Passed: 313 packages restored, dependency versions and lockfile unchanged |
| npm run typecheck | Passed: strict source checks including the browser-suite config |
| npm run lint | Passed: ESLint, 22 Markdown files, local links, repository structure |
| npm test | Passed: 25 checks, including focus-to-inspector/Escape return and URL-preserving skip |
| npm run build | Passed: Electron bundles and lazy Pixi chunks |
| npm run test:ui with installed system Chromium | Passed: 3 production-browser scenarios |
| Empty UI → explicit demo → DOM/Pixi state | Passed: no default characters, fictional labels, actual scene hit selection |
| Keyboard and responsive layout | Passed at 1440/390/320 px; no overflow; skip/main/inspector/return focus |
| Forced colors and reduced motion | Passed browser emulation and axe; screenshots reviewed |
| Touch controls | Passed touch emulation, sprite selection, zoom, inspector, and 44-pixel targets at phone/tablet widths |
| Page errors and external HTTP requests | Zero in the production-preview flow |
| git diff --check | Passed |

The initial color-contrast scan identified low-contrast secondary captions and
hover/task labels. Those colors were corrected; the final axe WCAG 2 A/AA and
2.1 AA scans reported zero violations for empty, demo, and forced-color states.
Status/shortcut symbols use original inline SVG so missing glyphs and emoji font
fallbacks do not determine their appearance. Screenshot paths are under ignored
`test-results/browser/`; `npm run test:ui` reproduces them after a build.

The browser suite starts and stops its own loopback Vite preview. Local verification
selects `/usr/bin/chromium` through `AGENTNEST_BROWSER_EXECUTABLE`; Windows CI uses
the pinned Playwright Chromium download. Browser-only software WebGL flags are not
passed to Electron. The actual secure Electron smoke remains a separate check;
this managed Linux host cannot launch it with Chromium sandboxing enabled. The
feature PR records the current Windows run for the exact head.

NVDA, a Windows OS contrast theme, Windows text scaling, physical touch and broader
hardware testing remain open in the [manual review matrix](ACCESSIBILITY.md).
Automated browser emulation does not close those gates. No real provider call or
runtime proof was performed; no configured provider/credential is available in
this managed environment. The corresponding roadmap stage remains open.
