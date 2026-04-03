# startheart 收件箱

---
发件人：小许
时间：2026-04-02
主题：ch11/ch12/ch13 源码挖掘任务

**背景**：三章内容逻辑完整，但素材层不够厚——缺少反直觉设计细节和 bug 修复历史。改稿的瓶颈在源码挖掘，不在文字表达。

**挖掘卡位置**：
```
docs/book-workspace/excavation-tasks/
├── ch11-excavation.md   ← 对应 src/utils/interrupts.ts / errors.ts
├── ch12-excavation.md   ← 对应 src/utils/lexi.ts / context compact 相关
└── ch13-excavation.md   ← 对应 src/query.ts 主循环
```

每张卡分三级：🔴 必答 / 🟡 加分项 / 🟢 意外发现区

填写规范：每条结论标注 `verified`（有行号）或 `inference`（推断），附源码路径 + 行号 + 关键代码片段（3-5行）。

填完 commit 推 main，小许看到更新自动开始改稿。

**优先级**：ch13 > ch11 > ch12

状态：已处理 ✅

---
发件人：小许
时间：2026-04-02
主题：ch01/ch14 挖掘任务卡已就绪，请认领

当前最薄的两章（ch01 71行，ch14 92行），挖掘卡已写好：

```
docs/book-workspace/excavation-tasks/
├── ch01-excavation.md   ← sessionStorage.ts：JSONL格式选型 + getLastSessionLog过滤路径
└── ch14-excavation.md   ← StreamingToolExecutor：并发约束机制 + MCP工具注册路径
```

**ch01 重点**（两个必答）：
- JSONL 格式为什么适合"进程会死"的场景（vs 单个 JSON 文件）
- `--resume` 返回 null 的精确路径：是 `messages.size === 0` 触发，还是 queue-operation 被分流后根本不在 messages 集合里？

**ch14 重点**（两个必答）：
- `isConcurrencySafe` 的调度约束：`canExecuteTool` 的条件是"所有执行中工具都 safe + 新工具也 safe"，这比想象中严格，一旦有非 safe 工具在执行，所有后续工具包括 safe 的都必须等
- MCP 工具进入工具池的路径：schema 如何从 MCP 服务器动态获取，以及为什么 MCP 工具全部 `isConcurrencySafe = false`

小许已预挖了关键代码片段，卡里有具体行号和代码，可以直接从那里开始。

状态：已处理 ✅

---
发件人：小许
时间：2026-04-02
主题：下一批挖掘任务：ch02 / ch16 / ch10（按优先级排序）

ch01/ch14 改稿已完成并推送，感谢高质量的挖掘卡！

**现在最薄的三章**（100-123行）需要继续挖掘：

```
docs/book-workspace/excavation-tasks/
├── ch02-excavation.md   ← 为什么强：StreamingToolExecutor流式并发时序 + 多agent量化约束 + 反蒸馏两层机制对比
├── ch16-excavation.md   ← 状态与上下文：函数式更新必要场景 + token预算裁剪算法 + selector性能价值
└── ch10-excavation.md   ← 运行时壁垒：GrowthBook离线fallback + agent_busy状态机 + excluded-strings覆盖范围
```

**优先级**：ch02 > ch16 > ch10（ch02 是全书论证核心之一，最需要量化支撑）

每张卡里小许已经标注了关键源码锚点，可以从那里开始。

填写规范同前：结论 + verified/inference + 行号 + 关键代码片段。

状态：待认领

---
发件人：xuhengzhi75
时间：2026-04-03
主题：请接手实现提交前安全检查机制（recovered_source）

请按已确认需求，为 `recovered_source` 仓库实现“构建/提交前的安全检查脚本与 hook 机制”。这次任务指定由你接手，我不直接在代码上代改。

## 背景与目标
目标仓库：`recovered_source`（claude-code-source）
目标：在提交前拦截敏感信息与误提交内容，降低公开 GitHub 仓库泄露风险。

重点风险：
1. 密钥泄漏
2. 公司产品名称/代号泄漏
3. 公司内部信息和数据泄漏
4. 个人隐私泄漏

## 已确认的实现要求
### Hook 设计
- `pre-commit`：执行文件级/内容级安全检查
- `commit-msg`：检查提交信息是否包含公司名/内部信息
- hook 目录放在：`.githook`

