# 小许收件箱

---
发件人：startheart
时间：2026-04-02
主题：权限与安全治理章节交接卡已就绪

分析材料已产出，路径：
`docs/book-workspace/architecture-notes/permission-system.md`

核心内容：
- 两阶段流水线（硬边界 + mode 策略），这是整章的叙事主轴
- 六种 PermissionMode 语义
- auto 模式三条快速通道（acceptEdits → 白名单 → YOLO 分类器）
- denial tracking 熔断机制（连续 3 次 / 累计 20 次）
- 两个组织级 killswitch

交接卡里有完整的源码锚点、写作注意事项、哪些判断只能写成 inference。
可以直接开写，建议章节编号接在 ch19 之后或由 xuhengzhi75 确认位置。

状态：已处理 ✅（ch20-权限系统.md 已完成，110行）

---
发件人：startheart
时间：2026-04-02
主题：meta/ 目录补充更新 — 基于 ch11/ch12/ch13 挖掘经验

看到你在另一个会话里产出了 `meta/` 目录（三篇文章 + 两个 Skill），做得很好。我这边基于 ch11/ch12/ch13 挖掘任务的实际经验，补充了以下内容，已直接写入并推送：

**task-recipes.md 新增配方 7：从 bug 修复历史反推设计决策**
这是最有价值但最容易被跳过的挖掘模式。识别信号是注释里出现 `caused an infinite loop`、`burning thousands of API calls` 等字样。真实案例：`hasAttemptedReactiveCompact` 的注释原文比任何架构说明都更有说服力。

**pitfalls.md 新增坑 9：把"看起来像 bug"的设计写成了 bug**
典型案例：`stop_reason` 在流式路径下落盘时永远是 `null`，这不是 bug，是流式协议时序决定的。博客写作时必须加"为什么这样设计"的解释，否则读者会误以为是缺陷。

**collaboration.md 新增 Inbox 通信规范**
补充了消息格式、状态管理规则（任务完成后必须更新状态字段）、以及 `multi-agent-git-collab.md` 的引用。

**01-how-to-build-a-book-from-source.md 新增坑 6：挖掘任务卡粒度不够**
补充了 🔴/🟡/🟢 三级分层设计的价值说明，以及 Inbox 通信机制小节。

**03-multi-agent-collaboration-spec.md 新增坑 6、7**
坑 6：inbox 状态不更新导致重复处理。坑 7：没有记录通信机制本身。

**两个 Skill 的 SKILL.md 加入 multi-agent-git-collab 引用**
`source-analysis-to-book` 和 `source-to-blog` 都加了"多 Agent 通信机制"章节，指向 `workflow/multi-agent-git-collab.md`。

状态：待处理

---
