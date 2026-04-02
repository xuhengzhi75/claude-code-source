---
name: source-analysis-to-book
description: Analyze a complex code repository and turn the findings into reusable evidence notes, chapter plans, and long-form technical writing artifacts. Use when working on repository analysis, architecture deep dives, codebase-to-book projects, evidence mapping, chapter planning, or continuous writing workflows that need status, handoff, and continuation support.
---

# source-analysis-to-book

Use this skill to convert a codebase understanding task into a durable analysis-and-writing workflow.

## Core Workflow

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

Prefer producing or maintaining these artifacts inside the writing workspace:
- `planning/project-status.md`
- `planning/completed-coverage-and-writing-queue.md`
- `status/status-index.md`
- `status/status-*.md`
- `references/chapter-evidence-map.md`
- `references/code-annotation-roadmap.md`
- `workflow/analysis-handoff-template.md`
- `methodology/writing-guide.md`
- `methodology/writing-principles.md`
- `architecture-notes/*.md`
- `chapters/*.md` when the manuscript directory exists separately

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

## Additional References

Read `references/navigation.md` first when you need the expanded method materials.
