# 任务配方

## 配方 1：首次接触新仓库

1. 找入口和顶层执行流（CLI / daemon / HTTP / agent runtime）
2. 定位状态载体、恢复逻辑和工具边界
3. 在写章节之前，先产出 3-5 份架构笔记
4. 在长篇写作之前，先建立章节证据地图
5. 在结束会话之前，创建状态和交接材料

**产出检查**（路径相对于工作区根目录）：
- [ ] `architecture-notes/system-overview.md` 已创建
- [ ] `references/chapter-evidence-map.md` 已创建
- [ ] `planning/project-status.md` 已更新

---

## 配方 2：中断后恢复

1. 读 `planning/project-status.md`（路径相对于工作区根目录）
2. 读 `status/status-index.md` 和最近一条 `status-*.md`
3. 读 `references/chapter-evidence-map.md`
4. 继续优先级最高的未完成写作或分析项

**不要**：重新读整个仓库，重新做已经做过的分析。

---

## 配方 3：把证据转化为章节结构

1. 从一个非显然的章节问题出发
2. 从证据笔记里拉 verified facts
3. 分开写机制、约束和效果
4. 加入边界情况和一个非显然结论
5. 检查草稿是否退化成了模块目录

**检查问题**：
- 这章的核心主张是什么？能被反驳吗？
- 有没有至少一个"不看这篇就不会注意到"的发现？
- 每个关键结论都有源码锚点吗？

---

## 配方 4：深读一个模块

1. 找这个模块在控制权转移链中的位置
2. 找上下游依赖
3. 找继续/终止/恢复条件
4. 找边界 case 和异常路径
5. 回答：为什么这个模块不能被轻易删掉？

**产出格式**：
```markdown
## 模块：[模块名]

### verified facts
- [事实 1]：`文件路径#L行号`
- [事实 2]：`文件路径#L行号`

### inference
- [推断 1]（基于 [证据]）
- [推断 2]（基于 [证据]）

### edge cases
- [边界情况 1]
- [边界情况 2]

### design tradeoffs
- [取舍 1]：选择了 A 而不是 B，原因是 [...]

### why it matters
- [为什么这个模块重要]
```

---

## 配方 5：章节质量自检

写完一章后，按这个顺序检查：

1. **核心主张测试**：能不能用一句话说出这章的核心主张？这个主张能不能被反驳？
2. **信息增量测试**：读者如果只看架构笔记，能不能得到这章的全部内容？如果能，这章没有信息增量。
3. **锚点精确性测试**：每个关键结论是否有精确的源码锚点（文件名 + 函数名，最好有行号）？
4. **机制完整性测试**：对于每个"是什么"，是否解释了"为什么这样，不这样会怎样"？
5. **反直觉发现测试**：这章有没有至少一个"如果不看这篇，读者不会注意到"的发现？
6. **删减测试**：把这章的 20%-30% 删掉，读者的理解会不会受损？如果不会，说明有冗余。

---

## 配方 6：建立博客

1. 在 `blog/` 目录创建纯静态 HTML + Vanilla JS 博客
2. 章节内容从书稿目录（推荐 `docs/book/chapters/`）复制，不维护两份
3. 在 `.gitignore` 里排除 `blog/chapters/`（构建产物不入 git）
4. 添加 `.nojekyll` 文件禁用 GitHub Pages 的 Jekyll 处理
5. 配置 GitHub Actions 自动部署（push 到 main 分支触发）
6. 实现源码锚点功能（点击/hover 展开内联代码预览）

---

## 配方 7：从 bug 修复历史反推设计决策

这是最有价值但最容易被跳过的挖掘模式。代码注释里的 bug 描述，比架构文档更能说明"为什么非这样设计不可"。

**识别信号**：
- 注释里出现 `caused an infinite loop`、`burning thousands of API calls`、`fixed a bug`、`prevent a spiral` 等字样
- 一个 flag 或字段的注释里有"如果不加这个会怎样"的描述
- 函数名里有 `recover`、`fallback`、`guard`、`prevent` 等词

**挖掘步骤**：
1. 找到 flag/字段，搜索它的所有使用位置（不只是定义处）
2. 对每个使用位置，读懂它在什么条件下被设为 true/false，以及为什么
3. 找到"保持原值不重置"的位置——这通常是最反直觉、最有价值的地方
4. 把 bug 场景还原成一句话：`[触发条件] → [错误行为] → [后果]`

**产出格式**：
```markdown
### [flag/字段名]

