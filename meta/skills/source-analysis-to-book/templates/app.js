/* ===================================================
   Book Blog — app.js
   Pure static site，支持 GitHub Pages / 任意静态托管

   使用方式：
   1. 修改下方 ===== 配置区 ===== 中的内容
   2. 将 Markdown 章节文件放到对应目录
   3. 部署到静态托管即可

   章节文件命名约定：
   - 主线章节：chapters/chXX-标题.md
   - 次要章节（如通俗版）：secondary-chapters/XX-标题.md
   =================================================== */

// =====================================================
// ===== 配置区：只需修改这里 =====
// =====================================================

// 书名（与 index.html 中的 {{BOOK_TITLE}} 对应）
const BOOK_TITLE = '你的书名';

// 主线章节列表
// id: hash 路由标识（#ch01）
// file: Markdown 文件名
// title: 显示标题
// num: 章节编号标签
const CHAPTERS = [
  { id: 'ch01', file: 'ch01-第一章标题.md',  title: '第一章标题',  num: '第1章' },
  { id: 'ch02', file: 'ch02-第二章标题.md',  title: '第二章标题',  num: '第2章' },
  // 继续添加...
];

// 次要章节列表（可选，如通俗版、入门版等）
// 设为空数组 [] 则不显示次要分区
const SECONDARY_CHAPTERS = [
  { id: 'sec01', file: '01-第一篇标题.md',  title: '第一篇标题',  num: '第1篇' },
  { id: 'sec02', file: '02-第二篇标题.md',  title: '第二篇标题',  num: '第2篇' },
  // 继续添加，或设为 [] 禁用
];

// Markdown 文件基础路径（相对于 index.html）
const MD_BASE = './chapters/';
const SECONDARY_MD_BASE = './secondary-chapters/';

// TOC 分区标签文字
const TOC_PRIMARY_LABEL   = '技术版 · 源码解析';    // 主线分区标签
const TOC_SECONDARY_LABEL = '通俗版 · 人人看得懂';  // 次要分区标签（SECONDARY_CHAPTERS 为空时不显示）

// 欢迎页卡片配置
const WELCOME_CARDS = [
  {
    type: 'secondary',  // 'primary' | 'secondary'，影响卡片颜色
    title: '通俗版 · 人人看得懂',
    desc: '不需要看代码。用日常语言讲清楚设计哲学，对你意味着什么。',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    chapters: SECONDARY_CHAPTERS,
    onclick: () => SECONDARY_CHAPTERS.length && loadSecondaryChapter(0),
  },
  {
    type: 'primary',
    title: '技术版 · 源码级解析',
    desc: '深入源码，分析每一个设计决策背后的工程权衡。适合想理解实现细节的开发者。',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    chapters: CHAPTERS,
    onclick: () => loadChapter(0),
  },
];

// 源码锚点面板配置（如果不需要源码锚点功能，保持空对象即可）
const REPO_RAW_BASE  = '';  // 例：'https://raw.githubusercontent.com/user/repo/main'
const REPO_BLOB_BASE = '';  // 例：'https://github.com/user/repo/blob/main'

// 文件名 → 仓库内完整路径映射（处理深层目录文件）
// 例：{ 'QueryEngine.ts': 'src/QueryEngine.ts' }
const FILE_PATH_MAP = {};

// =====================================================
// ===== 以下为功能代码，通常不需要修改 =====
// =====================================================

