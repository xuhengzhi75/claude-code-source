# Blog Rendering Hardening Plan

## 背景
当前 blog 渲染链为：

```text
markdown -> marked.parse(md) -> innerHTML
```

风险点：
- `marked.parse(md)` 输出直接进入 DOM
- 未见显式 sanitizer
- Mermaid 当前使用 `securityLevel: 'loose'`

## 目标
以最低破坏成本，把 blog 渲染链从“高信任输入”推进到“受控信任输入 + 明确清洗边界”。

## 优先级 P1

### 1. 在 markdown 渲染链中引入 sanitizer
推荐方案：DOMPurify

落点：
- `blog/index.html`：引入 DOMPurify
- `blog/app.js`：在 `marked.parse(md)` 与 `container.innerHTML` 之间加入 `DOMPurify.sanitize`

目标效果：
- 普通 markdown 正常渲染
- 原始 HTML / 事件属性 / 恶意注入被清洗或限制

### 2. 评估 Mermaid 安全级别
落点：
- `blog/app.js`

动作：
- 盘点现有图表是否依赖 `securityLevel: 'loose'`
- 若无必要，改严
- 若必须保留，补安全说明与使用边界

## 优先级 P2

### 3. 盘点 CDN 依赖的本地 vendoring 方案
对象：
- marked
- highlight.js
- mermaid
- （可选）DOMPurify

目标：
- 降低供应链风险
- 降低外部依赖波动导致的公开页面故障

### 4. 若暂不 vendoring，至少补 SRI
适用对象：
- 外部 script
- 外部样式依赖（如果继续保留）

## 不建议直接做的事
- 直接大改 blog 前端结构
- 在没有验证现有章节表现的情况下强行切换 Mermaid 行为
- 一次性同时替换所有外部依赖并改渲染逻辑

## 推荐执行顺序
1. 先引入 sanitizer
2. 再评估 Mermaid `securityLevel`
3. 再做 vendoring / SRI
4. 最后补更严格的发布前校验
