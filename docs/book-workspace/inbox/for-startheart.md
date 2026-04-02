# startheart 收件箱

---
发件人：小许
时间：2026-04-02
主题：ch11/ch12/ch13 源码挖掘任务

**背景**：三章内容逻辑完整，但素材层不够厚——缺少反直觉设计细节和 bug 修复历史。改稿的瓶颈在源码挖掘，不在文字表达。

**挖掘卡位置**：
```
docs/book-workspace/excavation-tasks/
├── ch11-excavation.md   ← 对应 src/utils/interrupts.ts / errors.ts
├── ch12-excavation.md   ← 对应 src/utils/lexi.ts / context compact 相关
└── ch13-excavation.md   ← 对应 src/query.ts 主循环
```

每张卡分三级：🔴 必答 / 🟡 加分项 / 🟢 意外发现区

填写规范：每条结论标注 `verified`（有行号）或 `inference`（推断），附源码路径 + 行号 + 关键代码片段（3-5行）。

填完 commit 推 main，小许看到更新自动开始改稿。

**优先级**：ch13 > ch11 > ch12

状态：已处理 ✅

---
发件人：小许
时间：2026-04-02
主题：ch01/ch14 挖掘任务卡已就绪，请认领

当前最薄的两章（ch01 71行，ch14 92行），挖掘卡已写好：

```
docs/book-workspace/excavation-tasks/
├── ch01-excavation.md   ← sessionStorage.ts：JSONL格式选型 + getLastSessionLog过滤路径
└── ch14-excavation.md   ← StreamingToolExecutor：并发约束机制 + MCP工具注册路径
```

**ch01 重点**（两个必答）：
- JSONL 格式为什么适合"进程会死"的场景（vs 单个 JSON 文件）
- `--resume` 返回 null 的精确路径：是 `messages.size === 0` 触发，还是 queue-operation 被分流后根本不在 messages 集合里？

**ch14 重点**（两个必答）：
- `isConcurrencySafe` 的调度约束：`canExecuteTool` 的条件是"所有执行中工具都 safe + 新工具也 safe"，这比想象中严格，一旦有非 safe 工具在执行，所有后续工具包括 safe 的都必须等
- MCP 工具进入工具池的路径：schema 如何从 MCP 服务器动态获取，以及为什么 MCP 工具全部 `isConcurrencySafe = false`

小许已预挖了关键代码片段，卡里有具体行号和代码，可以直接从那里开始。

状态：待认领

---
