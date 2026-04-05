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
  { id: 'ch20', file: 'ch20-权限系统.md',           title: '权限系统',             num: '第20章' },
];

// 通俗版章节（扫地阿姨也能看懂）
const EASY_CHAPTERS = [
  { id: 'easy01', file: '01-为什么不会忘记.md',    title: '为什么不会"忘记"',     num: '第1篇' },
  { id: 'easy02', file: '02-怎么知道任务没完.md',  title: '怎么知道任务没完',     num: '第2篇' },
  { id: 'easy03', file: '03-请求进来先做什么.md',  title: '请求进来先做什么',     num: '第3篇' },
  { id: 'easy04', file: '04-工具系统.md',          title: '它的"手"和"脚"',       num: '第4篇' },
  { id: 'easy05', file: '05-状态与上下文.md',      title: '怎么记住你说过的话',   num: '第5篇' },
  { id: 'easy06', file: '06-任务系统.md',          title: '长任务为什么不会断',   num: '第6篇' },
  { id: 'easy07', file: '07-为什么难以复制.md',    title: '源码泄露了为何难复制', num: '第7篇' },
  { id: 'easy08', file: '08-为什么更靠谱.md',      title: '凭什么比普通工具靠谱', num: '第8篇' },
  { id: 'easy09', file: '09-你在依赖什么.md',      title: '你真正在依赖什么',     num: '第9篇' },
  { id: 'easy10', file: '10-什么样的工具值得信任.md', title: '什么样的工具值得信任', num: '第10篇' },
];

// Base path for markdown files (relative to index.html)
// build.sh 会将 docs/book/chapters/*.md 复制到 blog/chapters/
const MD_BASE = './chapters/';
const EASY_MD_BASE = './easy-chapters/';

// ===== State =====
let currentChapterIndex = -1;
let currentEasyIndex = -1;
let currentMode = 'tech'; // 'tech' | 'easy'

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  buildTOC();
  buildWelcomeCards();
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
  if (btn) btn.innerHTML = theme === 'dark'
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  // hljs 主题通过 CSS [data-theme="dark"] 选择器自动切换，无需 JS 操作
  // 主题切换时重新 initialize mermaid，下次渲染时生效
  mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default', securityLevel: 'strict', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// ===== Share =====
function sharePage() {
  const url = location.href;
  const title = document.title;
  const text = '推荐一篇文章：' + title;

  // 手机端优先用原生分享面板
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
    return;
  }

  // PC 端：复制链接 + 显示 toast
  const toast = document.getElementById('share-toast');
  navigator.clipboard.writeText(url).then(() => {
    showShareToast(toast, '已复制链接');
  }).catch(() => {
    // clipboard API 不可用时降级：execCommand
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showShareToast(toast, '已复制链接');
  });
}

function showShareToast(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

// ===== Build TOC =====
function buildTOC() {
  const toc = document.getElementById('toc');
  toc.innerHTML = '';

  // 通俗版分区
  const easyLabel = document.createElement('div');
  easyLabel.className = 'toc-section-label';
  easyLabel.textContent = '通俗版 · 人人看得懂';
  toc.appendChild(easyLabel);

  EASY_CHAPTERS.forEach((ch, idx) => {
    const a = document.createElement('a');
    a.className = 'toc-item toc-item-easy';
    a.href = `#${ch.id}`;
    a.dataset.idx = idx;
    a.dataset.mode = 'easy';
    a.innerHTML = `<span class="toc-chapter-num">${ch.num}</span>${ch.title}`;
    a.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeSidebar();
    });
    toc.appendChild(a);
  });

  // 技术版分区
  const techLabel = document.createElement('div');
  techLabel.className = 'toc-section-label toc-section-label-tech';
  techLabel.textContent = '技术版 · 源码解析';
  toc.appendChild(techLabel);

  CHAPTERS.forEach((ch, idx) => {
    const a = document.createElement('a');
    a.className = 'toc-item';
    a.href = `#${ch.id}`;
    a.dataset.idx = idx;
    a.dataset.mode = 'tech';
    a.innerHTML = `<span class="toc-chapter-num">${ch.num}</span>${ch.title}`;
    a.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeSidebar();
    });
    toc.appendChild(a);
  });
}

