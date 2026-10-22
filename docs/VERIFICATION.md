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
Automated browser emulation does not close those gates. At that UI-polish stage, no real provider call or runtime proof had been performed.
The later isolated proof below records new evidence; it does not retroactively
change the scope of those earlier UI checks.

## Isolated Ollama proof and accessibility follow-up — 2026-10-22

The [proof guide](OLLAMA_PROOF.md) and [ADR-003](adr/ADR-003-ollama-notes-proof.md)
separate this Node experiment from desktop integration. The committed
[real-run record](proofs/ollama-notes-2026-10-22.json) contains actual events,
source SHA-256, provider/model metadata, usage and negative controls. Only public
repository fixtures were used; no private prompts, daemon keys or model weights
are committed. Recorded implementation hashes identify the exact proof sources.

| Command / boundary | Actual managed Debian 13 x64 result |
| --- | --- |
| npm ci | Passed: 326 packages; 13 new external packages, existing dependency versions unchanged |
| npm run typecheck | Passed: strict source/tests across eight workspaces; scoped SDK declaration exception documented in ADR-003 |
| npm run lint | Passed: ESLint boundaries, 26 Markdown files, relative links and structure |
| npm test | Passed: 68 tests in 9 files, including real filesystem permission tests and explicitly mocked model/HTTP contracts |
| npm run --silent proof:ollama -- --help | Passed: bundles and opens the CLI without starting a provider; also required by Windows CI |
| npm run build | Passed: Electron/preload/renderer output; no model SDK added to desktop bundles |
| npm run test:ui with system Chromium 154.0.8037.57 | Passed: 4 production-browser scenarios; zero axe violations in scanned states |
| npm run test:e2e | Failed to launch the secure Electron process on this sandbox-restricted Linux host; no sandbox bypass added |
| npm run --silent proof:ollama -- --model qwen3:1.7b --notes fixtures/notes | Passed: actual CPU inference, 2 model calls, 2 read_note executions, 9 events, exit 0 |
| Real timeout / step limit / unavailable daemon | Passed expected-failure assertions: exit 1, TIMEOUT / LIMIT_EXCEEDED / UNAVAILABLE, no completion |
| Real cancellation | POSIX SIGINT and fixed parent IPC message both produced run_cancelled, exit 130, no completion |
| Evidence source and implementation SHA-256 validation | Passed against the actual public inputs and recorded implementation files |
| git diff --check | Passed |

Official Ollama 0.40.8 was installed temporarily outside the repository after
verifying its release archive SHA-256. Cloud features were disabled; the daemon
bound only to 127.0.0.1 with one model and one parallel request. The actual model
manifest was 8f68893c685c3ddff2aa3fffce2aa60a30bb2da65ca488b61fff134a4d1730e7.
The selected tag is qwen3:1.7b; installed metadata reports Q4_K_M, 2,031,739,904
parameters and 1,359,293,444 bytes. Tags alone do not identify immutable weights.
The final recorded run took 41.722 seconds on a 3-logical-CPU, 8-GiB-limit container.
Its three summary bullets were compared with the actual purpose/permissions notes.
That one reviewed result does not establish general model quality.

The new keyboard-only browser scenario exercises entry, selection, inspector
focus/return, motion enable, live reduced-motion disable, narrow reflow, and demo
exit. Desktop, phone and forced-color screenshots were visually reviewed. The
[manual matrix](ACCESSIBILITY.md#manual-review-still-required) remains open for
NVDA, actual Windows contrast/text-size settings, true browser zoom, OS motion
settings and physical touch. Browser emulation and screenshot review do not close
those gates.

Windows CI continues to run a fresh PowerShell checkout, strict checks, all mock
and filesystem tests, build, the actual sandboxed Electron smoke, and the browser
suite. Consult the feature PR for its exact head and current run; earlier Windows
passes are not attributed to this change. Real inference, interactive Ctrl+C and
manual assistive-technology review on Windows remain unverified. Model installation
and downloads are not part of normal CI. macOS and ARM remain unverified.

## Desktop notes permission and worker — 2026-10-22

The [Tasks guide](DESKTOP_NOTES.md) and [ADR-004](adr/ADR-004-desktop-notes-permission.md)
describe the experimental one-off desktop flow. The earlier CLI evidence above
belongs to its recorded original revision; newer desktop approval code is not
retroactively attributed to those old implementation hashes.

Managed Debian 13 x64, Node 24.19.0/npm 11.9.0:

| Command / boundary | Actual result |
| --- | --- |
| npm ci | Passed: 326 packages; zero new external packages and zero external version changes |
| npm run typecheck | Passed: strict project sources; main/preload/core dependency declaration checks retained; worker shares the scoped SDK exception |
| npm run lint | Passed: import boundaries, 28 Markdown files, relative links and repository structure |
| npm test | Passed: 93 tests in 12 files; permission/expiry/replay/native-confirmation/revocation, worker failure and frontend inert-text cases are explicitly mocked where appropriate |
| npm run build | Passed: main, sandboxed preload, separate notes-worker bundle and production renderer |
| npm run test:ui with system Chromium 154.0.8037.57 | Passed: 5 browser scenarios, including Tasks at 1440/390/320 CSS pixels; zero scanned axe violations |
| Node owner + bundled worker + actual Ollama | Completed: two model calls, two public notes read and a source-linked summary; this is backend evidence, not an Electron-window claim |
| npm run test:e2e | Secure Electron cannot launch on this managed Linux host; no sandbox bypass used |
| git diff --check | Passed |

The initial Linux Electron attempt could not download its lazy binary through the
managed proxy/cache defaults. Using Node's inherited environment-proxy support and
Electron's documented electron_config_cache restored the cached verified binary;
the host then blocked secure process launch as in earlier stages. The actual GUI
and provider integration are delegated to compatible Windows CI, not inferred
from the Node-only run or browser preview.

Normal Windows CI now includes an actual Electron permission/worker test using a
native-dialog harness over real public temporary files. It rejects Markdown added
after permission review before a provider call and revokes grants on reload.
A separate Desktop provider proof workflow installs checksum-verified Ollama and
an explicit digest-verified model, then requires actual desktop completion,
source hashes, cancellation after navigation, axe and zero renderer HTTP requests.
The feature PR records the exact tested head, run outcomes and public artifacts;
workflow configuration alone is not real-run evidence. Ordinary checks download
no model. Manual NVDA, native dialog focus, OS contrast/text scaling, physical touch
and broader platforms remain open in the [review matrix](ACCESSIBILITY.md).
