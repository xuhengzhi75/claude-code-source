---
name: source-analysis-to-book
description: Analyze a complex code repository and turn the findings into reusable evidence notes, chapter plans, and long-form technical writing artifacts. Use when working on repo analysis, architecture deep dives, codebase-to-book/documentation projects, chapter planning, evidence mapping, or continuous writing workflows that need status, handoff, and continuation support.
---

# source-analysis-to-book

Use this skill to convert a codebase understanding task into a durable writing workflow.

## Workflow

1. Scan the repository for entrypoints, execution paths, state carriers, recovery logic, tool boundaries, and major subsystems.
2. Identify the system's core tensions: what complexity it is fighting, which constraints shape the design, and which components are non-removable.
3. Produce evidence notes that separate:
   - verified facts
   - inference
   - edge cases
   - design tradeoffs
   - why-it-matters
4. Design writing outputs around non-obvious questions, not directory walkthroughs.
5. Maintain continuation artifacts so work can resume cleanly after interruption.

## Default Output Set

Prefer producing or maintaining these artifacts:
- `planning/planning/project-status.md`
- `status/status/status-index.md`
- `status/status-*.md`
- `references/references/chapter-evidence-map.md`
- `workflow/workflow/analysis-handoff-template.md`
- `architecture-notes/*.md`
- `chapters/*.md`
- `methodology/methodology/writing-guide.md`
- `methodology/methodology/writing-principles.md`

## Writing Rules

- Write by control-flow and state transitions, not by folder listing.
- Make every chapter answer one non-obvious question.
- Separate mechanism, value, constraints, and effects.
- Prefer edge cases, failure paths, and recovery paths over happy-path summaries.
- Do not present inference as verified fact.
- Do not let analysis degrade into a README-style module catalog.

## Anti-Patterns

Avoid:
- flat module-by-module explanation
- generic observations without source-backed tension or tradeoff
- writing chapters before building an evidence base
- losing continuity because status and handoff documents are missing

## References

Read these only when needed:
- `../source-analysis-to-book-skill-draft.md` for the expanded skill draft
- `../../methodology/book-writing-playbook-2026-04-01_to_2026-04-02.md` for the distilled writing methodology