// ===== State =====
let currentChapterIndex   = -1;
let currentSecondaryIndex = -1;
let currentMode = 'primary'; // 'primary' | 'secondary'

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  buildTOC();
  if (WELCOME_CARDS.length) buildWelcomeCards();
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
  const mermaidTheme = theme === 'dark' ? 'dark' : 'default';
  mermaid.initialize({ startOnLoad: false, theme: mermaidTheme, securityLevel: 'strict', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' });
  const mermaidEls = document.querySelectorAll('.mermaid');
  if (mermaidEls.length > 0) {
    mermaidEls.forEach(el => {
      const src = el.dataset.mermaidSrc;
      if (src && src.trim()) {
        el.removeAttribute('data-processed');
        el.innerHTML = escapeHtml(src);
      }
    });
    mermaid.run({ nodes: Array.from(mermaidEls) })
      .catch(err => console.warn('Mermaid re-render error:', err));
  }
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
  if (navigator.share) { navigator.share({ title, text, url }).catch(() => {}); return; }
  const toast = document.getElementById('share-toast');
  navigator.clipboard.writeText(url).then(() => {
    showShareToast(toast, '已复制链接');
  }).catch(() => {
    try {
      const ta = document.createElement('textarea');
      ta.value = url; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    } catch (e) { /* ignore */ }
    showShareToast(toast, '已复制链接');
  });
}

function showShareToast(el, msg) {
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

// ===== 代码块复制 =====
function copyCodeBlock(btn) {
  const pre = btn.closest('pre');
  if (!pre) return;
  const code = pre.querySelector('code');
  if (!code) return;
  const lines = Array.from(code.querySelectorAll('.line-content'));
  const text = lines.length > 0 ? lines.map(l => l.textContent).join('\n') : code.textContent;
  const succeed = () => {
    btn.classList.add('copied'); btn.title = '已复制！';
    setTimeout(() => { btn.classList.remove('copied'); btn.title = '复制代码'; }, 2000);
  };
  navigator.clipboard.writeText(text).then(succeed).catch(() => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    } catch (e) { /* ignore */ }
    succeed();
  });
}

// ===== Build TOC =====
function buildTOC() {
  const toc = document.getElementById('toc');
  toc.innerHTML = '';

  // 次要章节分区（如通俗版）
  if (SECONDARY_CHAPTERS.length > 0) {
    const secLabel = document.createElement('div');
    secLabel.className = 'toc-section-label';
    secLabel.textContent = TOC_SECONDARY_LABEL;
    toc.appendChild(secLabel);

    SECONDARY_CHAPTERS.forEach((ch, idx) => {
      const a = document.createElement('a');
      a.className = 'toc-item toc-item-secondary';
      a.href = `#${ch.id}`;
      a.dataset.idx = idx;
      a.dataset.mode = 'secondary';
      a.innerHTML = `<span class="toc-chapter-num">${ch.num}</span>${ch.title}`;
      a.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); });
      toc.appendChild(a);
    });
  }

  // 主线章节分区
  const primaryLabel = document.createElement('div');
  primaryLabel.className = SECONDARY_CHAPTERS.length > 0
    ? 'toc-section-label toc-section-label-secondary'
    : 'toc-section-label';
  primaryLabel.textContent = TOC_PRIMARY_LABEL;
  toc.appendChild(primaryLabel);

  CHAPTERS.forEach((ch, idx) => {
    const a = document.createElement('a');
    a.className = 'toc-item';
    a.href = `#${ch.id}`;
    a.dataset.idx = idx;
    a.dataset.mode = 'primary';
    a.innerHTML = `<span class="toc-chapter-num">${ch.num}</span>${ch.title}`;
    a.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); });
    toc.appendChild(a);
  });
}

// ===== Build Welcome Cards =====
function buildWelcomeCards() {
  const el = document.getElementById('welcome-cards-placeholder');
  if (!el) return;
  el.innerHTML = WELCOME_CARDS.map(card => {
    const chapterLinks = card.chapters.map(ch =>
      `<a class="welcome-ch" href="#${ch.id}"><span class="welcome-ch-num">${ch.num}</span><span class="welcome-ch-title">${ch.title}</span></a>`
    ).join('');
    return `
      <div class="welcome-card welcome-card-${card.type}" onclick="(${card.onclick.toString()})()">
        <div class="welcome-card-header">
          <div class="welcome-card-icon">${card.icon}</div>
          <div class="welcome-card-title">${card.title}</div>
        </div>
        <div class="welcome-card-desc">${card.desc}</div>
        ${card.chapters.length ? `<div class="welcome-card-chapters">${chapterLinks}</div>` : ''}
      </div>`;
  }).join('');
}

// ===== Routing =====
function handleRoute() {
  const hash = window.location.hash.replace('#', '');
  if (!hash) { showWelcome(); return; }

  // 次要章节路由
  if (SECONDARY_CHAPTERS.length > 0) {
    const secIdx = SECONDARY_CHAPTERS.findIndex(ch => ch.id === hash);
    if (secIdx !== -1) { loadSecondaryChapter(secIdx); return; }
  }

  // 主线章节路由
  const idx = CHAPTERS.findIndex(ch => ch.id === hash);
  if (idx === -1) { showWelcome(); return; }
  loadChapter(idx);
}

