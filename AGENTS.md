# Repository instructions

AgentNest is Pre-alpha. The repository contains a minimal Electron/React desktop
shell and domain/provider/storage contracts, with no agent runtime or AI integration.

- Read [PRODUCT.md](PRODUCT.md), [ROADMAP.md](ROADMAP.md), and
  [ADR-001](docs/adr/ADR-001-local-architecture.md) before changing scope.
- Keep the English README and [Russian summary](docs/ru/README.md) consistent.
  Describe planned work as planned; do not turn fixtures or mocks into feature claims.
- Preserve useful existing content and copyright notices. The existing LICENSE
  must remain unchanged without an explicit owner decision.
- Keep provider-specific SDKs behind adapters and database access behind a
  persistence boundary when implementation begins. The ADR is a proposal, not code.
- Add implementation only when the task explicitly asks for it. Do not scaffold
  simulated agent activity or pretend an unimplemented integration works. Coming
  soon screens are explicitly labeled placeholders.
- Do not commit secrets, private notes, unredacted prompts, or generated dependency
  directories. Keep documentation tooling separate from future product code.
- Use npm workspaces and the root lockfile; do not introduce a second manager.
- Keep renderer code free of Node, Electron, provider, and storage imports.
  Expose individual operations through preload; never expose generic IPC.
- Preserve sandbox, context isolation, CSP, frame validation, and permission denial.
- Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
  and `npm run test:e2e` for desktop changes; `npm run check` for documents.
  Report commands actually run and any unverified assumptions.
- Keep GitHub metadata, banner, and announcement copy as drafts in
  [docs/COMMUNICATIONS.md](docs/COMMUNICATIONS.md) until the owner authorizes publication.
- Use the [PR template](.github/pull_request_template.md) and
  [changelog conventions](docs/CHANGELOG_CONVENTIONS.md).
