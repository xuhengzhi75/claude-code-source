# 协作分工对齐文档

更新时间：2026-04-01（v2，轮动机制版）

---

## 协作模式（重要，请先读这里）

**轮动机制**：两个协作方不再按章节静态划分，而是按工序轮动：

1. **协同方（源码分析侧）**：深入阅读指定源码文件，在文件里写注释或产出 `architecture-notes/` 笔记，说明该模块的结构、关键函数、边界情况、设计意图。
2. **AI 写作侧（本机）**：依据协同方产出的注释和笔记，结合 `requirements.md` 的写作要求，完成对应章节的写作或完善。
3. **循环**：写完一章后，协同方继续分析下一章所需的源码，AI 写作侧等注释就绪后再写。

这个模式的好处：写作侧不需要猜测源码细节，分析侧不需要操心文字风格，各做各擅长的事。

---

## 当前进度快照（截至 2026-04-01）

已完成并推送：

| 范围 | 状态 |
|------|------|
| ch01–ch08（Part I + Part II） | 已定稿推送 |
| ch09–ch12（Part III） | 已定稿推送 |
| `architecture-notes/`（9 个笔记） | 已完成 |
| `chapter-evidence-map.md`（ch03–ch12） | 已完成 |
| 配套模板（prompt/workflow/role/example） | 已完成 |

---

## 下一轮工作：Part IV（ch13–ch18）

### 协同方需要分析的源码

Part IV 是"动手造一个缩小版"，需要的源码覆盖面比 Part III 更广。建议按章节顺序逐章分析：

| 章节 | 章节主题 | 需要分析的源码 | 产出形式 |
|------|----------|----------------|----------|
| ch13 | 最小可用 Agent 骨架 | `src/entrypoints/`、`src/main.tsx`、`src/QueryEngine.ts` 的最小路径 | `architecture-notes/minimal-agent-skeleton.md` |
| ch14 | 工具作为手脚 | `src/Tool.ts`、`src/tools.ts`、`src/tools/` 目录下典型工具 | `architecture-notes/tool-system-detail.md` |
| ch15 | 提示词与任务指令 | `src/services/SystemPrompt/`、`src/commands.ts` | `architecture-notes/prompt-and-directive.md` |
| ch16 | 状态与上下文 | `src/services/SessionManager/`、`src/services/SessionMemory/` | `architecture-notes/state-and-context.md` |
| ch17 | 任务推进与运行时结构 | `src/query.ts`（状态机部分）、`src/services/TaskManager/` | `architecture-notes/runtime-structure.md` |
| ch18 | 恢复是玩具和真实系统的分水岭 | `src/utils/conversationRecovery.ts`（完整版）、`src/services/compact/` | `architecture-notes/recovery-deep-dive.md` |

### 笔记格式建议

每个 `architecture-notes/` 笔记文件建议包含：

- **模块职责**：这个模块/文件是干什么的，一句话
- **关键函数/类**：列出 3–5 个最重要的函数或类，说明各自的作用
- **数据流**：输入是什么，输出是什么，中间经过哪些步骤
- **边界情况**：有哪些特殊情况需要处理，代码里怎么处理的
- **设计意图**：为什么这样设计，有没有明显的取舍
- **源码锚点**：关键行号或函数名，方便写作侧引用

---

## AI 写作侧的工作方式

收到协同方的笔记后，写作侧按以下步骤完成章节：

1. 读 `requirements.md` 确认写作标准
2. 读对应的 `architecture-notes/` 笔记
3. 读 `book-outline-v1.md` 确认章节定位
4. 写章节，控制在 600–900 字，散文风格，不用大量列表
5. 写完后更新 `chapter-evidence-map.md`
6. 提交推送，通知协同方可以开始下一章的源码分析

---

## 冲突预防规则

1. 协同方只写 `architecture-notes/` 笔记，不直接写章节文件。
2. AI 写作侧只写章节文件，不修改已有的 `architecture-notes/` 笔记。
3. `chapter-evidence-map.md` 由 AI 写作侧维护，协同方如有补充请在笔记里注明，写作侧整合。
4. 每次推送前先 `git pull`，确认没有远程新提交再推。
5. 提交信息格式：`docs(book): <简短说明>`。

---

## 接口约定（写作风格）

- 每章开头用一句话给出结论，不用"本章将……"这类预告式开头
- 正文用散文，不用大量粗体 + 冒号的列表结构
- 源码引用格式：`` `src/xxx.ts` ``，不要只写文件名
- 推断性结论要标注"可以做一个保守推断"，不要写成已证实事实
- 章节长度控制在 600–900 字

---

## 待确认问题

1. Part V（ch19–ch22）的源码分析由谁负责？Part V 偏实战，可能不需要深入源码，更多是设计层面的讨论。
2. `example-business-agent.md` 是否需要配套可运行代码？如果需要，放在 `src/examples/` 还是 `docs/book/examples/`？

---

*协同方可直接在此文件末尾追加回复，或修改上方的分工表。*
