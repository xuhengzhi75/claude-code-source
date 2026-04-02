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

状态：已处理 ✅

---
发件人：小许
时间：2026-04-02
主题：下一批挖掘任务：ch02 / ch16 / ch10（按优先级排序）

ch01/ch14 改稿已完成并推送，感谢高质量的挖掘卡！

**现在最薄的三章**（100-123行）需要继续挖掘：

```
docs/book-workspace/excavation-tasks/
├── ch02-excavation.md   ← 为什么强：StreamingToolExecutor流式并发时序 + 多agent量化约束 + 反蒸馏两层机制对比
├── ch16-excavation.md   ← 状态与上下文：函数式更新必要场景 + token预算裁剪算法 + selector性能价值
└── ch10-excavation.md   ← 运行时壁垒：GrowthBook离线fallback + agent_busy状态机 + excluded-strings覆盖范围
```

**优先级**：ch02 > ch16 > ch10（ch02 是全书论证核心之一，最需要量化支撑）

每张卡里小许已经标注了关键源码锚点，可以从那里开始。

填写规范同前：结论 + verified/inference + 行号 + 关键代码片段。

状态：待认领

---
发件人：Codex CLI Worker
时间：2026-04-02
主题：blog 渲染链安全加固任务（请由 startheart 执行，不由我直接改）

当前已完成安全审查，并形成两份参考材料：

- `docs/book-workspace/workflow/blog-dependency-security.md`
- `docs/book-workspace/workflow/blog-rendering-hardening-plan.md`

**请 startheart 接手的具体修复动作**：

### P1：Markdown 渲染链加固
当前链路：
```text
markdown -> marked.parse(md) -> innerHTML
```

目标：
```text
markdown -> marked.parse(md) -> sanitizer -> innerHTML
```

建议优先方案：
1. 在 `blog/index.html` / `blog/app.js` 中引入 `DOMPurify`
2. 先不大改 blog 结构，只在 `marked.parse(md)` 与 `container.innerHTML` 之间增加清洗层
3. 保证现有章节渲染、代码高亮、Mermaid、锚点面板不被顺手改坏

### P1：评估 Mermaid 安全级别
当前 `blog/app.js` 使用：
- `securityLevel: 'loose'`

请做：
1. 盘点现有图表是否真的依赖 `loose`
2. 若不是强依赖，尝试收紧
3. 若必须保留，至少在文档或代码注释中说明原因与边界

### 边界要求
- 这次任务聚焦“渲染链安全加固”，不要顺手做大规模 UI 重构
- 不要同时引入过多新依赖
- 若短期仍用 CDN，后续再单独处理 vendoring / SRI

### 验收标准
- 渲染链风险被明确收紧
- blog 现有阅读功能不回退
- commit 粒度单一，提交说明清楚
- 如有兼容性权衡，写入 workflow/security 文档

状态：待认领

---
