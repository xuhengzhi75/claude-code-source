#!/usr/bin/env bash
# =============================================================================
# install.sh — 安装 git hooks 到 .git/hooks/
#
# 用法：bash .githook/install.sh
#
# 安装内容：
#   .githook/pre-commit  → .git/hooks/pre-commit
#   .githook/commit-msg  → .git/hooks/commit-msg
#
# 私有配置（不入仓库，存放在 .git/hooks/）：
#   .git/hooks/blocked-names.txt    — 真实姓名列表
#   .git/hooks/private-rules.txt    — 私有内容扫描规则
#   .git/hooks/private-rules-msg.txt — 私有 commit-msg 规则
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_DIR="$REPO_ROOT/.githook"
GIT_HOOK_DIR="$REPO_ROOT/.git/hooks"

echo -e "${CYAN}=== 安装 git hooks ===${NC}"

# 安装 pre-commit
cp "$HOOK_DIR/pre-commit" "$GIT_HOOK_DIR/pre-commit"
chmod +x "$GIT_HOOK_DIR/pre-commit"
echo -e "${GREEN}✅ pre-commit 已安装${NC}"

# 安装 commit-msg
cp "$HOOK_DIR/commit-msg" "$GIT_HOOK_DIR/commit-msg"
chmod +x "$GIT_HOOK_DIR/commit-msg"
echo -e "${GREEN}✅ commit-msg 已安装${NC}"

echo ""
echo -e "${CYAN}=== 初始化私有配置文件 ===${NC}"

# blocked-names.txt
NAMES_FILE="$GIT_HOOK_DIR/blocked-names.txt"
if [ ! -f "$NAMES_FILE" ]; then
  cat > "$NAMES_FILE" << 'EOF'
# blocked-names.txt — 本地敏感姓名列表，不入 git 仓库
# 格式：每行一个姓名，# 开头为注释
# 在下方添加需要拦截的真实姓名（中文/英文均可）：

EOF
  echo -e "${GREEN}✅ 已创建 $NAMES_FILE（空模板，请手动添加姓名）${NC}"
else
  echo -e "${YELLOW}⚠️  $NAMES_FILE 已存在，跳过${NC}"
fi

# private-rules.txt
RULES_FILE="$GIT_HOOK_DIR/private-rules.txt"
if [ ! -f "$RULES_FILE" ]; then
  cat > "$RULES_FILE" << 'EOF'
# private-rules.txt — 私有内容扫描规则，不入 git 仓库
#
# 格式（竖线分隔）：
#   CATEGORY|regex_pattern|描述|SEVERITY
#
# SEVERITY 可选值：ERROR（阻止提交）| WARN（警告不阻止）
# 默认 SEVERITY 为 ERROR
#
# 示例：
#   INTERNAL|your-internal-tool-name|内部工具名泄露|WARN
#   SECRET|your-secret-prefix[A-Za-z0-9]{20}|内部 token 前缀|ERROR
#
# 在下方添加规则：

EOF
  echo -e "${GREEN}✅ 已创建 $RULES_FILE（空模板，请按需添加规则）${NC}"
else
  echo -e "${YELLOW}⚠️  $RULES_FILE 已存在，跳过${NC}"
fi

# private-rules-msg.txt
MSG_RULES_FILE="$GIT_HOOK_DIR/private-rules-msg.txt"
if [ ! -f "$MSG_RULES_FILE" ]; then
  cat > "$MSG_RULES_FILE" << 'EOF'
# private-rules-msg.txt — 私有 commit-msg 扫描规则，不入 git 仓库
#
# 格式同 private-rules.txt：
#   CATEGORY|regex_pattern|描述|SEVERITY
#
# 在下方添加规则：

EOF
  echo -e "${GREEN}✅ 已创建 $MSG_RULES_FILE（空模板，请按需添加规则）${NC}"
else
  echo -e "${YELLOW}⚠️  $MSG_RULES_FILE 已存在，跳过${NC}"
fi

echo ""
echo -e "${CYAN}=== 安装完成 ===${NC}"
echo ""
echo "私有配置文件位于 .git/hooks/，不会被推送到 GitHub。"
echo "请根据需要编辑以下文件："
echo "  $NAMES_FILE"
echo "  $RULES_FILE"
echo "  $MSG_RULES_FILE"
echo ""
echo "验证安装："
echo "  git diff --cached | bash .git/hooks/pre-commit"
echo ""
echo "跳过检查（慎用）："
echo "  git commit --no-verify"
