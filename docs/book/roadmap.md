# 24h Roadmap

## Project
- Working title: 《人人看得懂的 Claude Code 架构拆解》
- Subtitle: 从顶级 Agent 样本出发，带普通人造出自己的业务 Agent

## Core objective
Use Claude Code as the primary case study to teach non-technical readers how a real agent system works and how to build a simplified business-ready agent.

## 24-hour priority
Primary focus: deepen Claude Code source analysis while continuously converting findings into book-ready notes, chapter drafts, and architecture annotations.

## Delivery targets
1. Deepen source annotations for core runtime files.
2. Produce book planning and traceability docs.
3. Draft chapter 1 and outline subsequent chapters.
4. Distill technical moat, barriers, and transferable lessons.
5. Commit and push every completed chunk.

## Execution phases
### Phase 1
- Build book docs structure and traceability files.
- Commit/push baseline.

### Phase 2
- Analyze core runtime path: entrypoint, commands, tools, QueryEngine, query loop.
- Write architecture notes and annotate code.

### Phase 3
- Analyze task, state, recovery, compact, memory.
- Write moat/barrier notes.

### Phase 4
- Draft chapter 1.
- Continue iterative commit/push cadence.

### Phase 5+
- Expand to tools, permissions, multi-agent/runtime modes, and later chapter drafts.


## Execution rules in effect
- Commit each clearly finished chunk immediately; do not batch large updates.
- Use a ~10-minute commit/push cadence whenever a chunk reaches done-state, so remote progress stays continuously visible.
- Push as soon as a commit is ready so remote progress stays visible.
- Run an hourly self-check covering progress, acceptance criteria, and drift detection.
- If a stage does not meet its own acceptance bar, keep correcting before calling it complete.
- Use agent-team mode by default for independent substreams: parallel execution by subagents, parent session as coordinator/integrator.
- Persist key planning decisions and user guidance into repo docs for traceability.
