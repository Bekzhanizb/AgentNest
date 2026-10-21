# Proposed GitHub labels

This catalog is documentation only. No labels were created, renamed, or removed.
The available connector has no label-definition management operation. An owner
or maintainer with label permissions can apply this catalog after review through
**Issues → Labels**. Existing labels should be reused where their meaning matches;
do not delete or rename labels already used by issues without reviewing impact.

| Label | Color (hex) | Description |
| --- | --- | --- |
| `bug` | `d73a4a` | Reproducible defect in existing documents, tooling, or implemented behavior |
| `enhancement` | `a2eeef` | Proposed improvement with a concrete user outcome |
| `documentation` | `0075ca` | Documentation, translation, or examples |
| `question` | `d876e3` | Clarification about scope, decisions, or contribution |
| `good first issue` | `7057ff` | Small task with clear scope and maintainer guidance |
| `help wanted` | `008672` | Maintainer-confirmed task seeking contributions |
| `area:product` | `bfd4f2` | Users, scenarios, scope, or acceptance criteria |
| `area:architecture` | `c5def5` | ADRs, runtime boundaries, or persistence decisions |
| `area:providers` | `5319e7` | Adapter contracts and real provider integrations |
| `area:tooling` | `ededed` | Repository automation and documentation checks |
| `status:needs-triage` | `fbca04` | Awaiting maintainer assessment |
| `status:blocked` | `b60205` | Cannot proceed; issue body should name the dependency |

Issue forms intentionally do not auto-apply labels that may not exist yet. Assign
type and area labels after triage. Reserve `good first issue` for tasks with
acceptance criteria; do not use it as an automatic tag for every new request.
Sensitive security reports belong in the [private reporting process](../SECURITY.md),
not in a public issue labeled security.
