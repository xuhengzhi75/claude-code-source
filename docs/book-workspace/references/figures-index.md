# 图示索引（Figures Index）

> 范围：`docs/book/chapters` 目录内现有 Mermaid 图示。
> 统计口径：仅记录代码块标记为 `mermaid` 的图示内容。

## 总览

- 章节覆盖：5（ch03 / ch07 / ch08 / ch16 / ch19）
- 图示总数：7
- 图示类型分布：`flowchart` × 5，`stateDiagram-v2` × 1，`mindmap` × 1
- 当前状态：均已落地（章节正文中可见）

---

## ch03-从入口到执行.md

| 图名 | Mermaid 类型 | 用途 | 状态 |
|---|---|---|---|
| 路由树结构（`main()` 分支总览） | flowchart TD | 展示 CLI 从 fast-path 到完整主流程的分流路径与进入 `queryLoop` 的主干关系 | 已存在（正文 3.2） |

## ch07-QueryLoop.md

| 图名 | Mermaid 类型 | 用途 | 状态 |
|---|---|---|---|
| 四条恢复路径完整决策表 | flowchart TD | 说明 query loop 在 API 错误/截断场景下的恢复分支、触发条件与终止路径 | 已存在（正文 7.4） |

## ch08-任务系统.md

| 图名 | Mermaid 类型 | 用途 | 状态 |
|---|---|---|---|
| 任务生命周期总览 | stateDiagram-v2 | 描述任务在 `pending/in_progress/completed/failed` 间的状态迁移与恢复入口 | 已存在（正文 8.0） |
| 多 Agent 协作模式总览 | flowchart LR | 对比 Coordinator、Fork Sub-Agent、DreamTask 三种协作/后台模式与信息流 | 已存在（正文 8.4.0） |

## ch16-状态与上下文.md

| 图名 | Mermaid 类型 | 用途 | 状态 |
|---|---|---|---|
| 状态-上下文-模型输出闭环 | flowchart LR | 解释 `State → Context → Model Output → State` 的迭代反馈关系 | 已存在（章节引言） |
| 上下文三层结构 | flowchart TB | 划分系统上下文、对话历史、记忆文件三层，并标示对模型决策的注入关系 | 已存在（正文 16.4） |

## ch19-提示词工程设计模式.md

| 图名 | Mermaid 类型 | 用途 | 状态 |
|---|---|---|---|
| 提示词工程设计模式汇总 | mindmap | 汇总结构类/约束类/治理类模式，形成章节知识地图 | 已存在（正文 19.12） |

---

## 维护约定

- 新增章节图示时，同步更新本索引（按章节追加）。
- 若图示发生重命名，优先保持“图名与章节小节标题一致”，便于交叉检索。
- 建议状态字段使用：`已存在` / `待补图` / `待重绘` / `已废弃`。
