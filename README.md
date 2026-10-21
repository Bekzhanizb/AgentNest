# AgentNest

**Status: Planning.** This repository contains product, architecture, and
contribution documents. There is no runnable application, agent runtime, working
AI integration, or product release yet.

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
| Product brief, architecture proposal, community files | Documents in this change | Foundation |
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
- [Roadmap and acceptance gates](ROADMAP.md)
- [Documentation index](docs/README.md)
- [Кратко по-русски](docs/ru/README.md)

## Participate

Review the first workflow, challenge the architecture assumptions, improve the
documentation, or propose a small implementation slice through the repository's
issue forms. Read [CONTRIBUTING](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md) before opening a PR. Report sensitive
findings using the [security policy](SECURITY.md).

There are no application setup commands yet. To check the documentation, install
Node.js 22 or newer with npm and run:

```sh
npm ci
npm run check
```

These commands validate repository documents; they do not start AgentNest.

## License

The repository already contains an [MIT license](LICENSE), preserved with its
original copyright notice. Retaining MIT is the recommendation; explicit owner
confirmation of that policy is pending. See the [licensing decision](docs/LICENSING.md).
