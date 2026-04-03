# meta/

这个目录沉淀的是**关于这个项目本身的方法论**——不是书的内容，而是"如何做出这本书"的经验。

面向两类读者：
- 想复刻这套工作流的人（看 `skills/`）
- 想理解这套方法论背后决策的人（看 `articles/`）

## 目录结构

```
meta/
├── articles/                          # 经验分享文章，可直接发布为博客文章
│   ├── 01-how-to-build-a-book-from-source.md     # 源码 → 书稿的完整工作流
│   ├── 02-how-to-build-a-blog-from-source.md     # 源码 → 在线博客的搭建经验
│   ├── 03-multi-agent-collaboration-spec.md       # 多 Agent 协作规范与踩坑
│   ├── 04-excavation-task-system.md               # 挖掘任务卡体系：薄弱章节 → verified 证据
│   └── tech-writing-methodology.md                # 技术写作方法论：论点树 + Feynman+Kernighan
└── skills/                            # 可复刻的 CatDesk/Claude Code Skill
    ├── source-analysis-to-book/       # 源码分析成书 Skill（主 Skill）
    │   ├── SKILL.md
    │   └── references/
    ├── source-to-blog/                # 源码博客搭建 Skill
    │   ├── SKILL.md
    │   └── references/
    └── tech-writing-coach/            # 技术写作教练 Skill
        ├── SKILL.md
        └── examples/
```

## 这里不放什么

- 书的章节正文 → `docs/book/chapters/`
- 写书工作区材料 → `docs/book-workspace/`
- 博客前端代码 → `blog/`

## 快速入口

| 目标 | 入口 |
|------|------|
| 了解整套源码成书方法论 | `articles/01-how-to-build-a-book-from-source.md` |
| 了解博客搭建经验 | `articles/02-how-to-build-a-blog-from-source.md` |
| 了解多 Agent 协作规范 | `articles/03-multi-agent-collaboration-spec.md` |
| 了解挖掘任务卡体系 | `articles/04-excavation-task-system.md` |
| 了解技术写作方法论 | `articles/tech-writing-methodology.md` |
| 直接使用源码成书 Skill | `skills/source-analysis-to-book/SKILL.md` |
| 直接使用博客搭建 Skill | `skills/source-to-blog/SKILL.md` |
| 直接使用写作教练 Skill | `skills/tech-writing-coach/SKILL.md` |

## 这套方法论的演进脉络

这个仓库经历了三个阶段，每个阶段都沉淀了新的方法论：

**阶段一（初始）**：单 Agent 扫描仓库 → 直接写章节。问题：章节质量不稳定，上下文容易丢失。

**阶段二（协作化）**：三方分工（源码分析 / 写作 / 验收），通过 git 仓库异步协作，建立 inbox 通信层和 excavation 挖掘任务卡体系。问题：写作风格不统一，AI 味重。

**阶段三（风格化）**：引入 Feynman+Kernighan 写作风格，建立论点树前置流程，全章按新标准重写。同时把方法论抽成可复用 Skill。

每个阶段的经验都沉淀在对应的 articles 里。
