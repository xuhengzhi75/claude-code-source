# Blog Dependency Security

这份文档记录 blog 前端依赖的当前安全边界、已知风险和后续加固方向。

## 当前外部依赖

### JavaScript CDN
- `marked@9.1.6` via jsDelivr
- `highlight.js@11.9.0` via cdnjs
- `mermaid@10.6.1` via jsDelivr

### 字体 CDN
- Google Fonts (`Lora`, `JetBrains Mono`)

## 当前风险判断

### 1. 供应链风险
当前 blog 直接执行外部 CDN 脚本，尚未本地 vendoring，也未配置 SRI（Subresource Integrity）。

影响：
- 若 CDN 资源被污染，blog 将直接执行外部脚本
- 若依赖版本漂移或兼容性变化，页面可能失效

### 2. 公开表面风险
blog 是公开阅读入口，不应承载工作区资料或私有协作内容。

已补的治理：
- README 已明确 blog 是公开表面
- deploy workflow 已增加 public-surface validation
- `blog/` 下禁止混入 `inbox/`、`status/`、`workflow/`、`excavation-tasks/`、`skills/`

## 当前推荐策略

### 短期（已执行 / 低成本）
- 保持手动发布
- 在 deploy workflow 中校验公开面边界
- 在 README 中明确 blog 不是生产资料目录

### 中期（优先级高）
1. 将 CDN JS 依赖 vendoring 到本地静态文件
2. 若暂不 vendoring，至少补 SRI + `crossorigin`
3. 明确 markdown 渲染信任边界，必要时加入 sanitization

## Markdown 渲染链当前风险

当前 `blog/app.js` 的核心链路是：

```text
markdown -> marked.parse(md) -> container.innerHTML
```

并且当前未见显式 sanitizer（如 DOMPurify），因此默认前提是：
- 章节 markdown 来自可信协作者
- 不包含恶意 HTML / 事件属性 / 注入内容

这在受控协作下可暂时接受，但不适合把内容源扩展为更低信任输入。

## 建议修复路线（A1-2）

### 路线 1：引入 DOMPurify（推荐）
目标：
- 保留当前 markdown 渲染能力
- 在 `marked.parse(md)` 与 `innerHTML` 之间增加 HTML 清洗层

理想链路：

```text
markdown -> marked.parse(md) -> DOMPurify.sanitize(...) -> container.innerHTML
```

建议优先级：
1. 优先本地 vendoring DOMPurify
2. 若短期仍需 CDN，引入时同时加 SRI + `crossorigin`

### 路线 2：重新评估 Mermaid `securityLevel: 'loose'`
当前 `blog/app.js` 中 Mermaid 初始化使用：
- `securityLevel: 'loose'`

建议：
- 先确认是否真的依赖 `loose` 才能正常渲染现有图表
- 如果不是强依赖，优先收紧安全级别
- 如果必须保留 `loose`，至少要在文档中显式说明原因与风险

### 路线 3：把 markdown 输入边界制度化
建议在仓库协作文档中默认采用这条规则：
- blog 章节 markdown 目前按“受信任协作者输入”处理
- 一旦内容来源扩大（外部投稿、自动同步、低审校输入），必须先补 sanitizer 再继续放大公开面

### 长期（可选）
1. 增加 CSP（Content-Security-Policy）
2. 建立更完整的静态资源校验
3. 将 blog 前端依赖纳入固定升级流程

## 最低执行原则

在完成本地 vendoring 或 SRI 之前：
- 不要继续无节制增加新的外部脚本来源
- 新增外部依赖必须记录来源、版本、用途
- blog 发布前默认视为“公开面变更”，需要额外审视