// ===== Load Chapter (主线) =====
async function loadChapter(idx) {
  const ch = CHAPTERS[idx];
  currentChapterIndex   = idx;
  currentSecondaryIndex = -1;
  currentMode = 'primary';

  document.querySelectorAll('.toc-item[data-mode="primary"]').forEach((el, i) => el.classList.toggle('active', i === idx));
  document.querySelectorAll('.toc-item[data-mode="secondary"]').forEach(el => el.classList.remove('active'));
  scrollTocActive();

  document.getElementById('topbar-title').textContent = `${ch.num} ${ch.title}`;
  document.title = `${ch.num} ${ch.title} — ${BOOK_TITLE}`;
  updateFooterNav(idx, CHAPTERS, loadChapter);

  await transitionContent(async (contentInner) => {
    showLoadingSkeleton(contentInner, ch);
    const md = await fetchMarkdown(MD_BASE + ch.file);
    return md;
  });
}

// ===== Load Secondary Chapter (次要) =====
async function loadSecondaryChapter(idx) {
  const ch = SECONDARY_CHAPTERS[idx];
  currentSecondaryIndex = idx;
  currentChapterIndex   = -1;
  currentMode = 'secondary';

  document.querySelectorAll('.toc-item[data-mode="secondary"]').forEach((el, i) => el.classList.toggle('active', i === idx));
  document.querySelectorAll('.toc-item[data-mode="primary"]').forEach(el => el.classList.remove('active'));
  scrollTocActive();

  document.getElementById('topbar-title').textContent = `${ch.num} ${ch.title}`;
  document.title = `${ch.num} ${ch.title} — ${BOOK_TITLE}`;
  updateFooterNav(idx, SECONDARY_CHAPTERS, loadSecondaryChapter);

  await transitionContent(async (contentInner) => {
    showLoadingSkeleton(contentInner, ch);
    const md = await fetchMarkdown(SECONDARY_MD_BASE + ch.file);
    return md;
  });
}

// ===== 通用内容切换动画 =====
async function transitionContent(loader) {
  const contentInner = document.getElementById('content-inner');

  // Fade out
  contentInner.classList.add('content-leaving');
  await sleep(140);

  // Show skeleton
  window.scrollTo({ top: 0, behavior: 'instant' });
  const skeletonStart = Date.now();
  let md = null, fetchErr = null;

  try {
    md = await loader(contentInner);
  } catch (err) {
    fetchErr = err;
  }

  contentInner.classList.remove('content-leaving');
  contentInner.classList.add('content-entering');
  contentInner.addEventListener('animationend', () => contentInner.classList.remove('content-entering'), { once: true });

  // Skeleton 至少展示 300ms
  const elapsed = Date.now() - skeletonStart;
  if (elapsed < 300) await sleep(300 - elapsed);

  contentInner.classList.add('content-leaving');
  await sleep(120);

  if (fetchErr) {
    contentInner.innerHTML = `<div class="error-msg"><strong>加载失败</strong><br>${escapeHtml(fetchErr.message)}</div>`;
  } else {
    renderMarkdown(md, contentInner);
  }

  contentInner.classList.remove('content-leaving');
  contentInner.classList.add('content-entering');
  contentInner.addEventListener('animationend', () => contentInner.classList.remove('content-entering'), { once: true });
}

async function fetchMarkdown(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`);
  return resp.text();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
    </div>`;
}

