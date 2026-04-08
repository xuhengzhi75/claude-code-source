# 工作区目录结构规范

## 推荐目录结构

对任何"源码分析成书"项目，统一使用：

```
project/
├── docs/
│   ├── book/
│   │   ├── README.md                    # 读者入口（面向读者）
│   │   ├── chapters/                    # 技术版章节正文
│   │   │   ├── ch01-*.md
│   │   │   └── ...
│   │   └── easy-chapters/               # 通俗版文章（面向非技术读者）
│   │       ├── README.md                # 通俗版目录（含与技术版对应关系）
│   │       └── *.md
│   └── book-workspace/                  # 写书工作区（不面向读者）
│       ├── README.md                    # 工作区入口（按任务组织）
│       ├── planning/
│       │   ├── project-status.md        # 总状态（最重要）
│       │   ├── roadmap.md               # 阶段规划
│       │   └── completed-coverage-and-writing-queue.md
│       ├── architecture-notes/          # 主题深读笔记
│       │   ├── README.md
│       │   └── *.md
│       ├── references/
│       │   ├── chapter-evidence-map.md  # 章节证据映射
│       │   ├── code-annotation-roadmap.md
│       │   ├── analysis-handoff-template.md
│       │   └── conversation-log.md      # 关键决策记录
│       ├── methodology/
│       │   ├── writing-guide.md         # 写作规则统一入口
│       │   ├── writing-principles.md    # 完整验收标准
│       │   └── structure-principles.md  # 目录结构原则
│       ├── status/
│       │   ├── status-index.md          # 状态索引
│       │   └── status-YYYY-MM-DD.md     # 阶段快照
│       ├── workflow/
│       │   ├── collaboration-guide.md   # 协作说明
│       │   └── commit-conventions.md    # 提交规范
│       ├── excavation-tasks/            # 挖掘任务卡（可选）
│       │   ├── README.md
│       │   └── ch**-excavation.md
│       └── skills/                      # 可复用 skill 草案
├── blog/                                # 在线博客（可选）
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   ├── build.sh
│   ├── .nojekyll
│   └── chapters/                        # 构建产物，不入 git
├── .github/
│   └── workflows/
│       └── deploy-blog.yml              # CI 自动部署
├── scripts/
│   └── hooks/
│       ├── install.sh
│       └── pre-commit                   # 安全检查 hook
└── COMMIT-CONVENTIONS.md                # 仓库级提交规范
```

## 关键设计原则

### 1. 书本体与工作区严格分离

- `docs/book/`：面向读者，只放章节正文
- `docs/book-workspace/`：面向写作者和 Agent，放所有生产资料

读者只需要看 `docs/book/`，写作者和 Agent 在 `docs/book-workspace/` 里工作。

### 2. 博客章节不入 git

`blog/chapters/` 和 `blog/easy-chapters/` 都是构建产物，通过 `build.sh` 从 `docs/book/` 对应目录复制生成。不要把构建产物提交到 git。

在 `.gitignore` 里添加：
```
blog/chapters/
blog/easy-chapters/
```

### 3. 状态文档分层

- **规范层（How）**：方法、模板、原则、要求（`methodology/`）
- **状态层（Now）**：当前进度、阶段结论、过程记录（`planning/`、`status/`）
- **内容层（What）**：真正进入书稿与证据内容（`chapters/`、`architecture-notes/`）

约束：状态文件不承载长期规范；规范文件不记录临时进度。

### 4. 工作区入口按任务组织

`book-workspace/README.md` 按任务场景组织入口，而不是按目录结构：

```markdown
## 推荐最小入口（按任务）

### 1) 继续写章节
1. planning/project-status.md
2. planning/completed-coverage-and-writing-queue.md
3. methodology/writing-principles.md

### 2) 做源码分析
1. references/code-annotation-roadmap.md
2. references/chapter-evidence-map.md
3. architecture-notes/

### 3) 恢复上下文
1. planning/project-status.md
2. status/status-index.md
3. references/conversation-log.md
```

### 5. 安全规则

- 真实姓名不入仓库，用 GitHub 用户名或代号代替
- 内部账号、邮箱、API Key 不入仓库
- 用 pre-commit hook 自动检测，检测规则存本地配置文件（不入仓库）
