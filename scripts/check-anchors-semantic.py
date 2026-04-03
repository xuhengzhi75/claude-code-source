#!/usr/bin/env python3
"""
check-anchors-semantic.py
语义层面验证书稿锚点：
  1. 提取每个锚点在书稿中的上下文（前后各1行）
  2. 从上下文中提取"期望出现的标识符"（函数名、变量名、常量名）
  3. 检查锚点指向的实际代码行（±3行窗口）是否包含这些标识符
  4. 输出不匹配的锚点供人工审查
"""

import re
import subprocess
import sys
from pathlib import Path
from collections import defaultdict

REPO_ROOT = Path(__file__).parent.parent
CHAPTERS_DIR = REPO_ROOT / "docs/book/chapters"

# 匹配 Markdown 链接中的锚点，同时捕获链接文本（通常是标识符）
# 格式：[`xxx#Lnnn`](https://github.com/.../blob/<hash>/<path>#Lnnn)
ANCHOR_PATTERN = re.compile(
    r'\[`([^`]+)`\]\(https://github\.com/[^/]+/[^/]+/blob/([a-f0-9]{7,40})/([^)#]+)#(L\d+)\)'
)

# 也匹配裸锚点（没有链接文本的情况）
BARE_ANCHOR_PATTERN = re.compile(
    r'https://github\.com/[^/]+/[^/]+/blob/([a-f0-9]{7,40})/([^)#\s]+)#(L\d+)'
)

# 标识符提取：camelCase、snake_case、PascalCase、UPPER_CASE
IDENTIFIER_PATTERN = re.compile(r'\b([a-zA-Z_][a-zA-Z0-9_]{2,})\b')

def git_show_lines(hash_: str, filepath: str, lineno: int, window: int = 3) -> list[str]:
    """从指定 commit 取出文件的某行及其上下文"""
    try:
        result = subprocess.run(
            ["git", "show", f"{hash_}:{filepath}"],
            capture_output=True, text=True, cwd=REPO_ROOT
        )
        if result.returncode != 0:
            return []
        lines = result.stdout.splitlines()
        start = max(0, lineno - 1 - window)
        end = min(len(lines), lineno + window)
        return lines[start:end]
    except Exception:
        return []

def extract_identifiers(text: str) -> set[str]:
    """从文本中提取有意义的标识符（过滤掉太短或太通用的词）"""
    STOP_WORDS = {
        'the', 'and', 'for', 'not', 'are', 'was', 'has', 'have', 'this',
        'that', 'with', 'from', 'they', 'will', 'been', 'when', 'where',
        'which', 'their', 'there', 'then', 'than', 'into', 'each', 'also',
        'can', 'may', 'must', 'should', 'would', 'could', 'does', 'did',
        'its', 'our', 'your', 'his', 'her', 'all', 'any', 'one', 'two',
        'new', 'old', 'get', 'set', 'add', 'run', 'use', 'let', 'var',
        'const', 'type', 'true', 'false', 'null', 'void', 'async', 'await',
        'return', 'export', 'import', 'function', 'class', 'interface',
        'string', 'number', 'boolean', 'object', 'array', 'Promise',
        'Error', 'null', 'undefined', 'never', 'unknown',
        # 中文相关的英文词
        'src', 'lib', 'utils', 'test', 'spec', 'index', 'main', 'app',
        'data', 'info', 'list', 'item', 'node', 'root', 'path', 'file',
        'name', 'type', 'mode', 'flag', 'key', 'val', 'msg', 'err', 'ctx',
    }
    ids = set(IDENTIFIER_PATTERN.findall(text))
    return {i for i in ids if i not in STOP_WORDS and len(i) > 3}

def check_file(md_path: Path) -> list[dict]:
    """检查单个 Markdown 文件中的所有锚点"""
    issues = []
    content = md_path.read_text(encoding='utf-8')
    lines = content.splitlines()

    for line_idx, line in enumerate(lines):
        for match in ANCHOR_PATTERN.finditer(line):
            link_text = match.group(1)   # 链接文本，如 `QueryEngine.ts#L443`
            hash_ = match.group(2)
            filepath = match.group(3)
            lineno = int(match.group(4).lstrip('L'))

            # 从链接文本中提取期望的标识符
            # 链接文本通常是 `path#Lnnn` 或 `FunctionName()`
            # 也从周围文字中提取
            context_start = max(0, line_idx - 1)
            context_end = min(len(lines), line_idx + 2)
            context_text = ' '.join(lines[context_start:context_end])

            # 优先从链接文本中提取（去掉路径和行号部分）
            link_identifiers = extract_identifiers(
                re.sub(r'[./]', ' ', link_text.split('#')[0])
            )
            # 再从上下文中提取（权重较低）
            context_identifiers = extract_identifiers(context_text)

            # 取链接文本中的标识符（更精确）
            expected = link_identifiers if link_identifiers else context_identifiers

            # 获取实际代码行
            actual_lines = git_show_lines(hash_, filepath, lineno)
            if not actual_lines:
                issues.append({
                    'file': md_path.name,
                    'line': line_idx + 1,
                    'anchor': f"blob/{hash_}/{filepath}#L{lineno}",
                    'reason': 'file not found or line out of range',
                    'expected': expected,
                    'actual': [],
                })
                continue

            actual_text = ' '.join(actual_lines)
            actual_identifiers = extract_identifiers(actual_text)

            # 检查期望标识符是否出现在实际代码中
            # 只检查"看起来像函数名/类名"的标识符（有大写或下划线的）
            meaningful_expected = {
                i for i in expected
                if any(c.isupper() for c in i) or '_' in i
            }

            if meaningful_expected:
                missing = meaningful_expected - actual_identifiers
                # 允许部分缺失（可能是描述性文字，不是精确标识符）
                # 只有超过一半的期望标识符都缺失时才报告
                if len(missing) > len(meaningful_expected) * 0.6:
                    issues.append({
                        'file': md_path.name,
                        'line': line_idx + 1,
                        'anchor': f"blob/{hash_}/{filepath}#L{lineno}",
                        'reason': f'identifier mismatch: expected {meaningful_expected}, missing {missing}',
                        'expected': meaningful_expected,
                        'actual': actual_lines,
                    })

    return issues

def main():
    all_issues = []
    md_files = sorted(CHAPTERS_DIR.glob("*.md"))

    for md_file in md_files:
        issues = check_file(md_file)
        all_issues.extend(issues)

    if not all_issues:
        print(f"✅ All anchors look semantically correct ({len(md_files)} files checked)")
        return 0

    print(f"⚠️  Found {len(all_issues)} potentially mismatched anchors:\n")
    for issue in all_issues:
        print(f"  File: {issue['file']} (line {issue['line']})")
        print(f"  Anchor: {issue['anchor']}")
        print(f"  Reason: {issue['reason']}")
        if issue['actual']:
            print(f"  Actual code:")
            for l in issue['actual']:
                print(f"    {l}")
        print()

    return 1

if __name__ == '__main__':
    sys.exit(main())
