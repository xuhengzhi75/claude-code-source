# Architecture Notes Index（按需加载版）

## 这是什么
`architecture-notes/` 是“从源码到写作”的中间层资产，不是正文目录。目标是把内容拆成四类可复用材料：
- **导读**：先看主线，不迷路
- **证据**：可对码、可引用
- **判断**：从事实抽象出结论与经验
- **交接**：可直接喂给章节写作的底稿

---

## 先按任务选路径（不要全量通读）

### A. 你要快速建立全局认知（15~30 分钟）
1. `system-overview.md`（系统分层与入口）
2. `execution-flow-guide.md`（主干执行链）
3. `query-engine-and-loop.md`（QueryEngine + queryLoop）

### B. 你在写“可核对事实”段落（需要引用源码）
1. `key-comment-signals.md`（高密度注释证据）
2. `task-recovery-map.md`（任务/恢复关系图）
3. `task-system.md`、`recovery-and-continuity.md`（展开证据面）

### C. 你在做系统级判断/复盘（为什么这样设计）
1. `moat-and-barriers.md`
2. `what-to-learn-from-claude-code.md`
3. 回看 `key-comment-signals.md` 校验边界（避免判断漂移）

### D. 你要把分析交接给写作侧（可直接落章节）
1. `bridge-reading-method.md`（阅读方法与章节桥接）
2. `runtime-structure.md`（运行时结构骨架）
3. `tool-system-detail.md`、`recovery-and-continuity.md`（专题交接）

---

## 分层清单（导读 / 证据 / 判断 / 交接）

| 文件 | 主类型 | 次类型 | 最适合何时打开 |
|---|---|---|---|
| `system-overview.md` | 导读 | 交接 | 第一次看仓库、需要 1 页系统图时 |
| `execution-flow-guide.md` | 导读 | 交接 | 解释“输入后到底怎么跑”时 |
| `query-engine-and-loop.md` | 导读 | 证据 | 进入主循环前的桥接阅读 |
| `task-system.md` | 证据 | 交接 | 任务调度、并发一致性、落盘模型 |
| `task-recovery-map.md` | 证据 | 导读 | 快速解释“中断后怎么续” |
| `key-comment-signals.md` | 证据 | 判断 | 需要可直接引用的源码注释时 |
| `moat-and-barriers.md` | 判断 | 交接 | 做壁垒/竞争力分析时 |
| `what-to-learn-from-claude-code.md` | 判断 | 交接 | 提炼可迁移实践时 |
| `bridge-reading-method.md` | 交接 | 导读 | 规划章节阅读顺序与方法时 |
| `runtime-structure.md` | 交接 | 判断 | 写 Part IV 运行时骨架时 |
| `tool-system-detail.md` | 交接 | 证据 | 写工具系统治理与风险语义时 |
| `recovery-and-continuity.md` | 交接 | 证据 | 写恢复流水线与连续性机制时 |

---

## 最小阅读组合（按产出目标）

- **产出 1：一页非技术总览**
  - `system-overview.md` + `execution-flow-guide.md`
- **产出 2：主循环技术讲解稿**
  - `query-engine-and-loop.md` + `runtime-structure.md`
- **产出 3：恢复能力专题**
  - `task-recovery-map.md` + `recovery-and-continuity.md` + `key-comment-signals.md`
- **产出 4：业务借鉴/战略判断**
  - `moat-and-barriers.md` + `what-to-learn-from-claude-code.md` + `key-comment-signals.md`

---

## 使用约定（保证可维护）

新增或改造 note 时，建议在文首补齐四行元信息：
- `定位`：导读 / 证据 / 判断 / 交接（至少一个）
- `覆盖`：本篇明确覆盖什么
- `不覆盖`：刻意不展开什么
- `证据边界`：哪些是 verified，哪些是 inference

这样可以保持按需加载，不回退到“全部都像综述”的状态。