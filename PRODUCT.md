# Product brief

Status: proposed scope, Planning. No application or AI integration is implemented.

## Users and pain

Primary users are developers and technical makers who want to build a personal
agent around a repeatable local task. Small teams are a later audience, once
single-user behavior is reliable.

Today an agent experiment can scatter instructions, provider calls, tool access,
and results across scripts and chat histories. Users need one inspectable place
to define what an agent may do, run it, and understand what happened.

## First real scenario

A maker selects a directory of Markdown notes and asks a saved research agent to
summarize a topic with references to those notes.

1. Define the agent's instructions, local provider/model, read-only directory,
   and run limits; save the definition.
2. Start a run against a real configured model through one provider adapter.
3. Allow a bounded read-only tool to read supported files inside that directory.
4. Inspect the summary, source paths, tool activity, and any errors; explicitly
   export the result if desired.
5. Edit the definition and run again without losing the previous run record.

Success means the workflow works against a real provider, references resolve to
actual input notes, and errors, cancellation, and permission violations are
visible. Reading outside the approved directory, writing inputs, or invoking a
shell must fail. A mocked response alone does not meet acceptance.

## MVP scope

- One local user, one active agent run, and a local browser interface.
- A saved agent definition: instructions, provider/model, allowed tools, limits.
- One real local provider adapter, proposed as Ollama in
  [ADR-001](docs/adr/ADR-001-local-architecture.md).
- A bounded execution loop with tool events, failure states, and cancellation.
- Read-only Markdown notes, source references, and human-reviewed output.
- SQLite persistence for definitions and run history; explicit result export.

AgentNest is an agent creation tool because users can author reusable behavior,
permissions, and limits and execute that definition through a runtime. Pixel art
can later visualize runtime events, but cannot establish that an agent works.
The MVP must pass without a pixel renderer.

## Non-goals

- A decorative simulation presented as an operational agent system.
- Multi-agent orchestration, autonomous publishing, shell access, or background
  actions without review.
- Production hosting, team tenancy, remote access, or a provider marketplace.
- Simultaneous support for every model provider or SQL dialect.
- Guaranteed correctness, unlimited autonomy, or offline operation before actual
  local-provider verification.

See the [roadmap](ROADMAP.md) for stages and completion evidence.
