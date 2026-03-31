# Book Requirements

## Positioning
This is not a Claude Code usage manual and not a pure engineer-facing code walkthrough. It is an online, iteratively updated technical implementation guide that uses Claude Code as the main sample machine for explaining agent architecture.

## Core promise
人人看得懂的 Claude Code 架构拆解。

## Target readers
- Non-technical or weakly technical readers
- Can copy/paste commands
- Usually do not understand code deeply
- Want to build a simplified agent and use it in real work

## Reader outcome
Readers should be able to understand why Claude Code is strong, distinguish model capability from system capability, and build a simplified agent they can apply to business work.

## Main use case
Business/operations analysis agent.

## Writing style
- Story-like machine teardown
- Architecture-first, not prompt-hack-first
- Explain core functions and flows without drowning readers in implementation detail
- Mid-level amount of commands/config/pseudocode

## Scope choices
- 70% Claude Code specific, 30% general agent principles
- Online tutorial/manual form, not print-first
- Command line + small scripts as the default hands-on environment
- Cross-platform in principle, macOS-first in examples
- Prompting is important, but part of a larger system story

## Key misconception to correct
Claude Code is powerful primarily because of its system architecture, not just because the underlying model is strong.

## Required companion artifacts
- Prompt templates
- Workflow templates
- Agent role templates
- Example business agents

## Preferred sample machine target
A shrunken Claude-Code-like business agent with tools, state, recovery ideas, and early task-system structure.
