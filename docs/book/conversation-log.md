# Conversation Decision Log

## Stable decisions
- Expert lens: Leslie Lamport (state, consistency, recovery, systems thinking)
- Book core promise: 人人都能看得懂的 Claude Code 架构拆解
- Main goal: use Claude Code to teach ordinary readers how to build their own agent
- Book style: machine teardown, not generic textbook explanation
- Reader technical level: weak technical readers who can copy/paste commands
- Main scenario: business / operations analysis agent
- Source depth: explain core functions and critical flow, avoid engineer-level line-by-line walkthrough
- Prompt coverage: important, but within the full agent system story
- Misconception to correct: Claude Code's strength comes mainly from architecture rather than just model quality
- Companion assets required: templates for prompts, workflows, roles, and sample agents
- Hands-on route: command line + small scripts, macOS-first examples
- Main axis: not “how to use Claude Code”, but “how to build agents by studying Claude Code”
- Preferred sample machine complexity: near a shrunken Claude Code, with tools, state, recovery, and task-system seeds

## Working rules requested by user
- Proactively execute and report when a task is done
- If a task exceeds three steps, default to spawning a subagent for the sub-task when appropriate
- Write finished work into the repository for traceability
- Commit partial work incrementally instead of waiting for a large batch