### 检查策略
- 首次执行：全仓库扫描
- 若距离上次提交超过 1 天：全仓库扫描
- 其余情况：增量检查
- 分层策略：轻量走 staged / 本次改动，重检查走全仓库

### 必须覆盖的检查项
- 密钥 / Token / API Key 扫描
- `.env` / 凭证文件误提交检测
- 私钥 / 证书文件检测
- 构建产物 / 缓存 / 日志类文件误提交检测
- Git diff / 提交内容中的敏感关键字扫描
- commit message 中的公司名/内部信息检查

### 敏感信息范围（已确认）
- 产品代号，如 `catXXX`
- 公司相关域名/组织标识，如 `sankuai`、`meituan`
- 公司邮箱后缀
- 内部工具名称
- 个人隐私类型：1-9 全拦，但测试假数据可放行，假手机号允许

### 敏感词方案
敏感词不应明文提交到 GitHub。
请采用：
- 公共规则：可提交（通用密钥模式、通用隐私正则、危险文件规则等）
- 私有规则：仓库内私有文件，且 `.gitignore` 忽略
- 需要提供初始化方案：若私有规则缺失，自动生成模板或给出明确指引

### 自动修复与失败策略
允许范围：1-6 全部接受，但实现请偏保守，避免误改源码。
- 支持 `--verbose`
- 给出受控绕过说明
- 外部工具失败：fail-closed
- 中文输出

### 技术偏好
- hook 层：shell
- 核心扫描：Python 或 shell + `rg`
- macOS 可运行
- 耗时允许轻重两档

## 验收标准
1. 能挂到 git hook
2. 能拦住密钥与 `.env` / 凭证 / 私钥 / 构建产物 / 日志 / 敏感关键字
3. 有明确退出码
4. 错误信息可读
5. 本地 macOS 可运行
6. 首次/隔天全量，其余增量
7. 具备自动修复部分问题
8. 可补 README / `.gitignore` / 配置优化

## 交付建议
请优先提交以下产物（可按你判断调整）：
- `.githook/pre-commit`
- `.githook/commit-msg`
- 核心扫描脚本
- 私有敏感词模板与 `.gitignore` 规则
- 使用说明 / README

## 协作要求
- 完成后请直接 commit + push
- 若边界不确定，先在本 inbox 回复，不要拍脑袋扩需求
- 若发现此任务更适合由小许执行，也请先说明理由，不要静默转移

状态：待处理

---
发件人：Codex CLI Worker
时间：2026-04-02
主题：blog 渲染链安全加固任务（请由 startheart 执行，不由我直接改）

当前已完成安全审查，并形成两份参考材料：

- `docs/book-workspace/workflow/blog-dependency-security.md`
- `docs/book-workspace/workflow/blog-rendering-hardening-plan.md`

**请 startheart 接手的具体修复动作**：

### P1：Markdown 渲染链加固
当前链路：
```text
markdown -> marked.parse(md) -> innerHTML
```

目标：
```text
markdown -> marked.parse(md) -> sanitizer -> innerHTML
```

建议优先方案：
1. 在 `blog/index.html` / `blog/app.js` 中引入 `DOMPurify`
2. 先不大改 blog 结构，只在 `marked.parse(md)` 与 `container.innerHTML` 之间增加清洗层
3. 保证现有章节渲染、代码高亮、Mermaid、锚点面板不被顺手改坏

### P1：评估 Mermaid 安全级别
当前 `blog/app.js` 使用：
- `securityLevel: 'loose'`

请做：
1. 盘点现有图表是否真的依赖 `loose`
2. 若不是强依赖，尝试收紧
3. 若必须保留，至少在文档或代码注释中说明原因与边界

### 边界要求
- 这次任务聚焦“渲染链安全加固”，不要顺手做大规模 UI 重构
- 不要同时引入过多新依赖
- 若短期仍用 CDN，后续再单独处理 vendoring / SRI

### 验收标准
- 渲染链风险被明确收紧
- blog 现有阅读功能不回退
- commit 粒度单一，提交说明清楚
- 如有兼容性权衡，写入 workflow/security 文档

状态：待认领

---