**bug 场景**：[触发条件] → [错误行为] → [后果]（如有注释原文，直接引用）

**所有使用位置**：
| 行号 | 操作 | 防护场景 |
|------|------|---------|
| L### | 初始化为 false | ... |
| L### | 设为 true | ... |
| L### | 保持原值（不重置） | ← 最反直觉的位置，重点解释 |
| L### | 重置为 false | ... |

**verified** — 源码锚点：`文件路径` L###
```

**示例**（来自 Claude Code 仓库，替换为你自己仓库的案例）：`src/query.ts` 里的 `hasAttemptedReactiveCompact`，注释原文："Resetting to false here caused an infinite loop: compact → still too long → error → stop hook blocking → compact → … burning thousands of API calls." 这一句话比任何架构说明都更能让读者理解为什么这个 flag 必须存在。

---

## 配方 8：多 Agent 协作时的角色分工

多 Agent 协作时，按以下五个角色分工，每个 Agent 实例只承担一个角色：

**架构侦察员（Architecture Scout）**：快速阅读仓库结构、关键源码与已有文档，输出系统分层、主链路和证据锚点。产出：architecture notes、evidence map、核心文件导航。

**章节工程师（Chapter Builder）**：把架构笔记改写成面向弱技术读者的章节草稿。产出：章节初稿、本章小结、读者导向解释。

**证据审校员（Evidence Reviewer）**：核对章节中的关键判断是否有源码依据，并标记 verified / inference / unsupported。产出：证据校对清单、风险点清单。

**风格编辑（Style Editor）**：统一语气、压缩废话、降低 AI 味、统一术语。产出：精修章节、术语统一建议、重复内容清单。

**业务 Agent 设计师（Business Agent Designer）**：把 Claude-Code-like 架构缩小为一个可落地的业务 Agent 方案。产出：最小模块图、任务流、工具接口、恢复策略、迭代计划。

**使用原则**：角色之间通过 inbox 文件传递产出，不在同一个 Agent 实例里混用多个角色。

---

## 配方 9：任务提示词模板

根据任务类型选用对应模板：

**架构拆解型**（让 Agent 输出可核对的架构说明）：
```
请基于当前仓库做一份架构拆解，要求：
1. 先给结论，再给依据。
2. 只引用当前仓库中可见的源码、目录和注释，不引入外部猜测。
3. 明确区分 verified 与 inference。
4. 输出结构包含：系统分层、主执行链、关键模块职责、恢复/状态/任务机制、风险边界。
5. 尽量给出文件路径，方便复核。
```

**章节写作型**（把架构笔记转成可读章节）：
```
请把以下架构笔记改写成面向弱技术读者的章节草稿。
要求：
1. 先讲结论，再展开。
2. 术语第一次出现要有白话解释。
3. 保持平实、客观、少 AI 味。
4. 不要把没有证据的判断写成确定事实。
5. 结尾要有本章小结。
输入材料：
- [在这里贴 architecture notes 摘要]
- [在这里贴对应源码锚点]
```

**证据校对型**（检查章节判断是否有源码锚点支持）：
```
请对下面章节做证据校对。
要求：
1. 抽取每个关键判断。
2. 为每个判断标记：verified / inference / unsupported。
3. 给出对应源码文件路径；如果找不到，请明确写 unsupported。
4. 不要润色正文，只做事实校对。
```

**业务 Agent 设计型**（把架构缩成可执行业务 Agent 方案）：
```
请基于 [目标仓库] 的架构，设计一个缩小版业务 Agent。
约束：
1. 优先保留入口分流、能力装配、主循环、任务状态、最小恢复机制。
2. 不要一开始复制全部复杂度。
3. 输出：模块划分、最小目录结构、工具接口、状态流、失败恢复策略、7天内可落地版本。
4. 明确哪些是必须做，哪些是以后再补。
```

**CI 配置模板**（`.github/workflows/deploy-blog.yml`）：

> 注意：以下路径（`docs/book/chapters/`、`blog/`）是推荐约定，需按你的实际目录结构调整。

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: |
          mkdir -p blog/chapters
          cp docs/book/chapters/*.md blog/chapters/
          # 如果有通俗版，也一并复制：
          # mkdir -p blog/easy-chapters
          # cp docs/book/easy-chapters/*.md blog/easy-chapters/
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: blog/
      - uses: actions/deploy-pages@v4
```