// ===== Render Markdown =====
function setupMarked() {
  const renderer = new marked.Renderer();

  renderer.code = function(code, infostring) {
    const language = (infostring || '').match(/^\S*/)?.[0] || 'plaintext';
    if (language === 'mermaid') return `<div class="mermaid">${escapeHtml(code)}</div>`;

    let highlighted;
    try {
      highlighted = (language !== 'plaintext' && hljs.getLanguage(language))
        ? hljs.highlight(code, { language }).value
        : hljs.highlightAuto(code).value;
    } catch (e) { highlighted = escapeHtml(code); }

    const lines = splitHlLines(highlighted);
    if (lines[lines.length - 1] === '') lines.pop();
    const numbered = lines.map((line, i) =>
      `<span class="code-line"><span class="line-num">${i + 1}</span><span class="line-content">${line || ' '}</span></span>`
    ).join('\n');

    const langLabel = language !== 'plaintext' ? `<span class="code-lang-label">${escapeHtml(language)}</span>` : '';
    return `<pre class="code-block">${langLabel}<code class="hljs language-${escapeHtml(language)}">${numbered}</code></pre>`;
  };

  renderer.link = function(href, title, text) {
    // 章节内链：../chapters/chXX-xxx.md → #chXX
    const chapterMatch = href && href.match(/(?:\.\.\/)?chapters\/(ch\d+)-[^.]*\.md/);
    if (chapterMatch) {
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      return `<a href="#${chapterMatch[1]}"${titleAttr}>${text}</a>`;
    }
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener"${titleAttr}>${text}</a>`;
    }
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<a href="${escapeHtml(href || '')}"${titleAttr}>${text}</a>`;
  };

  renderer.codespan = function(code) {
    // 源码锚点：filename.ext#L数字
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
    securityLevel: 'strict',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  });
}

function renderMarkdown(md, container) {
  const rawHtml = marked.parse(md);
  const html = (typeof DOMPurify !== 'undefined')
    ? DOMPurify.sanitize(rawHtml, {
        ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'title',
                       'data-file', 'data-line', 'data-highlighted',
                       'target', 'rel', 'width', 'height', 'style'],
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
      })
    : rawHtml;
  container.innerHTML = `<div class="md-body">${html}</div>`;

  // 动态插入复制按钮（绕开 DOMPurify 白名单）
  container.querySelectorAll('pre.code-block').forEach(pre => {
    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.title = '复制代码';
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    btn.addEventListener('click', () => copyCodeBlock(btn));
    pre.insertBefore(btn, pre.firstChild);
  });

  // Mermaid
  const mermaidEls = Array.from(container.querySelectorAll('.mermaid'));
  if (mermaidEls.length > 0) {
    mermaidEls.forEach(el => { if (!el.dataset.mermaidSrc) el.dataset.mermaidSrc = el.textContent.trim(); });
    let rendered = 0;
    const observer = new MutationObserver(() => {
      rendered = mermaidEls.filter(el => el.querySelector('svg')).length;
      if (rendered === mermaidEls.length) { observer.disconnect(); requestAnimationFrame(() => setupMermaidLightbox(container)); }
    });
    observer.observe(container, { childList: true, subtree: true });
    mermaid.run({ nodes: mermaidEls }).catch(err => console.warn('Mermaid render error:', err));
    setTimeout(() => { observer.disconnect(); setupMermaidLightbox(container); }, 3000);
  }

  // 源码锚点（仅在配置了 REPO_RAW_BASE 时启用）
  if (REPO_RAW_BASE) setupAnchorTooltips(container);
}

// ===== Welcome =====
function showWelcome() {
  currentChapterIndex = -1;
  currentSecondaryIndex = -1;
  document.querySelectorAll('.toc-item').forEach(el => el.classList.remove('active'));
  document.getElementById('topbar-title').textContent = BOOK_TITLE;
  document.title = BOOK_TITLE;
  const contentInner = document.getElementById('content-inner');
  contentInner.classList.add('content-leaving');
  setTimeout(() => {
    // 重新渲染欢迎页（从 index.html 的静态 HTML 恢复）
    contentInner.innerHTML = document.querySelector('.welcome')?.outerHTML || `<div class="welcome"><h1>${BOOK_TITLE}</h1></div>`;
    // 重新填充卡片
    const placeholder = contentInner.querySelector('#welcome-cards-placeholder');
    if (placeholder) {
      const tmp = document.createElement('div');
      tmp.id = 'welcome-cards-placeholder';
      placeholder.replaceWith(tmp);
      buildWelcomeCards();
    }
    contentInner.classList.remove('content-leaving');
    contentInner.classList.add('content-entering');
    contentInner.addEventListener('animationend', () => contentInner.classList.remove('content-entering'), { once: true });
  }, 150);
  document.getElementById('prev-btn').style.display = 'none';
  document.getElementById('next-btn').style.display = 'none';
}

// ===== Footer Navigation =====
function updateFooterNav(idx, chapters, loadFn) {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  if (idx > 0) {
    prevBtn.style.display = 'block';
    prevBtn.textContent = `← ${chapters[idx - 1].num} ${chapters[idx - 1].title}`;
    prevBtn.onclick = () => loadFn(idx - 1);
  } else {
    prevBtn.style.display = 'none';
  }
  if (idx < chapters.length - 1) {
    nextBtn.style.display = 'block';
    nextBtn.textContent = `${chapters[idx + 1].num} ${chapters[idx + 1].title} →`;
    nextBtn.onclick = () => loadFn(idx + 1);
  } else {
    nextBtn.style.display = 'none';
  }
}

function navigatePrev() {
  if (currentMode === 'secondary') {
    if (currentSecondaryIndex > 0) window.location.hash = SECONDARY_CHAPTERS[currentSecondaryIndex - 1].id;
  } else {
    if (currentChapterIndex > 0) window.location.hash = CHAPTERS[currentChapterIndex - 1].id;
  }
}

function navigateNext() {
  if (currentMode === 'secondary') {
    if (currentSecondaryIndex < SECONDARY_CHAPTERS.length - 1) window.location.hash = SECONDARY_CHAPTERS[currentSecondaryIndex + 1].id;
  } else {
    if (currentChapterIndex < CHAPTERS.length - 1) window.location.hash = CHAPTERS[currentChapterIndex + 1].id;
  }
}

// ===== Mobile Sidebar =====
let _sidebarScrollTop = 0;

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const isOpening = !sidebar.classList.contains('open');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
  if (isOpening) {
    sidebar.scrollTop = _sidebarScrollTop;
    setTimeout(() => {
      const activeItem = sidebar.querySelector('.toc-item.active');
      if (activeItem) activeItem.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }, 260);
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  _sidebarScrollTop = sidebar.scrollTop;
  sidebar.classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) closeSidebar();
  }
});

function scrollTocActive() {
  if (window.innerWidth > 768) {
    const activeItem = document.querySelector('.toc-item.active');
    if (activeItem) activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
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

// ===== 源码锚点面板（可选功能）=====
// 仅在 REPO_RAW_BASE 非空时生效
const _fileCache = {};
const _hideTimers = new WeakMap();

function setupAnchorTooltips(container) {
  const anchors = container.querySelectorAll('code.code-anchor');
  if (!anchors.length) return;
  anchors.forEach(el => {
    el.addEventListener('mouseenter', () => { clearHideTimer(el); showAnchorPanel(el, el.dataset.file, parseInt(el.dataset.line)); });
    el.addEventListener('mouseleave', () => scheduleHide(el));
  });
  setupAnchorTouchTrigger(container);
}

function clearHideTimer(anchorEl) {
  const t = _hideTimers.get(anchorEl);
  if (t) { clearTimeout(t); _hideTimers.delete(anchorEl); }
}

function scheduleHide(anchorEl, delay = 220) {
  clearHideTimer(anchorEl);
  const t = setTimeout(() => {
    const panel = anchorEl._panel;
    if (panel && panel.matches(':hover')) return;
    closeAnchorPanel(anchorEl);
  }, delay);
  _hideTimers.set(anchorEl, t);
}

function closeAnchorPanel(anchorEl) {
  const panel = anchorEl._panel;
  if (panel) {
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
  const OFFSET_Y = 8, MARGIN = 12;
  const isMobile = window.innerWidth <= 768;
  const rect = anchorEl.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  if (isMobile) {
    const panelW = vw - MARGIN * 2;
    panel.style.width = `${panelW}px`; panel.style.left = `${MARGIN}px`;
    const panelH = panel.offsetHeight > 0 ? panel.offsetHeight : 260;
    let top = rect.bottom + OFFSET_Y;
    if (top + panelH > vh - MARGIN) top = Math.max(MARGIN, vh - panelH - MARGIN);
    panel.style.top = `${top}px`;
    return;
  }
  const PANEL_WIDTH = 520;
  let left = rect.left;
  if (left + PANEL_WIDTH > vw - MARGIN) left = Math.max(MARGIN, vw - PANEL_WIDTH - MARGIN);
  const panelH = panel.offsetHeight > 0 ? panel.offsetHeight : 360;
  const spaceBelow = vh - rect.bottom - OFFSET_Y, spaceAbove = rect.top - OFFSET_Y;
  let top;
  if (spaceBelow >= panelH || spaceBelow >= spaceAbove) {
    top = rect.bottom + OFFSET_Y;
    if (top + panelH > vh - MARGIN) top = Math.max(MARGIN, vh - panelH - MARGIN);
  } else {
    top = rect.top - OFFSET_Y - panelH;
    if (top < MARGIN) top = MARGIN;
  }
  panel.style.left = `${left}px`; panel.style.top = `${top}px`; panel.style.width = `${PANEL_WIDTH}px`;
}

function showAnchorPanel(anchorEl, file, line) {
  if (anchorEl._panel) return;
  anchorEl.classList.add('active');
  const panel = document.createElement('div');
  panel.className = 'anchor-panel';
  panel.dataset.file = file; panel.dataset.line = String(line);
  panel.innerHTML = buildPanelHTML(file, line);
  panel.addEventListener('mouseenter', () => clearHideTimer(anchorEl));
  panel.addEventListener('mouseleave', () => scheduleHide(anchorEl));
  document.body.appendChild(panel);
  anchorEl._panel = panel;
  positionPanel(panel, anchorEl);
  requestAnimationFrame(() => { if (anchorEl._panel === panel) positionPanel(panel, anchorEl); });
  const updatePos = () => { if (!anchorEl._panel) return; positionPanel(panel, anchorEl); };
  anchorEl._panelPositionHandler = updatePos;
  window.addEventListener('scroll', updatePos, { passive: true, capture: true });
  window.addEventListener('resize', updatePos, { passive: true });
  panel.querySelector('.ap-up').addEventListener('click', () => expandPanelUp(panel, anchorEl, file));
  panel.querySelector('.ap-down').addEventListener('click', () => expandPanelDown(panel, anchorEl, file));
  loadFileForPanel(panel, anchorEl, file, line);
}

function buildPanelHTML(file, line) {
  const githubUrl = REPO_BLOB_BASE ? `${REPO_BLOB_BASE}/${resolveFilePath(file)}#L${line}` : '#';
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
    </div>`;
}

function resolveFilePath(file) {
  if (file.includes('/')) return file;
  return FILE_PATH_MAP[file] || `src/${file}`;
}

async function loadFileForPanel(panel, anchorEl, file, line) {
  if (!REPO_RAW_BASE) return;
  const filePath = resolveFilePath(file);
  const rawUrl = `${REPO_RAW_BASE}/${filePath}`;
  let lines;
  try {
    if (!_fileCache[filePath]) {
      const resp = await fetch(rawUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      _fileCache[filePath] = (await resp.text()).split('\n');
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
    highlighted = (lang !== 'plaintext' && hljs.getLanguage(lang))
      ? hljs.highlight(snippet, { language: lang }).value
      : hljs.highlightAuto(snippet).value;
  } catch (e) { highlighted = escapeHtml(snippet); }
  const hlLines = splitHlLines(highlighted);
  const rows = hlLines.map((lineHtml, i) => {
    const lineNo = start + i;
    const isTarget = lineNo === centerLine;
    return `<span class="ap-line${isTarget ? ' ap-line-target' : ''}" data-line="${lineNo}"><span class="ap-lnum">${lineNo}</span><span class="ap-lcode">${lineHtml || ' '}</span></span>`;
  }).join('\n');
  const body = panel.querySelector('.ap-body');
  if (!body) return;
  body.classList.add('ap-body-fade');
  setTimeout(() => {
    body.className = 'ap-body';
    body.innerHTML = `<code class="hljs ap-code">${rows}</code>`;
    panel.dataset.start = String(start); panel.dataset.end = String(end);
    const fp = panel.querySelector('.ap-filepath');
    if (fp) fp.textContent = `${file}#L${centerLine}`;
    const gh = panel.querySelector('.ap-github');
    if (gh && REPO_BLOB_BASE) gh.href = `${REPO_BLOB_BASE}/${resolveFilePath(file)}#L${centerLine}`;
    const targetLine = body.querySelector('.ap-line-target');
    if (targetLine) setTimeout(() => targetLine.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
    if (anchorEl) requestAnimationFrame(() => { if (anchorEl._panel === panel) positionPanel(panel, anchorEl); });
  }, 150);
}

