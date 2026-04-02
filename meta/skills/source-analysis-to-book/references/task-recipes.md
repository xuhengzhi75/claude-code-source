# 任务配方

## 配方 1：首次接触新仓库

1. 找入口和顶层执行流（CLI / daemon / HTTP / agent runtime）
2. 定位状态载体、恢复逻辑和工具边界
3. 在写章节之前，先产出 3-5 份架构笔记
4. 在长篇写作之前，先建立章节证据地图
5. 在结束会话之前，创建状态和交接材料

**产出检查**：
- [ ] `architecture-notes/system-overview.md` 已创建
- [ ] `references/chapter-evidence-map.md` 已创建
- [ ] `planning/project-status.md` 已更新

---

## 配方 2：中断后恢复

1. 读 `planning/project-status.md`
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
2. 章节内容从 `docs/book/chapters/` 复制，不维护两份
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

**真实案例**：`src/query.ts` 里的 `hasAttemptedReactiveCompact`，注释原文："Resetting to false here caused an infinite loop: compact → still too long → error → stop hook blocking → compact → … burning thousands of API calls." 这一句话比任何架构说明都更能让读者理解为什么这个 flag 必须存在。

**CI 配置模板**（`.github/workflows/deploy-blog.yml`）:
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
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: blog/
      - uses: actions/deploy-pages@v4
```
