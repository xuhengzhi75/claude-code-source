# 功能实现参考

## 功能 1：源码锚点（核心特色功能）

### 设计目标

章节正文里的代码引用可以点击/hover 展开内联预览面板，直接看到对应的源码片段，不需要离开当前阅读位置。

### Markdown 格式约定

在章节 Markdown 里用反引号标记源码锚点：

```markdown
`QueryEngine.ts#L244-L271`
```

格式：`` `文件名#L起始行-结束行` ``

### 实现思路

```javascript
// 在渲染 Markdown 后，识别源码锚点格式
function processSourceAnchors(container) {
  const codeElements = container.querySelectorAll('code');
  codeElements.forEach(el => {
    const text = el.textContent;
    // 匹配 文件名#L行号 或 文件名#L行号-行号 格式
    const match = text.match(/^(.+\.(?:ts|js|tsx|jsx|py|go|rs))#L(\d+)(?:-(\d+))?$/);
    if (!match) return;
    
    const [, filename, startLine, endLine] = match;
    el.classList.add('source-anchor');
    el.dataset.file = filename;
    el.dataset.start = startLine;
    el.dataset.end = endLine || startLine;
    
    // 添加 hover 事件
    el.addEventListener('mouseenter', () => showSourcePreview(el));
    el.addEventListener('mouseleave', () => hideSourcePreview(el));
  });
}

async function showSourcePreview(anchorEl) {
  const { file, start, end } = anchorEl.dataset;
  
  // 显示 shimmer loading
  const preview = createPreviewPanel(anchorEl);
  preview.innerHTML = '<div class="shimmer"></div>';
  
  // 请求源码（带缓存）
  const content = await fetchSourceFile(file);
  const lines = content.split('\n');
  const startIdx = parseInt(start) - 1;
  const endIdx = parseInt(end);
  const snippet = lines.slice(startIdx, endIdx).join('\n');
  
  // 渲染代码片段
  preview.innerHTML = `
    <div class="preview-header">
      <span>${file}#L${start}-${end}</span>
      <a href="https://github.com/[owner]/[repo]/blob/main/src/${file}#L${start}-L${end}" 
         target="_blank">在 GitHub 查看 →</a>
    </div>
    <pre><code class="language-typescript">${escapeHtml(snippet)}</code></pre>
  `;
  hljs.highlightElement(preview.querySelector('code'));
}

// 文件内容缓存
const fileCache = new Map();
async function fetchSourceFile(filename) {
  if (fileCache.has(filename)) return fileCache.get(filename);
  
  const url = `https://raw.githubusercontent.com/[owner]/[repo]/main/src/${filename}`;
  const response = await fetch(url);
  const content = await response.text();
  fileCache.set(filename, content);
  return content;
}
```

### 演进建议

1. **v1（最简）**：直接跳转到 GitHub 页面
2. **v2（推荐）**：点击展开内联代码预览面板
3. **v3（进阶）**：hover 展开面板（减少误触）

---

## 功能 2：章节切换骨架屏

### 设计目标

切换章节时显示 shimmer 动效，避免内容加载时的白屏闪烁。

### 实现

```css
.shimmer {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,0.2) 50%,
    rgba(255,255,255,0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

```javascript
async function loadChapter(file) {
  // 显示骨架屏
  contentEl.innerHTML = `
    <div class="skeleton">
      <div class="shimmer" style="height: 2em; width: 60%; margin-bottom: 1em;"></div>
      <div class="shimmer" style="height: 1em; width: 100%; margin-bottom: 0.5em;"></div>
      <div class="shimmer" style="height: 1em; width: 90%; margin-bottom: 0.5em;"></div>
      <div class="shimmer" style="height: 1em; width: 95%;"></div>
    </div>
  `;
  
  // 加载内容
  const markdown = await fetchChapter(file);
  contentEl.innerHTML = marked.parse(markdown);
  
  // 后处理
  processSourceAnchors(contentEl);
  initMermaid();
  highlightCode();
}
```

---

## 功能 3：阅读进度条

### 实现

```javascript
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = (scrollTop / docHeight) * 100;
  document.getElementById('progress-bar').style.width = `${progress}%`;
});
```

```css
#progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: #4a9eff;
  transition: width 0.1s;
  z-index: 1000;
}
```

---

## 功能 4：多主题切换

### 实现

```javascript
const themes = {
  dark: 'style-a.css',
  warm: 'style-b.css',
  light: 'style-c.css'
};

function switchTheme(themeName) {
  const link = document.getElementById('theme-link');
  link.href = themes[themeName];
  localStorage.setItem('theme', themeName);
}

// 初始化时恢复上次选择的主题
const savedTheme = localStorage.getItem('theme') || 'warm';
switchTheme(savedTheme);
```

---

## 功能 5：代码行号

### 实现

在 highlight.js 渲染后，为每个代码块添加行号：

```javascript
function addLineNumbers(container) {
  container.querySelectorAll('pre code').forEach(block => {
    const lines = block.innerHTML.split('\n');
    const numbered = lines.map((line, i) => 
      `<span class="line-number">${i + 1}</span>${line}`
    ).join('\n');
    block.innerHTML = numbered;
  });
}
```

```css
.line-number {
  display: inline-block;
  width: 2.5em;
  color: #666;
  text-align: right;
  margin-right: 1em;
  user-select: none;
}
```
