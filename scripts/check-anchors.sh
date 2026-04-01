#!/usr/bin/env bash
# check-anchors.sh
# 验证书稿中代码锚点（blob/<hash>/<path>#L<line>）的行号是否有效
#
# 用法：
#   bash scripts/check-anchors.sh              # 检查所有章节
#   bash scripts/check-anchors.sh --staged     # 只检查本次 git staged 的文件（pre-commit 模式）
#   bash scripts/check-anchors.sh --verbose    # 输出所有 PASS 详情
#
# 退出码：0=全部通过，1=有失败

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHAPTERS_DIR="$REPO_ROOT/docs/book/chapters"

MODE="all"
VERBOSE=""
for arg in "$@"; do
  case "$arg" in
    --staged)  MODE="staged" ;;
    --verbose) VERBOSE="1" ;;
  esac
done

PASS=0
FAIL=0

# 根据模式决定要检查哪些文件，写入临时文件列表
TMP_FILE_LIST="$(mktemp)"
trap 'rm -f "$TMP_FILE_LIST"' EXIT

if [[ "$MODE" == "staged" ]]; then
  # -z 输出 NUL 分隔的原始路径（不转义中文），再用 tr 换成换行
  git -C "$REPO_ROOT" diff --cached --name-only -z --diff-filter=ACM 2>/dev/null \
    | tr '\0' '\n' \
    | grep 'docs/book/chapters/.*\.md$' \
    | sed "s|^|$REPO_ROOT/|" \
    > "$TMP_FILE_LIST" || true

  count=$(wc -l < "$TMP_FILE_LIST" | tr -d ' ')
  if [[ "$count" -eq 0 ]]; then
    echo "No book chapter files staged, skipping anchor check."
    exit 0
  fi
  echo "Checking anchors in $count staged file(s)..."
else
  find "$CHAPTERS_DIR" -name "*.md" | sort > "$TMP_FILE_LIST"
  count=$(wc -l < "$TMP_FILE_LIST" | tr -d ' ')
  echo "Checking anchors in all $count chapter files..."
fi
echo ""

# 逐文件检查
while IFS= read -r md_file; do
  [[ -f "$md_file" ]] || continue

  # 提取该文件中所有唯一锚点
  while IFS= read -r anchor; do
    [[ -z "$anchor" ]] && continue

    # anchor 形如 blob/c68ee10/src/query.ts#L243
    hash="${anchor#blob/}"
    hash="${hash%%/*}"
    rest="${anchor#blob/${hash}/}"
    filepath="${rest%%#*}"
    lineno="${rest##*#L}"

    [[ -z "$lineno" || -z "$filepath" || -z "$hash" ]] && continue

    # 用 git show 取出对应 commit 的那一行
    actual_line=$(git -C "$REPO_ROOT" show "${hash}:${filepath}" 2>/dev/null \
      | sed -n "${lineno}p" 2>/dev/null || true)

    label="$(basename "$md_file"):  blob/${hash}/${filepath}#L${lineno}"

    if [[ -z "$actual_line" ]]; then
      FAIL=$((FAIL + 1))
      echo "FAIL  $label"
      echo "      → (file not found or line out of range)"
    else
      PASS=$((PASS + 1))
      if [[ -n "$VERBOSE" ]]; then
        trimmed=$(echo "$actual_line" | sed 's/^[[:space:]]*//' | cut -c1-100)
        echo "PASS  $label"
        echo "      → $trimmed"
      fi
    fi
  done < <(
    grep -oh 'blob/[a-f0-9]\{7,40\}/[^)"]*#L[0-9]*' "$md_file" 2>/dev/null \
      | sort -u \
      || true
  )
done < "$TMP_FILE_LIST"

echo ""
echo "============================="
echo "PASS: $PASS  |  FAIL: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "Fix: update the line numbers in the markdown files listed above."
  exit 1
fi
