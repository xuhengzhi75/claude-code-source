# Project Status

更新时间：2026-04-01

## 当前阶段
本项目已从“recovered source 初步梳理”进入“书稿体系化推进 + 协作写作 + 工程化整理”阶段。

## 当前完成情况

### 1. 源码与架构拆解
已完成核心主干模块的持续分析：
- 入口与运行模式分流
- 能力装配（commands / tools / Tool contract）
- QueryEngine 会话编排
- QueryLoop 运行时状态机
- 任务系统与长任务
- 恢复与连续性
- 状态与上下文
- 工具系统细节
- 提示词设计模式

### 2. 书稿章节
当前已推进到：
- `ch01 ~ ch19`

其中：
- Part I / Part II 已多轮收口
- Part III 已进入章节化输出
- Part IV 已有多篇底稿与章节推进
- Part V 仍属后续待系统化展开部分

### 3. 架构笔记资产
位于：`docs/book/architecture-notes/`

已形成：
- 导读型笔记
- 证据型笔记
- 判断型笔记
- 面向后续章节的交接型底稿

### 4. 证据与协作资产
已建立：
- `chapter-evidence-map.md`
- `analysis-handoff-template.md`
- `collab-split.md`
- `writing-principles.md`

### 5. 工程辅助
已建立：
- `scripts/check-anchors.sh`
- README 架构图与仓库使用说明
- 核心源码中文注释的持续补充机制

## 当前协作模式
- 源码分析侧：负责源码阅读、中文注释、architecture-notes、写作提示
- 写作侧：负责章节正文、风格收口、evidence map 整合
- 双方遵循：先 pull、完成一点就 push、小步轮动、不重复作业

## 当前最值得推进的事项
1. 补工程化总控文档（状态/方法/索引/交接清单）
2. 继续补核心源码中文注释
3. 让写作侧根据已完成解读清单继续起草后续章节
4. 逐步把 notes 从“导读感”收口到“证据化交接卡”

## 当前风险与短板
1. `architecture-notes/` 体裁仍不够统一
2. 部分章节与 notes 的索引关系还不够显式
3. 章节状态（draft / reviewed / evidence-checked）尚未统一标记
4. Part V 业务落地章节仍缺更强证据链与系统化规划

## 明日优先级（摘要）
- P0：`WORKING-METHOD.md`
- P0：`architecture-notes/README.md`
- P0：`completed-coverage-and-writing-queue.md`
- P1：`figures-index.md`
- P1：`code-annotation-roadmap.md`
- P1：继续补核心源码中文注释
