# Documentation verification

Use Node.js 22 or newer and npm. There is no application test suite in this phase.

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