function expandPanelUp(panel, anchorEl, file) {
  const allLines = _fileCache[resolveFilePath(file)];
  if (!allLines) return;
  const curStart = parseInt(panel.dataset.start || '1');
  if (curStart <= 1) return;
  const newStart = Math.max(1, curStart - 5);
  appendPanelLines(panel, anchorEl, file, allLines, newStart, curStart - 1, 'prepend');
  panel.dataset.start = String(newStart);
}

function expandPanelDown(panel, anchorEl, file) {
  const allLines = _fileCache[resolveFilePath(file)];
  if (!allLines) return;
  const curEnd = parseInt(panel.dataset.end || '1');
  if (curEnd >= allLines.length) return;
  const newEnd = Math.min(allLines.length, curEnd + 5);
  appendPanelLines(panel, anchorEl, file, allLines, curEnd + 1, newEnd, 'append');
  panel.dataset.end = String(newEnd);
}

function appendPanelLines(panel, anchorEl, file, allLines, fromLine, toLine, mode) {
  const ext = file.split('.').pop();
  const langMap = { ts: 'typescript', js: 'javascript', tsx: 'typescript', jsx: 'javascript', py: 'python', go: 'go', rs: 'rust', java: 'java', md: 'markdown' };
  const lang = langMap[ext] || 'plaintext';
  const snippet = allLines.slice(fromLine - 1, toLine).join('\n');
  let highlighted;
  try {
    highlighted = (lang !== 'plaintext' && hljs.getLanguage(lang))
      ? hljs.highlight(snippet, { language: lang }).value
      : hljs.highlightAuto(snippet).value;
  } catch (e) { highlighted = escapeHtml(snippet); }
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
    const prevHeight = body.scrollHeight;
    newSpans.reverse().forEach(n => code.insertBefore(n, code.firstChild));
    const addedHeight = body.scrollHeight - prevHeight;
    body.scrollTop = addedHeight;
    setTimeout(() => body.scrollTo({ top: 0, behavior: 'smooth' }), 16);
  } else {
    newSpans.forEach(n => code.appendChild(n));
    setTimeout(() => {
      const last = code.querySelector('.ap-line:last-child');
      if (last) last.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 30);
  }
  if (anchorEl) requestAnimationFrame(() => { if (anchorEl._panel === panel) positionPanel(panel, anchorEl); });
}

