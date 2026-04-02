# 如何基于源码仓库构建一个在线解读博客

> 这篇文章沉淀自 `claude-code-source` 项目的博客搭建实践，从零到 GitHub Pages 部署，含踩坑记录和设计决策。

---

## 一、目标定位

这个博客不是独立产品，而是书稿的在线版本。

核心需求：
- 章节内容与书稿同源（`docs/book/chapters/`），不维护两份
- 支持源码锚点：读者点击可以跳转到对应源码位置
- 部署简单：push 到 main 分支自动发布
- 不依赖复杂构建工具：纯静态，无 Node.js 构建步骤

---

## 二、技术选型

**最终方案**：纯静态 HTML + Vanilla JS + GitHub Pages

**为什么不用 VitePress / Docusaurus / Hexo**：

这些工具都很好，但对这个项目来说有一个关键问题：它们需要把整个 `node_modules` 或构建产物纳入 CI，或者需要在 CI 里跑 `npm install`。

对于一个以"源码分析"为主题的仓库，引入一个复杂的前端构建链会让仓库本身变得难以理解。纯静态方案的好处是：任何人打开 `blog/` 目录都能立刻看懂它在做什么。

**Markdown 渲染**：`marked.js`（CDN 引入，无需安装）

**代码高亮**：`highlight.js`（CDN 引入，强制 dark 主题）

**Mermaid 图表**：`mermaid.js`（CDN 引入）

---

## 三、目录结构

```
blog/
├── index.html          # 单页应用入口
├── app.js              # 核心逻辑（章节加载、路由、渲染）
├── style.css           # 基础样式
├── style-a.css         # 主题 A（暗色）
├── style-b.css         # 主题 B（暖纸质感）
├── style-c.css         # 主题 C（简洁白）
├── build.sh            # 构建脚本（复制章节文件）
├── dev.sh              # 本地开发脚本
├── deploy.sh           # 手动部署脚本（已废弃，改用 CI）
├── _config.yml         # GitHub Pages 配置
├── .nojekyll           # 禁用 Jekyll 处理
└── chapters/           # 章节文件（由 build.sh 生成，不入 git）
```

**关键设计**：`blog/chapters/` 是构建产物，不入 git。章节内容的唯一来源是 `docs/book/chapters/`，通过 `build.sh` 复制过来。

---

## 四、构建与部署流程

### 本地开发

```bash
bash blog/build.sh   # 复制章节文件
bash blog/dev.sh     # 启动本地服务器
```

`build.sh` 的核心逻辑极简：

```bash
for f in "$SRC_DIR"/*.md; do
  cp "$f" "$DEST_DIR/"
done
```

### CI 自动部署

`.github/workflows/deploy-blog.yml`：

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:  # 支持手动触发

jobs:
  build-and-deploy:
    steps:
      - uses: actions/checkout@v4
      - name: Build — copy chapters into blog/
        run: |
          mkdir -p blog/chapters
          cp docs/book/chapters/*.md blog/chapters/
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: blog/
      - uses: actions/deploy-pages@v4
```

**踩坑记录**：最初在 `on.push` 里加了 `paths: ['docs/book/**', 'blog/**']` 过滤，结果发现某些只改了 `docs/` 的提交没有触发部署。后来移除了 `paths` 过滤，改为每次 push 都触发，确保不遗漏。

---

## 五、源码锚点功能

这是这个博客最有特色的功能：章节正文里的代码引用可以点击展开内联预览面板，直接看到对应的源码片段。

### 实现思路

Markdown 里用特殊格式标记源码锚点：

```markdown
`QueryEngine.ts#L244-L271`
```

`app.js` 在渲染时识别这个格式，把它转换成可点击的链接。点击后：
1. 向 GitHub Raw 接口请求对应文件
2. 截取指定行号范围
3. 在段落下方展开内联代码面板（含 shimmer loading 动效）
4. 面板右上角提供"在 GitHub 查看"入口

### 演进过程

这个功能经历了三个版本：
1. **v1**：直接跳转到 GitHub 页面（最简单，但打断阅读流）
2. **v2**：点击展开内联代码预览面板（当前方案）
3. **v3**：改为 hover 展开面板（减少误触，含 shimmer loading）

最终选择 hover 展开，原因是：源码锚点在章节里出现频率很高，如果每次都需要点击，阅读体验会被打断。hover 展开让读者可以快速扫一眼源码，不需要离开当前阅读位置。

---

## 六、主题设计

博客提供三套主题，通过 CSS 文件切换：

- **主题 A**（暗色）：适合深夜阅读
- **主题 B**（暖纸质感）：默认主题，模拟纸质书阅读感
- **主题 C**（简洁白）：适合白天阅读

主题 B 的设计原则：用暖色调（米黄底色 + 深棕文字）模拟纸质书质感，减少屏幕阅读疲劳。字体选择衬线体，增强阅读连贯性。

---

## 七、其他 UI 细节

**章节切换骨架屏**：切换章节时显示 shimmer 动效，避免内容加载时的白屏闪烁。

**阅读进度条**：页面顶部显示当前章节阅读进度，帮助读者定位。

**代码行号**：代码块自动添加行号，与源码锚点的行号引用对应。

**Star 按钮**：右上角显示 GitHub Star 数，方便读者关注仓库。

**欢迎页**：首次访问显示欢迎页，介绍书的定位和阅读建议。

---

## 八、踩坑汇总

### 坑 1：`blog/chapters/` 入了 git

最初把 `blog/chapters/` 的内容也提交到了 git，导致每次更新章节都需要提交两次（一次改 `docs/book/chapters/`，一次改 `blog/chapters/`）。

修正：在 `.gitignore` 里排除 `blog/chapters/`，改为 CI 构建时动态生成。

### 坑 2：GitHub Pages 默认启用 Jekyll

GitHub Pages 默认会用 Jekyll 处理仓库内容，会把 `_` 开头的文件夹过滤掉。

修正：在 `blog/` 目录下添加 `.nojekyll` 文件，禁用 Jekyll 处理。

### 坑 3：代码高亮颜色在暗色主题下不对

`highlight.js` 默认使用亮色主题，在暗色背景下颜色对比度很差。

修正：强制引入 `highlight.js` 的 dark token 配色方案，覆盖默认样式。

### 坑 4：Mermaid 图表在某些章节不渲染

Mermaid 需要在 DOM 渲染完成后才能初始化，但章节内容是异步加载的。

修正：在章节内容加载完成后，手动调用 `mermaid.init()` 重新初始化。

### 坑 5：手动部署脚本维护成本高

最初用 `deploy.sh` 手动部署，需要记得在每次更新后手动执行。

修正：改用 GitHub Actions，push 到 main 分支自动触发部署，彻底消除手动步骤。

---

## 九、这套方案的适用边界

**适合**：
- 内容以 Markdown 为主，不需要复杂交互
- 希望部署简单，不想维护复杂构建链
- 仓库本身就是内容来源，不需要单独维护博客内容

**不适合**：
- 需要搜索功能（纯静态方案搜索很难做好）
- 需要评论系统（需要额外集成）
- 内容更新非常频繁（每次 push 都触发 CI 有一定延迟）

---

*本文基于 `blog/` 目录的实际代码和提交记录整理，含真实踩坑经验。*
