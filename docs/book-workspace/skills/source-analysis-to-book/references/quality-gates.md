# Quality Gates

A run using this skill is not complete unless most of the following are true:

## Analysis Quality
- The result explains the system by control-flow, state, and recovery logic rather than by folder listing.
- At least one core system tension or tradeoff is identified.
- Non-removable components are called out explicitly.
- Edge cases or recovery paths are covered, not just happy paths.

## Evidence Quality
- Verified facts are separated from inference.
- Important conclusions can be traced back to code, comments, config, or call chains.
- The evidence map is updated before or together with chapter drafting.

## Writing Quality
- Each chapter or section answers one non-obvious question.
- Mechanism, constraint, and effect are separated.
- The draft does not read like a module catalog or generic AI essay.
- Information density is high enough that removing 20%-30% would materially hurt understanding.

## Continuation Quality
- `project-status.md` and status snapshots are updated when the task spans multiple rounds.
- Another agent should be able to continue from the saved artifacts without re-reading the whole repository.
