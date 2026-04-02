/* ===================================================
   Book Blog — app.js
   Pure static site for GitHub Pages
   =================================================== */

// ===== Chapter Manifest =====
const CHAPTERS = [
  { id: 'ch01', file: 'ch01-不只是聊天工具.md',  title: '不只是聊天工具',       num: '第1章' },
  { id: 'ch02', file: 'ch02-为什么强.md',          title: '为什么强',             num: '第2章' },
  { id: 'ch03', file: 'ch03-从入口到执行.md',      title: '从入口到执行',         num: '第3章' },
  { id: 'ch04', file: 'ch04-入口与请求路由.md',    title: '入口与请求路由',       num: '第4章' },
  { id: 'ch05', file: 'ch05-能力装配.md',          title: '能力装配',             num: '第5章' },
  { id: 'ch06', file: 'ch06-QueryEngine.md',       title: 'QueryEngine',          num: '第6章' },
  { id: 'ch07', file: 'ch07-QueryLoop.md',         title: 'QueryLoop',            num: '第7章' },
  { id: 'ch08', file: 'ch08-任务系统.md',          title: '任务系统',             num: '第8章' },
  { id: 'ch09', file: 'ch09-护城河.md',            title: '护城河',               num: '第9章' },
  { id: 'ch10', file: 'ch10-运行时壁垒.md',        title: '运行时壁垒',           num: '第10章' },
  { id: 'ch11', file: 'ch11-为什么干不了真活.md',  title: '为什么干不了真活',     num: '第11章' },
  { id: 'ch12', file: 'ch12-该学什么.md',          title: '该学什么',             num: '第12章' },
  { id: 'ch13', file: 'ch13-最小可用骨架.md',      title: '最小可用骨架',         num: '第13章' },
  { id: 'ch14', file: 'ch14-工具.md',              title: '工具',                 num: '第14章' },
  { id: 'ch15', file: 'ch15-提示词.md',            title: '提示词',               num: '第15章' },
  { id: 'ch16', file: 'ch16-状态与上下文.md',      title: '状态与上下文',         num: '第16章' },
  { id: 'ch17', file: 'ch17-任务推进.md',          title: '任务推进',             num: '第17章' },
  { id: 'ch18', file: 'ch18-恢复机制.md',          title: '恢复机制',             num: '第18章' },
  { id: 'ch19', file: 'ch19-提示词工程设计模式.md', title: '提示词工程设计模式',  num: '第19章' },
];

// Base path for markdown files (relative to index.html)
// build.sh 会将 docs/book/chapters/*.md 复制到 blog/chapters/
const MD_BASE = './chapters/';

// ===== State =====
let currentChapterIndex = -1;

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  buildTOC();
  setupMarked();
  setupMermaid();
  handleRoute();
  window.addEventListener('hashchange', handleRoute);
  initReadProgress();
});

// ===== Theme =====
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  setTheme(saved);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const btn = document.querySelector('.theme-btn');
  if (btn) btn.textContent = theme === 'dark' ? '☀' : '🌙';
  // Sync highlight.js theme
  const hljsLight = document.getElementById('hljs-theme-light');
  const hljsDark  = document.getElementById('hljs-theme-dark');
  if (hljsLight) hljsLight.disabled = (theme === 'dark');
  if (hljsDark)  hljsDark.disabled  = (theme !== 'dark');
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// ===== Build TOC =====
function buildTOC() {
  const toc = document.getElementById('toc');
  toc.innerHTML = '';
  CHAPTERS.forEach((ch, idx) => {
    const a = document.createElement('a');
    a.className = 'toc-item';
    a.href = `#${ch.id}`;
    a.dataset.idx = idx;
    a.innerHTML = `<span class="toc-chapter-num">${ch.num}</span>${ch.title}`;
    a.addEventListener('click', (e) => {
      // On mobile, close sidebar after click
      if (window.innerWidth <= 768) closeSidebar();
    });
    toc.appendChild(a);
  });
}

// ===== Routing =====
function handleRoute() {
  const hash = window.location.hash.replace('#', '');
  if (!hash) {
    showWelcome();
    return;
  }
  const idx = CHAPTERS.findIndex(ch => ch.id === hash);
  if (idx === -1) {
    showWelcome();
    return;
  }
  loadChapter(idx);
}