// ===== Build Welcome Cards =====
function buildWelcomeCards() {
  const el = document.getElementById('welcome-cards-placeholder');
  if (!el) return;
  el.innerHTML = `
    <div class="welcome-card welcome-card-easy" onclick="loadEasyChapter(0)">
      <div class="welcome-card-header">
        <div class="welcome-card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </div>
        <div class="welcome-card-title">通俗版 · 人人看得懂</div>
      </div>
      <div class="welcome-card-desc">不需要看代码。用日常语言讲清楚 Claude Code 为什么这样设计，对你意味着什么。</div>
      <div class="welcome-card-chapters">
        ${EASY_CHAPTERS.map(ch => `<a class="welcome-ch" href="#${ch.id}"><span class="welcome-ch-num">${ch.num}</span><span class="welcome-ch-title">${ch.title}</span></a>`).join('')}
      </div>
    </div>
    <div class="welcome-card welcome-card-tech" onclick="loadChapter(0)">
      <div class="welcome-card-header">
        <div class="welcome-card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </div>
        <div class="welcome-card-title">技术版 · 源码级解析</div>
      </div>
      <div class="welcome-card-desc">深入源码，分析每一个设计决策背后的工程权衡。适合想理解实现细节的开发者。</div>
      <div class="welcome-card-chapters">
        ${CHAPTERS.map(ch => `<a class="welcome-ch" href="#${ch.id}"><span class="welcome-ch-num">${ch.num}</span><span class="welcome-ch-title">${ch.title}</span></a>`).join('')}
      </div>
    </div>`;
}

