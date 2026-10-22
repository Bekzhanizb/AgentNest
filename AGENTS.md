# Repository instructions

AgentNest is Pre-alpha. The repository contains a minimal Electron/React desktop
shell, isolated fictional office, and an experimental Node-only Ollama notes proof.
Tasks now exposes a bounded, one-off local notes run through a window-owned grant
and a Node worker. Saved agent definitions, databases and a real office feed remain
unimplemented.

- Read [PRODUCT.md](PRODUCT.md), [ROADMAP.md](ROADMAP.md), and
  [ADR-001](docs/adr/ADR-001-local-architecture.md) before changing scope.
- Keep the English README and [Russian summary](docs/ru/README.md) consistent.
  Describe planned work as planned; do not turn fixtures or mocks into feature claims.
- Preserve useful existing content and copyright notices. The existing LICENSE
  must remain unchanged without an explicit owner decision.
- Keep provider-specific SDKs behind adapters and database access behind a
  persistence boundary as implemented in ADR-003. ADR-001 remains the broader MVP proposal.
- Add implementation only when the task explicitly asks for it. Do not scaffold
  simulated activity outside the explicitly labeled, opt-in Demo Mode, or pretend
  an unimplemented integration works. Coming
  soon screens are explicitly labeled placeholders.
- Do not commit secrets, private notes, unredacted prompts, or generated dependency
  directories. Keep documentation tooling separate from future product code.
- Use npm workspaces and the root lockfile; do not introduce a second manager.
- Keep renderer code free of Node, Electron, provider, and storage imports.
  Expose individual operations through preload; never expose generic IPC.
- Keep `packages/office-scene` presentation-only. Agent status must come from
  typed core snapshots, never the animation clock. Demo fixtures must stay separate
  from future runtime events; preserve permanent demo labels and the empty default.
- Keep CLI and desktop entry points separate, sharing the bounded runtime. Desktop
  notes runs use ADR-004: native picker, metadata preview, single-use expiring grant,
  strict IPC and worker events. Keep real output out of the fictional office.
  Only the adapter may
  import the native provider client. Use public notes for committed live evidence;
  never substitute mocked events for a real-provider verification record.
- Preserve sandbox, context isolation, CSP, frame validation, and permission denial.
- Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
  and `npm run test:e2e` for desktop changes; `npm run check` for documents.
  Report commands actually run and any unverified assumptions.
- Keep GitHub metadata, banner, and announcement copy as drafts in
  [docs/COMMUNICATIONS.md](docs/COMMUNICATIONS.md) until the owner authorizes publication.
- Use the [PR template](.github/pull_request_template.md) and
  [changelog conventions](docs/CHANGELOG_CONVENTIONS.md).
