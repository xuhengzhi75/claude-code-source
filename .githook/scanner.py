#!/usr/bin/env python3
"""
scanner.py — claude-code-source 全仓库安全扫描脚本

用法：
  python3 .githook/scanner.py --mode full --repo-root /path/to/repo
  python3 .githook/scanner.py --mode staged --repo-root /path/to/repo

退出码：
  0 — 通过
  1 — 发现 ERROR 级别问题
  2 — 仅发现 WARN 级别问题（不阻止提交）
"""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

# ─────────────────────────────────────────────
# 规则定义
# ─────────────────────────────────────────────

class Rule(NamedTuple):
    category: str
    pattern: str
    description: str
    severity: str = "ERROR"   # ERROR | WARN
    flags: int = re.IGNORECASE


RULES: list[Rule] = [
    # API Keys / Tokens
    Rule("SECRET",   r'(api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*["\']?[A-Za-z0-9_\-]{16,}',
         "疑似 API Key 赋值"),
    Rule("SECRET",   r'(secret[_-]?key|secret[_-]?token|app[_-]?secret)\s*[:=]\s*["\']?[A-Za-z0-9_\-]{16,}',
         "疑似 Secret Key/Token 赋值"),
    Rule("GITHUB",   r'ghp_[A-Za-z0-9]{36}',
         "GitHub Personal Access Token", flags=0),
    Rule("GITHUB",   r'ghs_[A-Za-z0-9]{36}',
         "GitHub Service Account Token", flags=0),
    Rule("GITHUB",   r'gho_[A-Za-z0-9]{36}',
         "GitHub OAuth Token", flags=0),
    Rule("GITHUB",   r'github_pat_[A-Za-z0-9_]{82}',
         "GitHub Fine-grained PAT", flags=0),
    Rule("OPENAI",   r'sk-[A-Za-z0-9]{20,}',
         "疑似 OpenAI API Key", flags=0),
    Rule("AWS",      r'AKIA[0-9A-Z]{16}',
         "AWS Access Key ID", flags=0),
    Rule("AWS",      r'aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*[A-Za-z0-9/+=]{40}',
         "AWS Secret Access Key"),
    Rule("TOKEN",    r'bearer\s+[A-Za-z0-9\-._~+/]+=*',
         "Bearer Token 明文"),
    Rule("TOKEN",    r'(access[_-]?token|auth[_-]?token|oauth[_-]?token)\s*[:=]\s*["\']?[A-Za-z0-9_\-\.]{16,}',
         "疑似 Access/Auth Token 赋值"),
    Rule("JWT",      r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',
         "JWT Token 明文", flags=0),
    Rule("PRIVKEY",  r'-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY( BLOCK)?-----',
         "PEM 私钥", flags=0),
    Rule("PASSWORD", r'(password|passwd|pwd)\s*[:=]\s*["\'][^"\'\\s]{6,}["\']',
         "疑似明文密码赋值"),

    # 内部信息
    Rule("INTERNAL", r'(misid|mis_id|mis-id)\s*[:=]\s*["\']?[a-z0-9]{6,}',
         "疑似美团 misId 赋值"),
    Rule("PII",      r'[a-zA-Z0-9._%+\-]+@(meituan|sankuai|dianping)\.com',
         "美团/美团点评内部邮箱", flags=0),
    Rule("PII",      r'(?<!\d)1[3-9][0-9]{9}(?!\d)',
         "疑似中国大陆手机号", flags=0),

    # 内部 URL
    Rule("INTERNAL_URL", r'https?://[a-zA-Z0-9\-\.]*\.sankuai\.com',
         "美团内网 sankuai.com 域名链接", flags=0),
    Rule("INTERNAL_URL", r'https?://km\.sankuai\.com',
         "学城 km.sankuai.com 链接", flags=0),

    # 沙箱
    Rule("OPENCLAW", r'(sandboxid|sandbox[_-]?id)\s*[:=]\s*["\']?[a-zA-Z0-9\-]{8,}',
         "沙箱 sandboxId 泄露"),
    Rule("OPENCLAW", r'botmisid\s*[:=]\s*["\']?[a-z0-9]{10,}',
         "botMisId 泄露"),
]

# 跳过的文件/目录
SKIP_PATTERNS = [
    r'\.git/',
    r'node_modules/',
    r'\.githook/',          # hook 自身
    r'scripts/hooks/',      # 旧 hook 目录
    r'__pycache__/',
    r'\.pyc$',
    r'\.png$', r'\.jpg$', r'\.jpeg$', r'\.gif$', r'\.ico$', r'\.svg$',
    r'\.woff$', r'\.woff2$', r'\.ttf$', r'\.eot$',
    r'\.pdf$', r'\.zip$', r'\.tar$', r'\.gz$',
]