function setupAnchorTouchTrigger(container) {
  if (window.innerWidth > 768) return;
  const anchors = container.querySelectorAll('code.code-anchor');
  anchors.forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el._panel) closeAnchorPanel(el);
      else showAnchorPanel(el, el.dataset.file, parseInt(el.dataset.line));
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('code.code-anchor').forEach(el => { if (el._panel) closeAnchorPanel(el); });
  }, { once: false, capture: true });
}

// ===== Mermaid Lightbox =====
function setupMermaidLightbox(container) {
  container.querySelectorAll('.mermaid').forEach(el => {
    if (el.dataset.lbBound) return;
    el.dataset.lbBound = '1';
    el.addEventListener('click', () => openMermaidLightbox(el));
  });
}

function openMermaidLightbox(el) {
  const svgEl = el.querySelector('svg');
  if (!svgEl) return;
  const svgClone = svgEl.cloneNode(true);
  svgClone.style.cssText = 'width:100%;height:auto;max-width:100%;display:block;';
  const lb = document.createElement('div');
  lb.className = 'mermaid-lightbox';
  lb.innerHTML = `
    <div class="mermaid-lightbox-backdrop"></div>
    <div class="mermaid-lightbox-content">
      <button class="mermaid-lightbox-close" title="关闭">✕</button>
      <div class="mermaid-lb-zoom"></div>
      <span class="mermaid-lb-hint">滚轮缩放 · 拖拽平移 · 双击重置</span>
      <span class="mermaid-lb-scale">100%</span>
    </div>`;
  lb.querySelector('.mermaid-lb-zoom').appendChild(svgClone);
  document.body.appendChild(lb);

  const blockPageZoom = (e) => e.preventDefault();
  document.addEventListener('wheel', blockPageZoom, { passive: false, capture: true });

  const zoomEl = lb.querySelector('.mermaid-lb-zoom');
  const scaleEl = lb.querySelector('.mermaid-lb-scale');
  let scale = 1, tx = 0, ty = 0;
  const MIN_SCALE = 0.5, MAX_SCALE = 8;
  let scaleTimer = null;
  const content = lb.querySelector('.mermaid-lightbox-content');

  function applyTransform() { zoomEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; }
  function showScale() {
    scaleEl.textContent = Math.round(scale * 100) + '%';
    scaleEl.classList.add('visible');
    clearTimeout(scaleTimer);
    scaleTimer = setTimeout(() => scaleEl.classList.remove('visible'), 1200);
  }
  function clampTranslate() {
    const cw = content.clientWidth, ch = content.clientHeight;
    const maxTx = Math.max(0, (cw * scale - cw) / 2);
    const maxTy = Math.max(0, (ch * scale - ch) / 2);
    tx = Math.max(-maxTx, Math.min(maxTx, tx));
    ty = Math.max(-maxTy, Math.min(maxTy, ty));
  }

  content.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * delta));
    const rect = content.getBoundingClientRect();
    const ox = e.clientX - rect.left - rect.width / 2;
    const oy = e.clientY - rect.top - rect.height / 2;
    tx = ox - (ox - tx) * (newScale / scale);
    ty = oy - (oy - ty) * (newScale / scale);
    scale = newScale; clampTranslate(); applyTransform(); showScale();
  }, { passive: false });

  content.addEventListener('dblclick', (e) => {
    if (e.target.closest('.mermaid-lightbox-close')) return;
    scale = 1; tx = 0; ty = 0;
    zoomEl.style.transition = 'transform 0.25s ease';
    applyTransform(); showScale();
    setTimeout(() => { zoomEl.style.transition = ''; }, 260);
  });

  let dragging = false, dragStartX = 0, dragStartY = 0, dragTx = 0, dragTy = 0;
  const onMouseMove = (e) => {
    if (!dragging) return;
    tx = dragTx + (e.clientX - dragStartX); ty = dragTy + (e.clientY - dragStartY);
    clampTranslate(); applyTransform();
  };
  const onMouseUp = () => { if (!dragging) return; dragging = false; content.classList.remove('lb-dragging'); };
  content.addEventListener('mousedown', (e) => {
    if (e.target.closest('.mermaid-lightbox-close')) return;
    dragging = true; dragStartX = e.clientX; dragStartY = e.clientY;
    dragTx = tx; dragTy = ty; content.classList.add('lb-dragging'); e.preventDefault();
  });
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  // 触摸：捏合缩放 + 单指拖拽
  let lastTouchDist = 0, lastTouchMidX = 0, lastTouchMidY = 0;
  let touchDragging = false, touchStartX = 0, touchStartY = 0, touchTx = 0, touchTy = 0;
  content.addEventListener('touchstart', (e) => {
    if (e.target.closest('.mermaid-lightbox-close')) return;
    if (e.touches.length === 2) {
      const t0 = e.touches[0], t1 = e.touches[1];
      lastTouchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      lastTouchMidX = (t0.clientX + t1.clientX) / 2; lastTouchMidY = (t0.clientY + t1.clientY) / 2;
      touchDragging = false;
    } else if (e.touches.length === 1) {
      touchDragging = true; touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
      touchTx = tx; touchTy = ty;
    }
  }, { passive: true });
  content.addEventListener('touchmove', (e) => {
    if (e.target.closest('.mermaid-lightbox-close')) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midX = (t0.clientX + t1.clientX) / 2, midY = (t0.clientY + t1.clientY) / 2;
      const rect = content.getBoundingClientRect();
      const ox = midX - rect.left - rect.width / 2, oy = midY - rect.top - rect.height / 2;
      const ratio = dist / lastTouchDist;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * ratio));
      tx = ox - (ox - tx) * (newScale / scale) + (midX - lastTouchMidX);
      ty = oy - (oy - ty) * (newScale / scale) + (midY - lastTouchMidY);
      scale = newScale; lastTouchDist = dist; lastTouchMidX = midX; lastTouchMidY = midY;
      clampTranslate(); applyTransform(); showScale();
    } else if (e.touches.length === 1 && touchDragging) {
      tx = touchTx + (e.touches[0].clientX - touchStartX);
      ty = touchTy + (e.touches[0].clientY - touchStartY);
      clampTranslate(); applyTransform();
    }
  }, { passive: false });
  content.addEventListener('touchend', () => { touchDragging = false; });

  const closeFn = () => {
    document.removeEventListener('wheel', blockPageZoom, { capture: true });
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    lb.classList.add('lb-closing');
    setTimeout(() => lb.remove(), 200);
  };
  lb.querySelector('.mermaid-lightbox-close').addEventListener('click', closeFn);
  lb.querySelector('.mermaid-lightbox-backdrop').addEventListener('click', closeFn);
  const onKey = (e) => { if (e.key === 'Escape') { closeFn(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
}

// ===== Utility =====
function splitHlLines(highlighted) {
  const lines = highlighted.split('\n');
  const result = [];
  let openSpans = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const prefix = openSpans.join('');
    const tagRe = /<span([^>]*)>|<\/span>/g;
    let m;
    while ((m = tagRe.exec(line)) !== null) {
      if (m[0].startsWith('</span>')) openSpans.pop();
      else openSpans.push('<span' + m[1] + '>');
    }
    const suffix = openSpans.map(() => '</span>').join('');
    result.push(prefix + line + suffix);
  }
  return result;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
