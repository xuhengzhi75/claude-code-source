# 技术选型参考

## 推荐方案：纯静态 HTML + Vanilla JS

**适合**：内容以 Markdown 为主，不需要复杂交互，希望部署简单。

**核心依赖（全部 CDN 引入，无需安装）**：

| 功能 | 库 | CDN |
|------|-----|-----|
| Markdown 渲染 | marked.js | `https://cdn.jsdelivr.net/npm/marked/marked.min.js` |
| 代码高亮 | highlight.js | `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js` |
| 代码高亮样式（暗色） | highlight.js | `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css` |
| Mermaid 图表 | mermaid.js | `https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js` |

**为什么不用 VitePress / Docusaurus / Hexo**：

这些工具都很好，但对"源码分析书"这类项目有一个关键问题：它们需要把整个 `node_modules` 或构建产物纳入 CI，或者需要在 CI 里跑 `npm install`。

对于一个以"源码分析"为主题的仓库，引入复杂的前端构建链会让仓库本身变得难以理解。纯静态方案的好处是：任何人打开 `blog/` 目录都能立刻看懂它在做什么。

---

## 部署方案：GitHub Pages + GitHub Actions

**为什么不用手动部署脚本**：

手动部署需要记得在每次更新后手动执行，容易遗漏。GitHub Actions 的好处是：push 到 main 分支自动触发，彻底消除手动步骤。

**关键配置**：

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

这三个权限是 GitHub Pages 部署必须的。

---

## 主题方案

推荐提供多套主题，通过 CSS 文件切换：

- **暗色主题**：适合深夜阅读，背景 `#1a1a2e`，文字 `#e0e0e0`
- **暖纸质感主题**（推荐默认）：背景 `#faf6f0`，文字 `#3d2b1f`，模拟纸质书阅读感
- **简洁白主题**：背景 `#ffffff`，文字 `#333333`，适合白天阅读

主题切换通过 `<link>` 标签的 `href` 属性动态切换，不需要重新加载页面。

---

## 字体方案

**暖纸质感主题推荐**：
- 正文：`Georgia, 'Times New Roman', serif`（衬线体，增强阅读连贯性）
- 代码：`'JetBrains Mono', 'Fira Code', monospace`

**简洁白主题推荐**：
- 正文：`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- 代码：`'JetBrains Mono', 'Fira Code', monospace`
