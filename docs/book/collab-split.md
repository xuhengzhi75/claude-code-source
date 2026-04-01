# 协作分工对齐文档

更新时间：2026-04-01

本文件用于明确当前两个协作方各自负责的工作范围，避免同时修改同一文件造成冲突。

---

## 当前进度快照

已完成（已推送，不要重复修改）：

- `docs/book/chapters/ch01.md` — ch08.md：Part I + Part II 全部 8 章，已润色定稿
- `docs/book/architecture-notes/`：9 个架构笔记文件，已完成
- `docs/book/chapter-evidence-map.md`：ch03–ch08 证据对齐，已完成
- `docs/book/book-outline-v1.md`：22 章大纲，已完成
- `docs/book/requirements.md`：写作要求，已完成
- `docs/book/prompt-templates.md`、`workflow-templates.md`、`agent-role-templates.md`、`example-business-agent.md`：配套模板，已完成

---

## AI 侧（本机）负责范围

以下文件由本机 AI 负责，协同方请勿同时修改：

### 正在进行

| 文件 | 状态 | 说明 |
|------|------|------|
| `docs/book/chapters/ch09.md` | 待创建 | Part III 第9章：护城河不只是模型 |
| `docs/book/chapters/ch10.md` | 待创建 | Part III 第10章：难以复制的运行时壁垒 |
| `docs/book/chapters/ch11.md` | 待创建 | Part III 第11章：为什么很多 Agent 看起来像但干不了真活 |
| `docs/book/chapters/ch12.md` | 待创建 | Part III 第12章：该学什么、先别急着抄什么 |
| `docs/book/chapter-evidence-map.md` | 扩充中 | 补充 ch09–ch12 的证据锚点 |

### 依赖的源码文件（只读，不修改）

- `src/utils/conversationRecovery.ts`
- `src/services/compact/compact.ts`
- `src/utils/tasks.ts`
- `src/Task.ts`
- `docs/book/architecture-notes/moat-and-barriers.md`
- `docs/book/architecture-notes/recovery-and-continuity.md`
- `docs/book/architecture-notes/what-to-learn-from-claude-code.md`

---

## 协同方负责范围

以下文件由协同方负责，本机 AI 不会主动修改：

### 建议协同方接手

| 文件 | 状态 | 说明 |
|------|------|------|
| `docs/book/chapters/ch13.md` | 待创建 | Part IV 第13章：最小可用 Agent 骨架 |
| `docs/book/chapters/ch14.md` | 待创建 | Part IV 第14章：工具作为手脚 |
| `docs/book/chapters/ch15.md` | 待创建 | Part IV 第15章：提示词与任务指令 |
| `docs/book/chapters/ch16.md` | 待创建 | Part IV 第16章：状态与上下文 |
| `docs/book/chapters/ch17.md` | 待创建 | Part IV 第17章：任务推进与运行时结构 |
| `docs/book/chapters/ch18.md` | 待创建 | Part IV 第18章：恢复是玩具和真实系统的分水岭 |

### 协同方可自由修改的文件

- `docs/book/prompt-templates.md`（扩充模板内容）
- `docs/book/workflow-templates.md`（扩充工作流）
- `docs/book/agent-role-templates.md`（扩充角色模板）
- `docs/book/example-business-agent.md`（扩充示例）

---

## 冲突预防规则

1. **每人只写自己负责的章节文件**，不要跨范围修改对方的章节。
2. **`chapter-evidence-map.md` 是共享文件**，修改前先 pull，写完立即 push，不要长时间持有。
3. **`book-outline-v1.md` 和 `requirements.md` 是只读参考**，如需修改请先在此文件里说明，双方确认后再改。
4. **architecture-notes/ 目录**：本机 AI 可能会新增文件，但不会修改已有文件。协同方如需修改已有笔记，请先在此文件里标注。
5. **每次推送前先 `git pull`**，确认没有远程新提交再推。
6. **提交信息格式**：`docs(book): <简短说明>`，方便双方看 log 时快速识别对方做了什么。

---

## 接口约定

章节写作时遵守以下约定，避免后期整合时风格不一致：

- 每章开头用一句话给出结论，不用"本章将……"这类预告式开头
- 正文用散文，不用大量粗体 + 冒号的列表结构
- 源码引用格式：`` `src/xxx.ts` ``，不要只写文件名
- 推断性结论要标注"可以做一个保守推断"，不要写成已证实事实
- 章节长度控制在 600–900 字，超出说明信息密度可能不够

---

## 待双方确认的问题

1. Part V（ch19–ch22）由谁负责？建议协同方接手，本机 AI 专注 Part III。
2. `example-business-agent.md` 是否需要配套代码示例？如果需要，放在哪个目录？
3. 是否需要一个 `SUMMARY.md` 或 `README.md` 作为全书导航入口？

---

*本文件由本机 AI 创建，协同方可直接在此文件末尾追加回复或修改分工表。*
