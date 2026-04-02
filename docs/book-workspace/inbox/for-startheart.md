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

状态：待处理

---
