# Repository instructions

AgentNest is in Planning. The repository currently contains documentation and
documentation tooling, not a runnable product.

- Read [PRODUCT.md](PRODUCT.md), [ROADMAP.md](ROADMAP.md), and
  [ADR-001](docs/adr/ADR-001-local-architecture.md) before changing scope.
- Keep the English README and [Russian summary](docs/ru/README.md) consistent.
  Describe planned work as planned; do not turn fixtures or mocks into feature claims.
- Preserve useful existing content and copyright notices. The existing LICENSE
  must remain unchanged without an explicit owner decision.
- Keep provider-specific SDKs behind adapters and database access behind a
  persistence boundary when implementation begins. The ADR is a proposal, not code.
- Add implementation only when the task explicitly asks for it. Do not scaffold
  a fake UI, stub product API, or simulated integration to fill an empty repository.
- Do not commit secrets, private notes, unredacted prompts, or generated dependency
  directories. Keep documentation tooling separate from future product code.
- Run `npm ci`, `npm run check`, and `git diff --check` for document changes.
  Report commands actually run and any unverified assumptions.
- Keep GitHub metadata, banner, and announcement copy as drafts in
  [docs/COMMUNICATIONS.md](docs/COMMUNICATIONS.md) until the owner authorizes publication.
- Use the [PR template](.github/pull_request_template.md) and
  [changelog conventions](docs/CHANGELOG_CONVENTIONS.md).
