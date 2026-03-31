# Book Outline v1

## Working title
《人人看得懂的 Claude Code 架构拆解》

## Subtitle
从顶级 Agent 样本出发，带普通人造出自己的业务 Agent

## Core thesis
Claude Code is powerful not mainly because the model is stronger, but because the system organizes model, tools, state, tasks, recovery, and permissions into a machine that can keep working.

## Part I — What Claude Code really is
1. Claude Code is not a chatbot, but a working machine
2. Why Claude Code is strong
3. How to inspect Claude Code like a machine teardown

## Part II — Claude Code architecture
4. Entrypoints and request routing
5. Capability assembly: commands, tools, skills, plugins
6. QueryEngine as orchestration core
7. Query loop as runtime engine
8. Task system and long-running work

## Part III — Moat and technical barriers
9. The moat is not “just the model”
10. Hard-to-copy runtime barriers
11. Why many agents look similar but fail at real work
12. What to learn from Claude Code and what not to copy too early

## Part IV — Build a shrunken version
13. A minimal working agent skeleton
14. Tools as hands and legs
15. Prompts and task directives as the controllable brain surface
16. State and context
17. Task progression and runtime structure
18. Recovery as the dividing line between toy and real system

## Part V — Real business use
19. Why operations analysis is the right first business agent
20. Build an operations-analysis agent
21. Embed the agent into a real workflow
22. From Claude Code to your own business agent system