// ===== Load Chapter =====
async function loadChapter(idx) {
  const ch = CHAPTERS[idx];
  currentChapterIndex = idx;

  // Update active state in TOC — smooth indicator slide
  document.querySelectorAll('.toc-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });

  // Scroll TOC item into view
  const activeItem = document.querySelector('.toc-item.active');
  if (activeItem) {
    activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // Update topbar title
  document.getElementById('topbar-title').textContent = `${ch.num} ${ch.title}`;
  document.title = `${ch.num} ${ch.title} — 深入 Claude Code`;

  // Update footer nav
  updateFooterNav(idx);

  const contentInner = document.getElementById('content-inner');

  // Fade out current content
  contentInner.classList.add('content-leaving');

  // Fetch in parallel with fade-out
  let md = null, fetchErr = null;
  try {
    const resp = await fetch(MD_BASE + ch.file);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    md = await resp.text();
  } catch (err) {
    fetchErr = err;
  }

  // Wait for fade-out to finish (150ms), then swap content
  await new Promise(r => setTimeout(r, 150));

  window.scrollTo({ top: 0, behavior: 'instant' });

  if (fetchErr) {
    contentInner.innerHTML = `
      <div class="error-msg">
        <strong>加载失败</strong><br>
        无法加载章节文件：${ch.file}<br>
        <small>${fetchErr.message}</small>
      </div>`;
  } else {
    renderMarkdown(md, contentInner);
  }

  // Fade in new content
  contentInner.classList.remove('content-leaving');
  contentInner.classList.add('content-entering');
  // Remove entering class after animation completes
  contentInner.addEventListener('animationend', () => {
    contentInner.classList.remove('content-entering');
  }, { once: true });
}

// ===== Render Markdown =====
function setupMarked() {
  const renderer = new marked.Renderer();

  // Code blocks: 行号 + 语言标签 + highlight.js
  renderer.code = function(code, lang) {
    const language = lang || 'plaintext';

    // Mermaid 单独处理
    if (language === 'mermaid') {
      return `<div class="mermaid">${escapeHtml(code)}</div>`;
    }

    let highlighted;
    try {
      if (language !== 'plaintext' && hljs.getLanguage(language)) {
        highlighted = hljs.highlight(code, { language }).value;
      } else {
        highlighted = hljs.highlightAuto(code).value;
      }
    } catch (e) {
      highlighted = escapeHtml(code);
    }

    // 生成行号
    const lines = highlighted.split('\n');
    // 最后一行如果是空行（代码末尾换行）则去掉
    if (lines[lines.length - 1] === '') lines.pop();
    const numbered = lines.map((line, i) =>
      `<span class="code-line"><span class="line-num">${i + 1}</span><span class="line-content">${line || ' '}</span></span>`
    ).join('\n');

    const langLabel = language !== 'plaintext'
      ? `<span class="code-lang-label">${escapeHtml(language)}</span>`
      : '';
    return `<pre class="code-block">${langLabel}<code class="hljs language-${escapeHtml(language)}">${numbered}</code></pre>`;
  };

  // 行内代码：检测源码锚点格式 `file.ts#L76`
  renderer.codespan = function(code) {
    // 匹配 filename.ext#L数字 格式
    const anchorMatch = code.match(/^([\w./-]+\.(?:ts|js|tsx|jsx|py|go|rs|java|md))#(L\d+(?:-L\d+)?)$/);
    if (anchorMatch) {
      const [, file, lineRef] = anchorMatch;
      const lineNum = parseInt(lineRef.replace('L', ''));
      return `<code class="code-anchor" data-file="${escapeHtml(file)}" data-line="${lineNum}">${escapeHtml(code)}</code>`;
    }
    return `<code>${code}</code>`;
  };

  marked.setOptions({ renderer, breaks: false, gfm: true });
}

function setupMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  });
}

function renderMarkdown(md, container) {
  const html = marked.parse(md);
  container.innerHTML = `<div class="md-body">${html}</div>`;

  // Mermaid
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default', securityLevel: 'loose' });
  const mermaidEls = container.querySelectorAll('.mermaid');
  if (mermaidEls.length > 0) {
    mermaid.run({ nodes: mermaidEls }).catch(err => console.warn('Mermaid render error:', err));
  }

  // 源码锚点 hover tooltip
  setupAnchorTooltips(container);
}

