# 博客搭建流程

## 前置条件

- 已有 `docs/book/chapters/*.md` 格式的章节文件
- 仓库托管在 GitHub
- 已开启 GitHub Pages（Settings → Pages → Source: GitHub Actions）

---

## Step 1：创建博客目录结构

```
blog/
├── index.html          # 单页应用入口
├── app.js              # 核心逻辑
├── style.css           # 基础样式（可选多主题）
├── build.sh            # 本地构建脚本
├── dev.sh              # 本地开发脚本
├── _config.yml         # GitHub Pages 配置
└── .nojekyll           # 禁用 Jekyll 处理（必须）
```

**注意**：`blog/chapters/` 是构建产物，不创建，不入 git。

---

## Step 2：配置 .gitignore

在项目根目录的 `.gitignore` 里添加：

```
blog/chapters/
```

---

## Step 3：创建构建脚本

`blog/build.sh`：

```bash
#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="$ROOT_DIR/docs/book/chapters"
DEST_DIR="$SCRIPT_DIR/chapters"

echo "📖 构建中..."
mkdir -p "$DEST_DIR"

COUNT=0
for f in "$SRC_DIR"/*.md; do
  [ -f "$f" ] || continue
  cp "$f" "$DEST_DIR/"
  COUNT=$((COUNT + 1))
done

echo "✅ 已复制 $COUNT 个章节文件"
```

---

## Step 4：创建 GitHub Actions 工作流

`.github/workflows/deploy-blog.yml`：

```yaml
name: Deploy Blog to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Build — copy chapters into blog/
        run: |
          mkdir -p blog/chapters
          cp docs/book/chapters/*.md blog/chapters/
          echo "✅ Copied $(ls blog/chapters/*.md | wc -l) chapter files"

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: blog/

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**重要**：不要在 `on.push` 里加 `paths` 过滤，否则某些只改了 `docs/` 的提交不会触发部署。

---

## Step 5：创建 .nojekyll 文件

```bash
touch blog/.nojekyll
```

这个文件告诉 GitHub Pages 不要用 Jekyll 处理仓库内容，避免 `_` 开头的文件夹被过滤。

---

## Step 6：创建 index.html

基本结构：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>书名</title>
  <link rel="stylesheet" href="style.css">
  <!-- Markdown 渲染 -->
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <!-- 代码高亮 -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <!-- Mermaid 图表（可选） -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
</head>
<body>
  <div id="sidebar"><!-- 章节列表 --></div>
  <div id="content"><!-- 章节内容 --></div>
  <script src="app.js"></script>
</body>
</html>
```

---

## Step 7：验证部署

1. push 到 main 分支
2. 在 GitHub 仓库的 Actions 页面查看部署状态
3. 部署成功后访问 `https://[用户名].github.io/[仓库名]/`

---

## 本地开发

```bash
bash blog/build.sh   # 复制章节文件
bash blog/dev.sh     # 启动本地服务器（需要 Python 或 Node.js）
```

`blog/dev.sh` 示例：

```bash
#!/usr/bin/env bash
cd "$(dirname "${BASH_SOURCE[0]}")"
bash build.sh
python3 -m http.server 8080
```
