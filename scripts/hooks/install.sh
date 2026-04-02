#!/usr/bin/env bash
# 一键安装 pre-commit hook
# 用法：bash scripts/hooks/install.sh

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_SRC="$REPO_ROOT/scripts/hooks/pre-commit"
HOOK_DST="$REPO_ROOT/.git/hooks/pre-commit"
NAMES_FILE="$REPO_ROOT/.git/hooks/blocked-names.txt"

if [ ! -f "$HOOK_SRC" ]; then
  echo "❌ 找不到 $HOOK_SRC"
  exit 1
fi

cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"
echo "✅ pre-commit hook 已安装到 $HOOK_DST"

# 引导创建敏感姓名配置文件
if [ ! -f "$NAMES_FILE" ]; then
  echo ""
  echo "📝 请配置敏感姓名列表（防止真实姓名泄露到公开仓库）"
  echo "   文件路径：$NAMES_FILE"
  echo "   此文件仅在本地 .git/hooks/ 目录，不会被推送到 GitHub"
  echo ""
  echo "   创建示例："
  echo "     echo '你的真实姓名' >> $NAMES_FILE"
  echo ""
  cat > "$NAMES_FILE" << 'EOF'
# blocked-names.txt — 本地敏感姓名列表，不入 git 仓库
# 格式：每行一个姓名，# 开头为注释
# 在下方添加需要拦截的真实姓名：

EOF
  echo "   已创建空模板，请手动编辑添加姓名。"
fi
