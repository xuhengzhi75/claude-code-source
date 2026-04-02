---
name: source-to-blog
description: >
  基于源码仓库的书稿，快速搭建一个在线博客并部署到 GitHub Pages 的完整工作流 Skill。
  适用场景：已有 Markdown 格式的书稿章节，需要搭建在线阅读博客、配置自动部署、
  实现源码锚点功能、支持多主题切换。
  触发词：搭建博客、在线阅读、GitHub Pages 部署、博客发布、章节在线化。
---

# source-to-blog

这个 Skill 把"把 Markdown 书稿变成在线博客"这件事标准化，从零到 GitHub Pages 部署，含踩坑规避。

## 核心设计原则

1. **章节内容单一来源**：博客章节从书稿目录复制生成，不维护两份内容
2. **构建产物不入 git**：`blog/chapters/` 是构建产物，通过 CI 动态生成
3. **纯静态，无构建依赖**：不引入 Node.js 构建链，降低维护成本
4. **push 自动部署**：push 到 main 分支自动触发 GitHub Pages 部署

## 工作流

详见 `references/setup-workflow.md`。

## 技术选型

详见 `references/tech-stack.md`。

## 踩坑规避

详见 `references/pitfalls.md`。

## 功能实现参考

详见 `references/features.md`。

## 多 Agent 协作背景

这个 Skill 通常在多 Agent 协作项目里使用。多 Agent 通过 Git 仓库 inbox 文件异步通信的完整机制，详见：
- `docs/book-workspace/workflow/multi-agent-git-collab.md`（内部详细版）
- `blog/articles/multi-agent-git-collab.md`（对外分享版）

## 参考资料读取顺序

1. `references/setup-workflow.md`（搭建流程）
2. `references/tech-stack.md`（技术选型）
3. `references/pitfalls.md`（踩坑规避）
4. `references/features.md`（功能实现）
