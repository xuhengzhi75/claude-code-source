#!/usr/bin/env bash
# =============================================================
# blog/dev.sh — 本地开发预览脚本
#
# 用途：先执行构建（同步最新 md 文件），再启动本地服务器
#       并自动在浏览器中打开博客首页。
#
# 使用方式：
#   bash blog/dev.sh            # 从项目根目录执行
#   cd blog && bash dev.sh      # 从 blog 目录执行
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-3000}"

# Step 1: 构建（同步 md 文件）
echo "🔨 同步章节文件..."
bash "$SCRIPT_DIR/build.sh"
echo ""

# Step 2: 检查端口是否被占用，如果是则杀掉旧进程
if lsof -ti ":$PORT" > /dev/null 2>&1; then
  echo "⚠️  端口 $PORT 已被占用，正在释放..."
  lsof -ti ":$PORT" | xargs kill -9 2>/dev/null || true
  sleep 0.5
fi

# Step 3: 从 blog 目录启动静态服务器
echo "🚀 启动本地服务器 → http://localhost:$PORT"
cd "$SCRIPT_DIR"
python3 -m http.server "$PORT" &
SERVER_PID=$!

# 等待服务器就绪
sleep 0.8

# Step 4: 打开浏览器
URL="http://localhost:$PORT/index.html"
echo "🌐 打开浏览器: $URL"
if command -v open > /dev/null 2>&1; then
  open "$URL"                        # macOS
elif command -v xdg-open > /dev/null 2>&1; then
  xdg-open "$URL"                    # Linux
fi

echo ""
echo "✅ 服务器运行中 (PID: $SERVER_PID)"
echo "   按 Ctrl+C 停止"
echo ""

# 等待用户中断
trap "echo ''; echo '🛑 服务器已停止'; kill $SERVER_PID 2>/dev/null" INT TERM
wait $SERVER_PID
