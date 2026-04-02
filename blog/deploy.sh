#!/usr/bin/env bash
# =============================================================
# blog/deploy.sh — GitHub Pages 部署脚本
#
# 用途：构建 → 将 blog/chapters/ 临时加入 git → push → 清理
#
# GitHub Pages 设置：
#   Settings → Pages → Source: Deploy from branch
#   Branch: main  /  Folder: /blog
#
# 使用方式：
#   bash blog/deploy.sh
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

echo "🚀 Claude Code Blog — 部署到 GitHub Pages"
echo ""

# Step 1: 确保工作区干净（未提交的变更先提示）
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "⚠️  检测到未提交的变更，请先 commit 后再部署："
  git status --short
  exit 1
fi

# Step 2: 构建（同步 md 文件到 blog/chapters/）
echo "🔨 Step 1/4  构建章节文件..."
bash "$SCRIPT_DIR/build.sh"
echo ""

# Step 3: 临时将 blog/chapters/ 加入 git（覆盖 .gitignore）
echo "📦 Step 2/4  暂存构建产物..."
git add -f blog/chapters/
CHAPTER_COUNT=$(git diff --cached --name-only | grep "^blog/chapters/" | wc -l | tr -d ' ')
echo "   已暂存 $CHAPTER_COUNT 个章节文件"
echo ""

# Step 4: 提交
echo "💾 Step 3/4  提交..."
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
git commit -m "deploy(blog): 更新章节内容 $TIMESTAMP"
echo ""

# Step 5: Push
echo "☁️  Step 4/4  推送到 GitHub..."
git push origin main
echo ""

# Step 6: 清理 — 将 blog/chapters/ 从 git 追踪中移除（保留本地文件）
echo "🧹 清理 git 追踪（保留本地文件）..."
git rm -r --cached blog/chapters/ > /dev/null 2>&1 || true
git commit -m "chore(blog): 移除构建产物追踪（chapters/ 由 build.sh 生成）" --allow-empty
git push origin main
echo ""

echo "✅ 部署完成！"
echo ""
echo "   GitHub Pages 地址（需在仓库 Settings → Pages 中配置）："
REPO_URL=$(git remote get-url origin | sed 's/\.git$//' | sed 's/https:\/\/github\.com\///')
echo "   https://$(echo $REPO_URL | cut -d'/' -f1).github.io/$(echo $REPO_URL | cut -d'/' -f2)/blog/"
echo ""
echo "   注意：GitHub Pages 首次部署需等待约 1-2 分钟生效。"
