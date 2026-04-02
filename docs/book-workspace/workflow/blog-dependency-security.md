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

### 长期（可选）
1. 增加 CSP（Content-Security-Policy）
2. 建立更完整的静态资源校验
3. 将 blog 前端依赖纳入固定升级流程

## 最低执行原则

在完成本地 vendoring 或 SRI 之前：
- 不要继续无节制增加新的外部脚本来源
- 新增外部依赖必须记录来源、版本、用途
- blog 发布前默认视为“公开面变更”，需要额外审视
