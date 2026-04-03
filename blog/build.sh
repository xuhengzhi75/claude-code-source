#!/usr/bin/env bash
# =============================================================
# blog/build.sh — 构建脚本
#
# 用途：将 docs/book/chapters/ 下的 Markdown 文件复制到
#       blog/chapters/，使博客在本地和 GitHub Pages 上
#       都能用相同的相对路径 ./chapters/*.md 加载文章。
#
# 使用方式：
#   bash blog/build.sh          # 从项目根目录执行
#   cd blog && bash build.sh    # 从 blog 目录执行
# =============================================================

set -e

# 定位项目根目录（无论从哪里执行都能找到）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="$ROOT_DIR/docs/book/chapters"
DEST_DIR="$SCRIPT_DIR/chapters"

echo "📖 Claude Code Blog — 构建中..."
echo "   源目录: $SRC_DIR"
echo "   目标目录: $DEST_DIR"

# 检查源目录
if [ ! -d "$SRC_DIR" ]; then
  echo "❌ 找不到章节目录: $SRC_DIR"
  exit 1
fi

# 创建目标目录
mkdir -p "$DEST_DIR"

# 复制所有 .md 文件
COUNT=0
for f in "$SRC_DIR"/*.md; do
  [ -f "$f" ] || continue
  cp "$f" "$DEST_DIR/"
  COUNT=$((COUNT + 1))
done

echo "✅ 已复制 $COUNT 个章节文件到 $DEST_DIR"

# 同步 easy-chapters（通俗版）
EASY_SRC_DIR="$ROOT_DIR/docs/book/easy-chapters"
EASY_DEST_DIR="$SCRIPT_DIR/easy-chapters"

if [ -d "$EASY_SRC_DIR" ]; then
  mkdir -p "$EASY_DEST_DIR"
  EASY_COUNT=0
  for f in "$EASY_SRC_DIR"/*.md; do
    [ -f "$f" ] || continue
    cp "$f" "$EASY_DEST_DIR/"
    EASY_COUNT=$((EASY_COUNT + 1))
  done
  echo "✅ 已复制 $EASY_COUNT 个通俗版文章到 $EASY_DEST_DIR"
fi

echo ""
echo "下一步："
echo "  本地预览 → bash blog/dev.sh"
echo "  部署发布 → push 后手动触发 GitHub Actions: deploy-blog.yml"