// ===== Routing =====
function handleRoute() {
  const hash = window.location.hash.replace('#', '');
  if (!hash) {
    showWelcome();
    return;
  }
  // 通俗版路由
  if (hash.startsWith('easy')) {
    const idx = EASY_CHAPTERS.findIndex(ch => ch.id === hash);
    if (idx !== -1) {
      loadEasyChapter(idx);
      return;
    }
  }
  // 技术版路由
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
  currentEasyIndex = -1;
  currentMode = 'tech';

  // Update active state in TOC (only tech items)
  document.querySelectorAll('.toc-item[data-mode="tech"]').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  document.querySelectorAll('.toc-item[data-mode="easy"]').forEach(el => el.classList.remove('active'));

  // Scroll TOC item into view（手机端侧边栏关闭时跳过，打开时再滚动）
  if (window.innerWidth > 768) {
    const activeItem = document.querySelector('.toc-item.active');
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
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

// ===== Load Easy Chapter (通俗版) =====
async function loadEasyChapter(idx) {
  const ch = EASY_CHAPTERS[idx];
  currentEasyIndex = idx;
  currentChapterIndex = -1;
  currentMode = 'easy';

  // Update active state in TOC
  document.querySelectorAll('.toc-item[data-mode="easy"]').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  document.querySelectorAll('.toc-item[data-mode="tech"]').forEach(el => el.classList.remove('active'));

  // Scroll TOC item into view（手机端侧边栏关闭时跳过，打开时再滚动）
  if (window.innerWidth > 768) {
    const activeItem = document.querySelector('.toc-item.active');
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // Update topbar title
  document.getElementById('topbar-title').textContent = `${ch.num} ${ch.title}`;
  document.title = `${ch.num} ${ch.title} — 深入 Claude Code`;

  // Update footer nav for easy mode
  updateEasyFooterNav(idx);

  const contentInner = document.getElementById('content-inner');

  // Fade out
  contentInner.classList.add('content-leaving');
  await new Promise(r => setTimeout(r, 140));

  // Show loading skeleton
  window.scrollTo({ top: 0, behavior: 'instant' });
  showLoadingSkeleton(contentInner, ch);
  contentInner.classList.remove('content-leaving');
  contentInner.classList.add('content-entering');
  contentInner.addEventListener('animationend', () => {
    contentInner.classList.remove('content-entering');
  }, { once: true });

  // Fetch markdown
  let md = null, fetchErr = null;
  try {
    const resp = await fetch(EASY_MD_BASE + ch.file);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    md = await resp.text();
  } catch (err) {
    fetchErr = err;
  }

  const skeletonShown = Date.now();
  const elapsed = Date.now() - skeletonShown;
  if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));

  contentInner.classList.add('content-leaving');
  await new Promise(r => setTimeout(r, 120));

  if (fetchErr) {
    contentInner.innerHTML = `
      <div class="error-msg">
        <strong>加载失败</strong><br>
        无法加载文章：${ch.file}<br>
        <small>${fetchErr.message}</small>
      </div>`;
  } else {
    // 通俗版：在内容顶部加一个"通俗版"标签
    const easyBadge = `<div class="easy-mode-badge">通俗版 · 无需代码基础</div>`;
    renderMarkdown(md, contentInner);
    const mdBody = contentInner.querySelector('.md-body');
    if (mdBody) mdBody.insertAdjacentHTML('afterbegin', easyBadge);
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
  // marked v9 调用签名：renderer.code(code, infostring, escaped)
  renderer.code = function(code, infostring, escaped) {
    const language = (infostring || '').match(/^\S*/)?.[0] || 'plaintext';

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

    // 生成行号（splitHlLines 同时修复跨行 span 问题）
    const lines = splitHlLines(highlighted);
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
  // marked v9 调用签名：renderer.codespan(text)
  renderer.codespan = function(code) {
    // 匹配 filename.ext#L数字 格式
    const anchorMatch = code.match(/^([\w./-]+\.(?:ts|js|tsx|jsx|py|go|rs|java|md))#(L\d+(?:-L\d+)?)$/);
    if (anchorMatch) {
      const [, file, lineRef] = anchorMatch;
      const lineNum = parseInt(lineRef.replace('L', ''));
      return `<code class="code-anchor" data-file="${escapeHtml(file)}" data-line="${lineNum}">${escapeHtml(code)}</code>`;
    }
    return `<code>${escapeHtml(code)}</code>`;
  };

  marked.use({ renderer, breaks: false, gfm: true });
}

function setupMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
    // securityLevel 从 'loose' 收紧为 'strict'。
    // 已盘点全部图表（ch01/ch03/ch06/ch07/ch08/ch20），均为纯 flowchart/sequenceDiagram，
    // 无 click 事件、href 链接、内联 HTML，不依赖 loose 模式。
    // strict 模式下 SVG 输出经过 DOMPurify 清洗，消除 XSS 风险。
    securityLevel: 'strict',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  });
}

function renderMarkdown(md, container) {
  const rawHtml = marked.parse(md);
  // DOMPurify 清洗层：防止 markdown 内容中的恶意 HTML/XSS 注入。
  // 保留代码高亮所需的 class 属性，允许 data-* 属性（源码锚点用）。
  // 不允许 script、on* 事件属性、javascript: 协议。
  const html = (typeof DOMPurify !== 'undefined')
    ? DOMPurify.sanitize(rawHtml, {
        ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'title',
                       'data-file', 'data-line', 'data-highlighted',
                       'target', 'rel', 'width', 'height', 'style'],
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
      })
    : rawHtml; // DOMPurify 未加载时降级（不阻断渲染）
  container.innerHTML = `<div class="md-body">${html}</div>`;

  // Mermaid — 不在这里重复 initialize（会重置内部状态导致 .then() 不触发）
  // initialize 只在 setupMermaid() 和主题切换时调用
  const mermaidEls = Array.from(container.querySelectorAll('.mermaid'));
  if (mermaidEls.length > 0) {
    // 用 MutationObserver 监听 SVG 插入，比 mermaid.run().then() 更可靠
    // mermaid.run().then() 在某些版本/场景下不 resolve（已渲染节点、多图等）
    let rendered = 0;
    const observer = new MutationObserver(() => {
      rendered = mermaidEls.filter(el => el.querySelector('svg')).length;
      if (rendered === mermaidEls.length) {
        observer.disconnect();
        requestAnimationFrame(() => setupMermaidLightbox(container));
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    mermaid.run({ nodes: mermaidEls })
      .catch(err => console.warn('Mermaid render error:', err));

    // 兜底：3s 后无论如何都绑定一次（防止 observer 漏掉）
    setTimeout(() => {
      observer.disconnect();
      setupMermaidLightbox(container);
    }, 3000);
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
        <h1>深入 Claude Code</h1>
        <p class="welcome-subtitle">架构解析</p>
        <p class="welcome-desc">从源码视角理解 Claude Code 的设计哲学与工程实现。覆盖入口路由、QueryEngine、任务系统、工具链、提示词工程等核心模块。</p>
        <div class="welcome-meta">
          <span>作者：startheart &amp; Gordon</span>
          <span>·</span>
          <span>持续更新中</span>
        </div>
        <div class="welcome-actions">
          <a class="welcome-start" href="#easy01">开始阅读 →</a>
          <a class="welcome-github" href="https://github.com/xuhengzhi75/claude-code-source" target="_blank" rel="noopener">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>
            GitHub
          </a>
        </div>
        <div class="welcome-cards">
          <div class="welcome-card welcome-card-easy" onclick="loadEasyChapter(0)">
            <div class="welcome-card-header">
              <div class="welcome-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <div class="welcome-card-title">通俗版 · 人人看得懂</div>
            </div>
            <div class="welcome-card-desc">不需要看代码。用日常语言讲清楚 Claude Code 为什么这样设计，对你意味着什么。</div>
            <div class="welcome-card-chapters">
              ${EASY_CHAPTERS.map(ch => `<a class="welcome-ch" href="#${ch.id}"><span class="welcome-ch-num">${ch.num}</span><span class="welcome-ch-title">${ch.title}</span></a>`).join('')}
            </div>
          </div>
          <div class="welcome-card welcome-card-tech" onclick="loadChapter(0)">
            <div class="welcome-card-header">
              <div class="welcome-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              </div>
              <div class="welcome-card-title">技术版 · 源码级解析</div>
            </div>
            <div class="welcome-card-desc">深入源码，分析每一个设计决策背后的工程权衡。适合想理解实现细节的开发者。</div>
            <div class="welcome-card-chapters">
              ${CHAPTERS.map(ch => `<a class="welcome-ch" href="#${ch.id}"><span class="welcome-ch-num">${ch.num}</span><span class="welcome-ch-title">${ch.title}</span></a>`).join('')}
            </div>
          </div>
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

function updateEasyFooterNav(idx) {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  if (idx > 0) {
    prevBtn.style.display = 'block';
    prevBtn.textContent = `← ${EASY_CHAPTERS[idx - 1].num} ${EASY_CHAPTERS[idx - 1].title}`;
  } else {
    prevBtn.style.display = 'none';
  }

  if (idx < EASY_CHAPTERS.length - 1) {
    nextBtn.style.display = 'block';
    nextBtn.textContent = `${EASY_CHAPTERS[idx + 1].num} ${EASY_CHAPTERS[idx + 1].title} →`;
  } else {
    nextBtn.style.display = 'none';
  }
}

function navigatePrev() {
  if (currentMode === 'easy') {
    if (currentEasyIndex > 0) {
      window.location.hash = EASY_CHAPTERS[currentEasyIndex - 1].id;
    }
  } else {
    if (currentChapterIndex > 0) {
      window.location.hash = CHAPTERS[currentChapterIndex - 1].id;
    }
  }
}

function navigateNext() {
  if (currentMode === 'easy') {
    if (currentEasyIndex < EASY_CHAPTERS.length - 1) {
      window.location.hash = EASY_CHAPTERS[currentEasyIndex + 1].id;
    }
  } else {
    if (currentChapterIndex < CHAPTERS.length - 1) {
      window.location.hash = CHAPTERS[currentChapterIndex + 1].id;
    }
  }
}

// ===== Mobile Sidebar =====
let _sidebarScrollTop = 0; // 记住侧边栏滚动位置

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const isOpening = !sidebar.classList.contains('open');

  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');

  if (isOpening) {
    // 恢复滚动位置，并确保 active 条目可见
    sidebar.scrollTop = _sidebarScrollTop;
    // 等 transition 结束后直接定位到 active 条目（不用滚动动画）
    setTimeout(() => {
      const activeItem = sidebar.querySelector('.toc-item.active');
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }
    }, 260);
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  // 关闭前保存滚动位置
  _sidebarScrollTop = sidebar.scrollTop;
  sidebar.classList.remove('open');
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

// 文件名 → 仓库内完整路径映射（处理深层目录文件）
const FILE_PATH_MAP = {
  'QueryEngine.ts':          'src/QueryEngine.ts',
  'Tool.ts':                 'src/Tool.ts',
  'query.ts':                'src/query.ts',
  'tools.ts':                'src/tools.ts',
  'commands.ts':             'src/commands.ts',
  'cli.tsx':                 'src/entrypoints/cli.tsx',
  'compact.ts':              'src/services/compact/compact.ts',
  'growthbook.ts':           'src/services/analytics/growthbook.ts',
  'claude.ts':               'src/services/api/claude.ts',
  'sessionMemory.ts':        'src/services/SessionMemory/sessionMemory.ts',
  'sessionStorage.ts':       'src/utils/sessionStorage.ts',
  'tasks.ts':                'src/utils/tasks.ts',
  'conversationRecovery.ts': 'src/utils/conversationRecovery.ts',
  'streamlinedTransform.ts': 'src/utils/streamlinedTransform.ts',
  'errors.ts':               'src/utils/errors.ts',
  'prompts.ts':              'src/constants/prompts.ts',
};

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

  // 手机端：tap 触发
  setupAnchorTouchTrigger(container);
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
  const OFFSET_Y = 8;
  const MARGIN = 12; // 距视口边缘最小间距

  const rect = anchorEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 水平：优先左对齐锚点，超出右边界则右对齐
  let left = rect.left;
  if (left + PANEL_WIDTH > vw - MARGIN) {
    left = Math.max(MARGIN, vw - PANEL_WIDTH - MARGIN);
  }

  // 面板实际高度（已渲染时取真实高度，否则用估算值）
  const panelH = panel.offsetHeight > 0 ? panel.offsetHeight : 360;
  const spaceBelow = vh - rect.bottom - OFFSET_Y;
  const spaceAbove = rect.top - OFFSET_Y;

  let top;
  if (spaceBelow >= panelH || spaceBelow >= spaceAbove) {
    // 下方放得下，或下方空间更大：显示在下方
    top = rect.bottom + OFFSET_Y;
    // 如果超出底部，向上夹紧
    if (top + panelH > vh - MARGIN) {
      top = Math.max(MARGIN, vh - panelH - MARGIN);
    }
  } else {
    // 上方空间更大：显示在上方
    top = rect.top - OFFSET_Y - panelH;
    if (top < MARGIN) top = MARGIN;
  }

  panel.style.left  = `${left}px`;
  panel.style.top   = `${top}px`;
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

  // 初始定位（面板刚插入 DOM，offsetHeight 可能为 0，先粗定位）
  positionPanel(panel, anchorEl);
  // 下一帧拿到真实高度后重新定位，修正底部截断
  requestAnimationFrame(() => {
    if (anchorEl._panel === panel) positionPanel(panel, anchorEl);
  });

  // 滚动 / resize 时跟随锚点
  const updatePos = () => {
    if (!anchorEl._panel) return;
    positionPanel(panel, anchorEl);
  };
  anchorEl._panelPositionHandler = updatePos;
  window.addEventListener('scroll', updatePos, { passive: true, capture: true });
  window.addEventListener('resize', updatePos, { passive: true });

  // 绑定上下行按钮（每次追加 5 行，保留已有内容）
  panel.querySelector('.ap-up').addEventListener('click', () => {
    expandPanelUp(panel, anchorEl, file);
  });
  panel.querySelector('.ap-down').addEventListener('click', () => {
    expandPanelDown(panel, anchorEl, file);
  });

  // 异步加载文件内容
  loadFileForPanel(panel, anchorEl, file, line);
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
        <button class="ap-btn ap-up" title="向上展开 5 行">↑</button>
        <button class="ap-btn ap-down" title="向下展开 5 行">↓</button>
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

function resolveFilePath(file) {
  if (file.includes('/')) return file;          // 已有路径，直接用
  return FILE_PATH_MAP[file] || `src/${file}`;  // 查映射表，fallback 到 src/
}

function buildGithubUrl(file, line) {
  return `${REPO_BLOB_BASE}/${resolveFilePath(file)}#L${line}`;
}

async function loadFileForPanel(panel, anchorEl, file, line) {
  const filePath = resolveFilePath(file);
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

  renderPanelCode(panel, lines, parseInt(line), file, anchorEl);
}

function renderPanelCode(panel, allLines, centerLine, file, anchorEl) {
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

  const hlLines = splitHlLines(highlighted);
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

    // 记录当前渲染范围，供 expandPanelUp/Down 使用
    panel.dataset.start = String(start);
    panel.dataset.end   = String(end);

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

    // 内容渲染后高度变化，重新定位防止底部截断
    if (anchorEl) {
      requestAnimationFrame(() => {
        if (anchorEl._panel === panel) positionPanel(panel, anchorEl);
      });
    }
  }, 150);
}

// 向上追加 5 行（前插到顶部）
function expandPanelUp(panel, anchorEl, file) {
  const filePath = resolveFilePath(file);
  const allLines = _fileCache[filePath];
  if (!allLines) return;

  const curStart = parseInt(panel.dataset.start || '1');
  if (curStart <= 1) return; // 已到顶

  const newStart = Math.max(1, curStart - 5);
  appendPanelLines(panel, anchorEl, file, allLines, newStart, curStart - 1, 'prepend');
  panel.dataset.start = String(newStart);
}

// 向下追加 5 行（追加到底部）
function expandPanelDown(panel, anchorEl, file) {
  const filePath = resolveFilePath(file);
  const allLines = _fileCache[filePath];
  if (!allLines) return;

  const curEnd = parseInt(panel.dataset.end || '1');
  if (curEnd >= allLines.length) return; // 已到底

  const newEnd = Math.min(allLines.length, curEnd + 5);
  appendPanelLines(panel, anchorEl, file, allLines, curEnd + 1, newEnd, 'append');
  panel.dataset.end = String(newEnd);
}

// 渲染指定行范围并插入到面板（prepend 或 append）
function appendPanelLines(panel, anchorEl, file, allLines, fromLine, toLine, mode) {
  const ext = file.split('.').pop();
  const langMap = { ts: 'typescript', js: 'javascript', tsx: 'typescript', jsx: 'javascript', py: 'python', go: 'go', rs: 'rust', java: 'java', md: 'markdown' };
  const lang = langMap[ext] || 'plaintext';

  const snippet = allLines.slice(fromLine - 1, toLine).join('\n');
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

  const hlLines = splitHlLines(highlighted);
  const rows = hlLines.map((lineHtml, i) => {
    const lineNo = fromLine + i;
    return `<span class="ap-line" data-line="${lineNo}"><span class="ap-lnum">${lineNo}</span><span class="ap-lcode">${lineHtml || ' '}</span></span>`;
  }).join('\n');

  const body = panel.querySelector('.ap-body');
  const code = body && body.querySelector('.hljs.ap-code');
  if (!code) return;

  const tmp = document.createElement('div');
  tmp.innerHTML = rows;
  const newSpans = Array.from(tmp.childNodes);

  if (mode === 'prepend') {
    // 先记录插入前的 scrollHeight，插入后新内容高度就是差值
    const prevHeight = body.scrollHeight;
    newSpans.reverse().forEach(n => code.insertBefore(n, code.firstChild));
    const addedHeight = body.scrollHeight - prevHeight;
    // 瞬间跳到新内容底部（让新内容刚好在视口上方），再 smooth 滚回顶部
    body.scrollTop = addedHeight;
    setTimeout(() => {
      body.scrollTo({ top: 0, behavior: 'smooth' });
    }, 16);
  } else {
    newSpans.forEach(n => code.appendChild(n));
    // 滚动到新增内容
    setTimeout(() => {
      const last = code.querySelector('.ap-line:last-child');
      if (last) last.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 30);
  }

  // 重新定位面板
  if (anchorEl) {
    requestAnimationFrame(() => {
      if (anchorEl._panel === panel) positionPanel(panel, anchorEl);
    });
  }
}

// ===== Utility =====

/**
 * 将 hljs 高亮后的 HTML 按行分割，同时修复跨行 span 问题。
 * hljs 对多行字符串/注释会生成跨越多行的 <span>，直接 split('\n') 后
 * 每行的 span 标签不完整，浏览器会把后续行合并成一行。
 * 解决方案：每行末尾关闭所有未闭合的 span，下一行开头重新打开。
 */
function splitHlLines(highlighted) {
  const lines = highlighted.split('\n');
  const result = [];
  // 记录当前"打开中"的 span 标签列表（保留完整 opening tag 以便重新打开）
  let openSpans = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 在行首补上上一行未关闭的 span
    const prefix = openSpans.join('');

    // 扫描本行，更新 openSpans 状态
    // 匹配所有 <span ...> 和 </span>
    const tagRe = /<span([^>]*)>|<\/span>/g;
    let m;
    while ((m = tagRe.exec(line)) !== null) {
      if (m[0].startsWith('</span>')) {
        openSpans.pop();
      } else {
        openSpans.push('<span' + m[1] + '>');
      }
    }

    // 行末补上关闭标签（倒序关闭）
    const suffix = openSpans.map(() => '</span>').join('');

    result.push(prefix + line + suffix);
  }
  return result;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== Mermaid Lightbox =====
function setupMermaidLightbox(container) {
  const diagrams = container.querySelectorAll('.mermaid');
  diagrams.forEach(el => {
    // 避免重复绑定
    if (el.dataset.lbBound) return;
    el.dataset.lbBound = '1';
    el.addEventListener('click', () => openMermaidLightbox(el));
  });
}

function openMermaidLightbox(el) {
  // 克隆 SVG 内容
  const svgEl = el.querySelector('svg');
  if (!svgEl) {
    console.warn('[Lightbox] SVG not found in mermaid element, skipping lightbox', el);
    return;
  }
  const svgClone = svgEl.cloneNode(true);
  svgClone.style.width = '100%';
  svgClone.style.height = 'auto';
  svgClone.style.maxWidth = '100%';
  svgClone.style.display = 'block';

  const lb = document.createElement('div');
  lb.className = 'mermaid-lightbox';
  lb.innerHTML = `
    <div class="mermaid-lightbox-backdrop"></div>
    <div class="mermaid-lightbox-content">
      <button class="mermaid-lightbox-close" title="关闭">✕</button>
      <div class="mermaid-lb-zoom"></div>
      <span class="mermaid-lb-hint">滚轮缩放 · 拖拽平移 · 双击重置</span>
      <span class="mermaid-lb-scale">100%</span>
    </div>
  `;
  lb.querySelector('.mermaid-lb-zoom').appendChild(svgClone);
  document.body.appendChild(lb);

  // ── 禁止 lightbox 打开期间页面级滚轮缩放 ─────────────────
  // 浏览器的 Ctrl+Wheel 页面缩放发生在 document 层，
  // 必须在 capture 阶段拦截才能阻止（lightbox 内的 wheel 已 preventDefault，
  // 但冒泡到 document 后浏览器仍会处理 Ctrl+Wheel）
  const blockPageZoom = (e) => { e.preventDefault(); };
  document.addEventListener('wheel', blockPageZoom, { passive: false, capture: true });

  // ── 缩放 / 平移状态 ──────────────────────────────────────
  const zoomEl = lb.querySelector('.mermaid-lb-zoom');
  const scaleEl = lb.querySelector('.mermaid-lb-scale');
  let scale = 1, tx = 0, ty = 0;
  const MIN_SCALE = 0.5, MAX_SCALE = 8;
  let scaleTimer = null;

  function applyTransform() {
    zoomEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function showScale() {
    scaleEl.textContent = Math.round(scale * 100) + '%';
    scaleEl.classList.add('visible');
    clearTimeout(scaleTimer);
    scaleTimer = setTimeout(() => scaleEl.classList.remove('visible'), 1200);
  }

  const content = lb.querySelector('.mermaid-lightbox-content');

  function clampTranslate() {
    // 缩放 < 1 时居中，不允许拖出边界
    const cw = content.clientWidth, ch = content.clientHeight;
    const maxTx = Math.max(0, (cw * scale - cw) / 2);
    const maxTy = Math.max(0, (ch * scale - ch) / 2);
    tx = Math.max(-maxTx, Math.min(maxTx, tx));
    ty = Math.max(-maxTy, Math.min(maxTy, ty));
  }

  // ── 滚轮缩放 ─────────────────────────────────────────────
  content.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * delta));
    // 以鼠标位置为缩放中心
    const rect = content.getBoundingClientRect();
    const ox = e.clientX - rect.left - rect.width / 2;
    const oy = e.clientY - rect.top - rect.height / 2;
    tx = ox - (ox - tx) * (newScale / scale);
    ty = oy - (oy - ty) * (newScale / scale);
    scale = newScale;
    clampTranslate();
    applyTransform();
    showScale();
  }, { passive: false });

  // ── 双击重置 ─────────────────────────────────────────────
  content.addEventListener('dblclick', (e) => {
    if (e.target.closest('.mermaid-lightbox-close')) return;
    scale = 1; tx = 0; ty = 0;
    zoomEl.style.transition = 'transform 0.25s ease';
    applyTransform();
    showScale();
    setTimeout(() => { zoomEl.style.transition = ''; }, 260);
  });

  // ── 鼠标拖拽平移 ─────────────────────────────────────────
  let dragging = false, dragStartX = 0, dragStartY = 0, dragTx = 0, dragTy = 0;

  const onMouseMove = (e) => {
    if (!dragging) return;
    tx = dragTx + (e.clientX - dragStartX);
    ty = dragTy + (e.clientY - dragStartY);
    clampTranslate();
    applyTransform();
  };

  const onMouseUp = () => {
    if (!dragging) return;
    dragging = false;
    content.classList.remove('lb-dragging');
  };

  content.addEventListener('mousedown', (e) => {
    if (e.target.closest('.mermaid-lightbox-close')) return;
    dragging = true;
    dragStartX = e.clientX; dragStartY = e.clientY;
    dragTx = tx; dragTy = ty;
    content.classList.add('lb-dragging');
    e.preventDefault();
  });

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  // ── 触摸：捏合缩放 + 单指拖拽 ────────────────────────────
  let lastTouchDist = 0, lastTouchMidX = 0, lastTouchMidY = 0;
  let touchDragging = false, touchStartX = 0, touchStartY = 0, touchTx = 0, touchTy = 0;

  content.addEventListener('touchstart', (e) => {
    if (e.target.closest('.mermaid-lightbox-close')) return;
    if (e.touches.length === 2) {
      const t0 = e.touches[0], t1 = e.touches[1];
      lastTouchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      lastTouchMidX = (t0.clientX + t1.clientX) / 2;
      lastTouchMidY = (t0.clientY + t1.clientY) / 2;
      touchDragging = false;
    } else if (e.touches.length === 1) {
      touchDragging = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchTx = tx; touchTy = ty;
    }
  }, { passive: true });

  content.addEventListener('touchmove', (e) => {
    if (e.target.closest('.mermaid-lightbox-close')) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      const rect = content.getBoundingClientRect();
      const ox = midX - rect.left - rect.width / 2;
      const oy = midY - rect.top - rect.height / 2;
      const ratio = dist / lastTouchDist;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * ratio));
      tx = ox - (ox - tx) * (newScale / scale) + (midX - lastTouchMidX);
      ty = oy - (oy - ty) * (newScale / scale) + (midY - lastTouchMidY);
      scale = newScale;
      lastTouchDist = dist;
      lastTouchMidX = midX; lastTouchMidY = midY;
      clampTranslate();
      applyTransform();
      showScale();
    } else if (e.touches.length === 1 && touchDragging) {
      tx = touchTx + (e.touches[0].clientX - touchStartX);
      ty = touchTy + (e.touches[0].clientY - touchStartY);
      clampTranslate();
      applyTransform();
    }
  }, { passive: false });

  content.addEventListener('touchend', () => { touchDragging = false; });

  // ── 关闭逻辑 ─────────────────────────────────────────────
  const closeFn = () => {
    document.removeEventListener('wheel', blockPageZoom, { capture: true });
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    lb.classList.add('lb-closing');
    setTimeout(() => lb.remove(), 200);
  };

  lb.querySelector('.mermaid-lightbox-close').addEventListener('click', closeFn);
  lb.querySelector('.mermaid-lightbox-backdrop').addEventListener('click', closeFn);

  const onKey = (e) => {
    if (e.key === 'Escape') { closeFn(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}

// ===== 手机端：锚点面板改为 tap 触发 =====
// 在 setupAnchorTooltips 中已有 mouseenter/mouseleave，
// 手机上没有 hover，需要额外绑定 click/touchstart
function setupAnchorTouchTrigger(container) {
  if (window.innerWidth > 768) return; // 仅手机
  const anchors = container.querySelectorAll('code.code-anchor');
  anchors.forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el._panel) {
        closeAnchorPanel(el);
      } else {
        const file = el.dataset.file;
        const line = parseInt(el.dataset.line);
        showAnchorPanel(el, file, line);
      }
    });
  });
  // 点击其他地方关闭
  document.addEventListener('click', () => {
    document.querySelectorAll('code.code-anchor').forEach(el => {
      if (el._panel) closeAnchorPanel(el);
    });
  }, { once: false, capture: true });
}
