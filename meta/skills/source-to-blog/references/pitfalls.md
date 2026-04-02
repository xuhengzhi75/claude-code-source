# 踩坑规避

## 坑 1：blog/chapters/ 入了 git

**症状**：每次更新章节都需要提交两次（一次改 `docs/book/chapters/`，一次改 `blog/chapters/`）。

**原因**：没有在 `.gitignore` 里排除 `blog/chapters/`。

**修正**：
```
# .gitignore
blog/chapters/
```

---

## 坑 2：GitHub Pages 默认启用 Jekyll

**症状**：`_` 开头的文件夹（如 `_config.yml` 里引用的路径）被 GitHub Pages 过滤掉，导致 404。

**原因**：GitHub Pages 默认用 Jekyll 处理仓库内容，Jekyll 会过滤 `_` 开头的文件夹。

**修正**：在 `blog/` 目录下添加 `.nojekyll` 文件：
```bash
touch blog/.nojekyll
```

---

## 坑 3：代码高亮颜色在暗色主题下不对

**症状**：代码块在暗色背景下颜色对比度很差，几乎看不清。

**原因**：`highlight.js` 默认使用亮色主题。

**修正**：强制引入 dark 配色方案：
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
```

如果需要在亮色主题下也有好的效果，可以根据当前主题动态切换 highlight.js 的样式表。

---

## 坑 4：Mermaid 图表在章节切换后不渲染

**症状**：第一次加载章节时 Mermaid 图表正常，切换章节后图表不渲染。

**原因**：Mermaid 需要在 DOM 渲染完成后才能初始化，但章节内容是异步加载的，Mermaid 的初始化只在页面加载时执行一次。

**修正**：在章节内容加载完成后，手动重新初始化 Mermaid：
```javascript
async function loadChapter(chapterFile) {
  const response = await fetch(`./chapters/${chapterFile}`);
  const markdown = await response.text();
  document.getElementById('content').innerHTML = marked.parse(markdown);
  
  // 重新初始化 Mermaid
  if (window.mermaid) {
    mermaid.init(undefined, document.querySelectorAll('.language-mermaid'));
  }
  
  // 重新初始化代码高亮
  document.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block);
  });
}
```

---

## 坑 5：on.push 加了 paths 过滤导致部署遗漏

**症状**：某些只改了 `docs/` 的提交没有触发博客部署，导致博客内容落后于书稿。

**原因**：在 GitHub Actions 的 `on.push` 里加了 `paths` 过滤：
```yaml
on:
  push:
    branches: [main]
    paths:
      - 'docs/book/**'
      - 'blog/**'
```

当提交只改了 `docs/book-workspace/` 或其他目录时，不会触发部署。

**修正**：移除 `paths` 过滤，改为每次 push 都触发：
```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

---

## 坑 6：手动部署脚本容易遗漏

**症状**：书稿更新了，但博客没有更新，读者看到的是旧版本。

**原因**：依赖手动执行 `deploy.sh`，容易忘记。

**修正**：改用 GitHub Actions 自动部署，push 到 main 分支自动触发，彻底消除手动步骤。

---

## 坑 7：源码锚点请求 GitHub Raw 被限速

**症状**：频繁点击源码锚点时，GitHub Raw 接口返回 429 Too Many Requests。

**原因**：GitHub Raw 接口有请求频率限制。

**修正**：
1. 对已请求的文件内容做内存缓存，同一文件只请求一次
2. 展示时加 shimmer loading 动效，避免用户感知到延迟
3. 提供"在 GitHub 查看"的备用入口

---

## 坑 8：章节文件名含中文导致路径问题

**症状**：某些章节文件无法加载，控制台报 404 错误。

**原因**：文件名含中文字符，在某些环境下 URL 编码不一致。

**修正**：在 `app.js` 里对文件名做 `encodeURIComponent` 处理：
```javascript
const url = `./chapters/${encodeURIComponent(chapterFile)}`;
```

---

## 坑 9：把"看起来像 bug"的设计写成了 bug

**症状**：博客文章里描述某个字段"永远是 null"或"总是返回空字符串"，读者评论说"这是不是 bug？"，实际上是有意为之的设计。

**原因**：源码里有些反直觉的行为是刻意设计的，但如果不加说明，读者会误以为是缺陷。

**典型案例**：Claude Code 的 `stop_reason` 在流式路径下落盘时永远是 `null`。原因是消息在 `content_block_stop` 事件时落盘，而 `stop_reason` 在后续的 `message_delta` 事件里才到达。这不是 bug，而是流式协议的时序决定的——代码里专门用 `tool_use` 块的存在来判断是否需要继续，而不是依赖 `stop_reason`。

**修正**：写博客时，对这类"看起来像 bug"的设计，必须加一段"为什么这样设计"的解释，并标注 `verified`（有源码锚点）。格式建议：

```markdown
> **注意**：这里的 `stop_reason` 在流式路径下落盘时永远是 `null`，这不是 bug。
> 原因是消息在 `content_block_stop` 时落盘，`stop_reason` 在后续的 `message_delta` 才到达。
> 代码里用 `tool_use` 块的存在来判断是否继续，而不是依赖 `stop_reason`。
> （verified：`src/utils/conversationRecovery.ts` L300-L306）
```

**识别方法**：挖掘任务卡填写时，如果发现某个值"永远是 X"或"总是返回空"，先搜索注释里有没有解释，再搜索有没有专门绕过这个值的判断逻辑。有绕过逻辑的，通常是有意为之。
