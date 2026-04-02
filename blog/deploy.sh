#!/usr/bin/env bash
# =============================================================
# blog/deploy.sh — GitHub Pages 部署脚本
#
# 部署方式：GitHub Actions（.github/workflows/deploy-blog.yml）
# 只需 push 到 main 分支，Actions 自动构建并发布 blog/ 目录。
#
# 使用方式：
#   bash blog/deploy.sh        # 从项目根目录执行
# =============================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🚀 Claude Code Blog — 推送触发 GitHub Actions 部署"
echo ""

# 检查是否有未提交的变更
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "⚠️  检测到未提交的变更，请先 commit："
  git status --short
  exit 1
fi

# Push 到 main，触发 Actions workflow
echo "☁️  推送到 GitHub，触发自动部署..."
git push origin main

echo ""
echo "✅ 推送完成！GitHub Actions 正在构建..."
echo ""

REPO_URL=$(git remote get-url origin | sed 's/\.git$//' | sed 's/https:\/\/github\.com\///')
OWNER=$(echo "$REPO_URL" | cut -d'/' -f1)
REPO=$(echo "$REPO_URL" | cut -d'/' -f2)

echo "   查看部署进度：https://github.com/$OWNER/$REPO/actions"
echo "   部署完成后访问：https://$OWNER.github.io/$REPO/"
echo ""
echo "   ⏱  通常 1-2 分钟内生效"
