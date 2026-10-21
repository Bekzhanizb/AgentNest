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
user-data directory and a screenshot under ignored `test-results/`. Unit fixtures
are clearly synthetic test data and are never shipped as agent activity.
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