SKIP_RE = re.compile('|'.join(SKIP_PATTERNS))

# ─────────────────────────────────────────────
# 私有规则加载
# ─────────────────────────────────────────────

def load_private_rules(repo_root: Path) -> list[Rule]:
    """从 .git/hooks/private-rules.txt 加载私有规则（不入仓库）"""
    rules_file = repo_root / ".git" / "hooks" / "private-rules.txt"
    if not rules_file.exists():
        return []

    extra: list[Rule] = []
    for line in rules_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|")
        if len(parts) < 3:
            continue
        category, pattern, description = parts[0], parts[1], parts[2]
        severity = parts[3].strip() if len(parts) > 3 else "ERROR"
        try:
            extra.append(Rule(category, pattern, description, severity))
        except re.error:
            pass
    return extra


# ─────────────────────────────────────────────
# 扫描逻辑
# ─────────────────────────────────────────────

class Finding(NamedTuple):
    severity: str
    category: str
    description: str
    file: str
    line_no: int
    line: str


def should_skip(path: str) -> bool:
    return bool(SKIP_RE.search(path))


def scan_file(filepath: Path, rules: list[Rule], repo_root: Path) -> list[Finding]:
    findings: list[Finding] = []
    rel = str(filepath.relative_to(repo_root))

    if should_skip(rel):
        return findings

    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except (OSError, PermissionError):
        return findings

    for lineno, line in enumerate(text.splitlines(), 1):
        for rule in rules:
            try:
                if re.search(rule.pattern, line, rule.flags):
                    findings.append(Finding(
                        severity=rule.severity,
                        category=rule.category,
                        description=rule.description,
                        file=rel,
                        line_no=lineno,
                        line=line.strip()[:120],
                    ))
            except re.error:
                pass
    return findings


def scan_full(repo_root: Path, rules: list[Rule]) -> list[Finding]:
    """全仓库扫描：遍历 git ls-files 输出"""
    try:
        result = subprocess.run(
            ["git", "ls-files"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        )
        files = [repo_root / f for f in result.stdout.splitlines() if f]
    except subprocess.CalledProcessError:
        files = list(repo_root.rglob("*"))

    findings: list[Finding] = []
    for f in files:
        if f.is_file():
            findings.extend(scan_file(f, rules, repo_root))
    return findings


def scan_staged(repo_root: Path, rules: list[Rule]) -> list[Finding]:
    """增量扫描：仅扫描 staged 文件"""
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        )
        files = [repo_root / f for f in result.stdout.splitlines() if f]
    except subprocess.CalledProcessError:
        return []

    findings: list[Finding] = []
    for f in files:
        if f.is_file():
            findings.extend(scan_file(f, rules, repo_root))
    return findings


# ─────────────────────────────────────────────
# 输出
# ─────────────────────────────────────────────

ANSI_RED    = "\033[0;31m"
ANSI_YELLOW = "\033[0;33m"
ANSI_GREEN  = "\033[0;32m"
ANSI_NC     = "\033[0m"


def print_findings(findings: list[Finding]) -> int:
    """打印结果，返回退出码（0/1/2）"""
    errors   = [f for f in findings if f.severity == "ERROR"]
    warnings = [f for f in findings if f.severity == "WARN"]

    if not errors and not warnings:
        print(f"{ANSI_GREEN}✅ Python 扫描通过{ANSI_NC}")
        return 0

    if errors:
        print(f"{ANSI_RED}❌ Python 扫描发现 {len(errors)} 个 ERROR：{ANSI_NC}")
        for f in errors[:20]:  # 最多显示 20 条
            print(f"  {ANSI_RED}✗ [{f.category}] {f.description}{ANSI_NC}")
            print(f"    {f.file}:{f.line_no}")
            print(f"    {f.line}")
        if len(errors) > 20:
            print(f"  ... 还有 {len(errors) - 20} 条，请运行 VERBOSE=1 查看全部")

    if warnings:
        print(f"{ANSI_YELLOW}⚠️  Python 扫描发现 {len(warnings)} 个 WARN：{ANSI_NC}")
        for f in warnings[:10]:
            print(f"  {ANSI_YELLOW}! [{f.category}] {f.description}{ANSI_NC}")
            print(f"    {f.file}:{f.line_no}")

    return 1 if errors else 2


# ─────────────────────────────────────────────
# 入口
# ─────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="claude-code-source 安全扫描")
    parser.add_argument("--mode", choices=["full", "staged"], default="staged")
    parser.add_argument("--repo-root", default=".")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    all_rules = list(RULES) + load_private_rules(repo_root)

    if args.mode == "full":
        findings = scan_full(repo_root, all_rules)
    else:
        findings = scan_staged(repo_root, all_rules)

    return print_findings(findings)


if __name__ == "__main__":
    sys.exit(main())
