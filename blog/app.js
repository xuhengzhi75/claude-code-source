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

  // Update active state in TOC
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

  // 1. Fade out
  contentInner.classList.add('content-leaving');
  await new Promise(r => setTimeout(r, 140));

  // 2. Show loading skeleton immediately
  window.scrollTo({ top: 0, behavior: 'instant' });
  showLoadingSkeleton(contentInner, ch);
  contentInner.classList.remove('content-leaving');
  contentInner.classList.add('content-entering');
  contentInner.addEventListener('animationend', () => {
    contentInner.classList.remove('content-entering');
  }, { once: true });

  // 3. Fetch markdown
  let md = null, fetchErr = null;
  try {
    const resp = await fetch(MD_BASE + ch.file);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    md = await resp.text();
  } catch (err) {
    fetchErr = err;
  }

  // 4. Skeleton 至少展示 300ms，避免闪烁
  const skeletonShown = Date.now();
  const elapsed = Date.now() - skeletonShown;
  if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));

  // 5. Fade out skeleton, fade in real content
  contentInner.classList.add('content-leaving');
  await new Promise(r => setTimeout(r, 120));

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

  contentInner.classList.remove('content-leaving');
  contentInner.classList.add('content-entering');
  contentInner.addEventListener('animationend', () => {
    contentInner.classList.remove('content-entering');
  }, { once: true });
}