// ===== Welcome =====
function showWelcome() {
  currentChapterIndex = -1;
  document.querySelectorAll('.toc-item').forEach(el => el.classList.remove('active'));
  document.getElementById('topbar-title').textContent = '深入 Claude Code';
  document.title = '深入 Claude Code：架构解析';
  const contentInner = document.getElementById('content-inner');
  contentInner.classList.add('content-leaving');
  setTimeout(() => {
    contentInner.innerHTML = `
      <div class="welcome">
        <div class="welcome-badge">源码解析</div>
        <h1>深入 Claude Code</h1>
        <p class="welcome-subtitle">架构解析</p>
        <p class="welcome-desc">从源码视角理解 Claude Code 的设计哲学与工程实现。<br>19 章，覆盖入口路由、QueryEngine、任务系统、工具链、提示词工程等核心模块。</p>
        <div class="welcome-meta">
          <span>作者：startheart &amp; Gordon</span>
          <span>·</span>
          <span>19 章节</span>
          <span>·</span>
          <span>持续更新中</span>
        </div>
        <div class="welcome-chapters">
          ${CHAPTERS.map((ch, i) => `
            <a class="welcome-ch" href="#${ch.id}">
              <span class="welcome-ch-num">${ch.num}</span>
              <span class="welcome-ch-title">${ch.title}</span>
            </a>
          `).join('')}
        </div>
        <div class="welcome-actions">
          <a class="welcome-start" href="#ch01">开始阅读 →</a>
          <a class="welcome-github" href="https://github.com/xuhengzhi75/claude-code-source" target="_blank" rel="noopener">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>
            GitHub
          </a>
        </div>
      </div>`;
    contentInner.classList.remove('content-leaving');
    contentInner.classList.add('content-entering');
    contentInner.addEventListener('animationend', () => {
      contentInner.classList.remove('content-entering');
    }, { once: true });
  }, 150);
  document.getElementById('prev-btn').style.display = 'none';
  document.getElementById('next-btn').style.display = 'none';
}

// ===== Footer Navigation =====
function updateFooterNav(idx) {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  if (idx > 0) {
    prevBtn.style.display = 'block';
    prevBtn.textContent = `← ${CHAPTERS[idx - 1].num} ${CHAPTERS[idx - 1].title}`;
  } else {
    prevBtn.style.display = 'none';
  }

  if (idx < CHAPTERS.length - 1) {
    nextBtn.style.display = 'block';
    nextBtn.textContent = `${CHAPTERS[idx + 1].num} ${CHAPTERS[idx + 1].title} →`;
  } else {
    nextBtn.style.display = 'none';
  }
}

function navigatePrev() {
  if (currentChapterIndex > 0) {
    window.location.hash = CHAPTERS[currentChapterIndex - 1].id;
  }
}

function navigateNext() {
  if (currentChapterIndex < CHAPTERS.length - 1) {
    window.location.hash = CHAPTERS[currentChapterIndex + 1].id;
  }
}

// ===== Mobile Sidebar =====
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

// ===== 阅读进度条 =====
function initReadProgress() {
  const bar = document.getElementById('read-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
    bar.style.width = pct + '%';
  }, { passive: true });
}

// ===== 源码锚点 Tooltip =====
function setupAnchorTooltips(container) {
  const anchors = container.querySelectorAll('code.code-anchor');
  if (!anchors.length) return;

  // 创建全局 tooltip 元素（复用）
  let tooltip = document.getElementById('anchor-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'anchor-tooltip';
    tooltip.className = 'anchor-tooltip';
    document.body.appendChild(tooltip);
  }

  anchors.forEach(el => {
    el.addEventListener('mouseenter', (e) => {
      const file = el.dataset.file;
      const line = parseInt(el.dataset.line);
      showAnchorTooltip(tooltip, el, file, line);
    });
    el.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });
  });
}

function showAnchorTooltip(tooltip, el, file, line) {
  // 构造 GitHub 源码链接
  const repoBase = 'https://github.com/xuhengzhi75/claude-code-source/blob/main/src';
  // 文件路径推断：去掉可能的路径前缀，只保留文件名
  const fileName = file.split('/').pop();
  const githubUrl = `${repoBase}/${fileName}#L${line}`;

  tooltip.innerHTML = `
    <div class="tooltip-file">${file}</div>
    <div class="tooltip-line">第 ${line} 行</div>
    <a class="tooltip-link" href="${githubUrl}" target="_blank" rel="noopener">在 GitHub 查看源码 →</a>
  `;

  // 定位
  const rect = el.getBoundingClientRect();
  tooltip.style.left = rect.left + 'px';
  tooltip.style.top  = (rect.bottom + window.scrollY + 8) + 'px';
  tooltip.classList.add('visible');
}

// ===== Utility =====
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