// ===== Loading Skeleton =====
function showLoadingSkeleton(container, ch) {
  container.innerHTML = `
    <div class="chapter-skeleton">
      <div class="sk-chapter-label">${escapeHtml(ch.num)}</div>
      <div class="sk-title">
        <span class="sk-title-text">${escapeHtml(ch.title)}</span><span class="sk-cursor"></span>
      </div>
      <div class="sk-divider"></div>
      <div class="sk-lines">
        <div class="sk-line" style="width:92%"></div>
        <div class="sk-line" style="width:87%"></div>
        <div class="sk-line" style="width:95%"></div>
        <div class="sk-line" style="width:60%"></div>
        <div class="sk-line sk-line-gap" style="width:88%"></div>
        <div class="sk-line" style="width:91%"></div>
        <div class="sk-line" style="width:78%"></div>
        <div class="sk-line" style="width:94%"></div>
        <div class="sk-line" style="width:55%"></div>
        <div class="sk-line sk-line-gap" style="width:89%"></div>
        <div class="sk-line" style="width:82%"></div>
        <div class="sk-line" style="width:96%"></div>
        <div class="sk-line" style="width:70%"></div>
      </div>
      <div class="sk-code-block">
        <div class="sk-code-line" style="width:45%"></div>
        <div class="sk-code-line" style="width:68%"></div>
        <div class="sk-code-line" style="width:55%"></div>
        <div class="sk-code-line" style="width:72%"></div>
        <div class="sk-code-line" style="width:40%"></div>
      </div>
      <div class="sk-lines" style="margin-top:24px">
        <div class="sk-line" style="width:90%"></div>
        <div class="sk-line" style="width:85%"></div>
        <div class="sk-line" style="width:50%"></div>
      </div>
    </div>
  `;
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

// ===== 源码锚点 内联代码预览面板 =====
// hover 锚点 → 在段落后展开面板（含 loading shimmer）
// 鼠标在锚点或面板上时保持展开，离开后延迟 200ms 关闭

const REPO_RAW_BASE = 'https://raw.githubusercontent.com/xuhengzhi75/claude-code-source/main';
const REPO_BLOB_BASE = 'https://github.com/xuhengzhi75/claude-code-source/blob/main';

// 文件内容缓存，避免重复 fetch
const _fileCache = {};

// 每个锚点的关闭定时器
const _hideTimers = new WeakMap();

function setupAnchorTooltips(container) {
  const anchors = container.querySelectorAll('code.code-anchor');
  if (!anchors.length) return;

  anchors.forEach(el => {
    el.addEventListener('mouseenter', () => {
      // 取消可能正在倒计时的关闭
      clearHideTimer(el);
      const file = el.dataset.file;
      const line = parseInt(el.dataset.line);
      showAnchorPanel(el, file, line);
    });

    el.addEventListener('mouseleave', () => {
      scheduleHide(el);
    });
  });
}

function clearHideTimer(anchorEl) {
  const t = _hideTimers.get(anchorEl);
  if (t) { clearTimeout(t); _hideTimers.delete(anchorEl); }
}

function scheduleHide(anchorEl, delay = 220) {
  clearHideTimer(anchorEl);
  const t = setTimeout(() => {
    // 只有面板不在 hover 状态才真正关闭
    const panel = anchorEl._panel;
    if (panel && panel.matches(':hover')) return;
    closeAnchorPanel(anchorEl);
  }, delay);
  _hideTimers.set(anchorEl, t);
}

function closeAnchorPanel(anchorEl) {
  const panel = anchorEl._panel;
  if (panel) {
    // 移除滚动/resize 监听
    if (anchorEl._panelPositionHandler) {
      window.removeEventListener('scroll', anchorEl._panelPositionHandler, true);
      window.removeEventListener('resize', anchorEl._panelPositionHandler);
      anchorEl._panelPositionHandler = null;
    }
    panel.classList.add('ap-hiding');
    panel.addEventListener('animationend', () => panel.remove(), { once: true });
    anchorEl._panel = null;
  }
  anchorEl.classList.remove('active');
}

function positionPanel(panel, anchorEl) {
  const PANEL_WIDTH = 520;
  const OFFSET_Y = 8; // 锚点下方间距

  const rect = anchorEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 水平：优先左对齐锚点，超出右边界则右对齐
  let left = rect.left;
  if (left + PANEL_WIDTH > vw - 12) {
    left = Math.max(12, vw - PANEL_WIDTH - 12);
  }

  // 垂直：优先显示在锚点下方，空间不足则显示在上方
  const spaceBelow = vh - rect.bottom - OFFSET_Y;
  const PANEL_MAX_H = 320 + 40; // body max-height + header
  let top;
  if (spaceBelow >= PANEL_MAX_H || spaceBelow >= 160) {
    top = rect.bottom + OFFSET_Y;
  } else {
    top = rect.top - OFFSET_Y - Math.min(PANEL_MAX_H, vh * 0.5);
  }

  panel.style.left = `${left}px`;
  panel.style.top  = `${top}px`;
  panel.style.width = `${PANEL_WIDTH}px`;
}

function showAnchorPanel(anchorEl, file, line) {
  // 已经展开则不重复创建
  if (anchorEl._panel) return;

  anchorEl.classList.add('active');

  const panel = document.createElement('div');
  panel.className = 'anchor-panel';
  panel.dataset.file = file;
  panel.dataset.line = String(line);
  panel.innerHTML = buildPanelHTML(file, line);

  // 面板 hover 时取消关闭，离开时重新倒计时
  panel.addEventListener('mouseenter', () => clearHideTimer(anchorEl));
  panel.addEventListener('mouseleave', () => scheduleHide(anchorEl));

  // 挂到 body，fixed 定位，不影响文档流
  document.body.appendChild(panel);
  anchorEl._panel = panel;

  // 初始定位
  positionPanel(panel, anchorEl);

  // 滚动 / resize 时跟随锚点
  const updatePos = () => {
    if (!anchorEl._panel) return;
    positionPanel(panel, anchorEl);
  };
  anchorEl._panelPositionHandler = updatePos;
  window.addEventListener('scroll', updatePos, { passive: true, capture: true });
  window.addEventListener('resize', updatePos, { passive: true });

  // 绑定上下行按钮
  panel.querySelector('.ap-up').addEventListener('click', () => {
    const cur = parseInt(panel.dataset.line);
    if (cur > 1) shiftPanelLine(panel, anchorEl, file, cur - 1);
  });
  panel.querySelector('.ap-down').addEventListener('click', () => {
    const cur = parseInt(panel.dataset.line);
    shiftPanelLine(panel, anchorEl, file, cur + 1);
  });

  // 异步加载文件内容
  loadFileForPanel(panel, file, line);
}

function buildPanelHTML(file, line) {
  const githubUrl = buildGithubUrl(file, line);
  const ext = file.split('.').pop();
  const langMap = { ts: 'typescript', js: 'javascript', tsx: 'typescript', jsx: 'javascript', py: 'python', go: 'go', rs: 'rust', java: 'java', md: 'markdown' };
  const lang = langMap[ext] || ext;

  return `
    <div class="ap-header">
      <span class="ap-filepath">${escapeHtml(file)}#L${line}</span>
      <div class="ap-actions">
        <span class="ap-lang">${escapeHtml(lang)}</span>
        <button class="ap-btn ap-up" title="上移">↑</button>
        <button class="ap-btn ap-down" title="下移">↓</button>
        <a class="ap-btn ap-github" href="${githubUrl}" target="_blank" rel="noopener" title="在 GitHub 查看源码">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>
        </a>
      </div>
    </div>
    <div class="ap-body ap-loading">
      <div class="ap-sk-lines">
        <div class="ap-sk-line" style="width:72%"></div>
        <div class="ap-sk-line" style="width:55%"></div>
        <div class="ap-sk-line" style="width:80%"></div>
        <div class="ap-sk-line" style="width:48%"></div>
        <div class="ap-sk-line ap-sk-target"></div>
        <div class="ap-sk-line" style="width:65%"></div>
        <div class="ap-sk-line" style="width:78%"></div>
      </div>
    </div>
  `;
}

function buildGithubUrl(file, line) {
  const hasPath = file.includes('/');
  const filePath = hasPath ? file : `src/${file}`;
  return `${REPO_BLOB_BASE}/${filePath}#L${line}`;
}

async function loadFileForPanel(panel, file, line) {
  const hasPath = file.includes('/');
  const filePath = hasPath ? file : `src/${file}`;
  const rawUrl = `${REPO_RAW_BASE}/${filePath}`;

  let lines;
  try {
    if (!_fileCache[filePath]) {
      const resp = await fetch(rawUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      _fileCache[filePath] = text.split('\n');
    }
    lines = _fileCache[filePath];
  } catch (err) {
    const body = panel.querySelector('.ap-body');
    if (body) {
      body.className = 'ap-body ap-error';
      body.innerHTML = `<span>无法加载：${escapeHtml(err.message)}</span>`;
    }
    return;
  }

  renderPanelCode(panel, lines, parseInt(line), file);
}

function renderPanelCode(panel, allLines, centerLine, file) {
  const CONTEXT = 8;
  const total = allLines.length;
  const start = Math.max(1, centerLine - CONTEXT);
  const end   = Math.min(total, centerLine + CONTEXT);

  const ext = file.split('.').pop();
  const langMap = { ts: 'typescript', js: 'javascript', tsx: 'typescript', jsx: 'javascript', py: 'python', go: 'go', rs: 'rust', java: 'java', md: 'markdown' };
  const lang = langMap[ext] || 'plaintext';

  const snippet = allLines.slice(start - 1, end).join('\n');
  let highlighted;
  try {
    if (lang !== 'plaintext' && hljs.getLanguage(lang)) {
      highlighted = hljs.highlight(snippet, { language: lang }).value;
    } else {
      highlighted = hljs.highlightAuto(snippet).value;
    }
  } catch (e) {
    highlighted = escapeHtml(snippet);
  }

  const hlLines = highlighted.split('\n');
  const rows = hlLines.map((lineHtml, i) => {
    const lineNo = start + i;
    const isTarget = lineNo === centerLine;
    return `<span class="ap-line${isTarget ? ' ap-line-target' : ''}" data-line="${lineNo}"><span class="ap-lnum">${lineNo}</span><span class="ap-lcode">${lineHtml || ' '}</span></span>`;
  }).join('\n');

  const body = panel.querySelector('.ap-body');
  if (!body) return;

  // 淡出 loading → 淡入代码
  body.classList.add('ap-body-fade');
  setTimeout(() => {
    body.className = 'ap-body';
    body.innerHTML = `<code class="hljs ap-code">${rows}</code>`;

    // 更新 header 行号
    const fp = panel.querySelector('.ap-filepath');
    if (fp) fp.textContent = `${file}#L${centerLine}`;

    // 更新 GitHub 链接
    const gh = panel.querySelector('.ap-github');
    if (gh) gh.href = buildGithubUrl(file, centerLine);

    // 目标行滚动到可见
    const targetLine = body.querySelector('.ap-line-target');
    if (targetLine) {
      setTimeout(() => targetLine.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
    }
  }, 150);
}

function shiftPanelLine(panel, anchorEl, file, newLine) {
  panel.dataset.line = String(newLine);
  const filePath = file.includes('/') ? file : `src/${file}`;
  const lines = _fileCache[filePath];
  if (lines) renderPanelCode(panel, lines, newLine, file);
}

// ===== Utility =====
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
