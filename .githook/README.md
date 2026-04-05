# .githook — 提交前安全检查

本目录包含 claude-code-source 仓库的 git hook 脚本，用于在提交前拦截敏感信息，防止泄露到公开 GitHub 仓库。

## 安装

```bash
bash .githook/install.sh
```

安装后，每次 `git commit` 时会自动执行安全检查。

## 文件说明

| 文件 | 说明 |
|------|------|
| `pre-commit` | 提交前内容扫描（staged diff + 文件类型检查） |
| `commit-msg` | 提交信息安全检查（公司名/内部标识/敏感关键字） |
| `scanner.py` | Python 全量扫描脚本（全仓库模式时调用） |
| `install.sh` | 一键安装脚本 |

## 扫描策略

- **首次提交** 或 **距上次提交超过 1 天**：全仓库扫描（`scanner.py --mode full`）
- **其余情况**：仅扫描 staged 内容（增量模式）

强制全量扫描：

```bash
FORCE_FULL_SCAN=1 git commit -m "..."
```

详细输出：

```bash
VERBOSE=1 git commit -m "..."
```

## 检查项

**pre-commit 检查：**
- API Key / Token / Secret 泄露（GitHub PAT、OpenAI key、AWS key、JWT 等）
- PEM 私钥 / 证书文件
- 美团内部邮箱 / misId / 员工 UID
- 内网 URL（sankuai.com、km.sankuai.com 等）
- 沙箱配置（sandboxId、botMisId、openclaw.json 等）
- 敏感文件类型（.env、.pem、.key、.sqlite 等）
- 私有规则（见下方）

**commit-msg 检查：**
- 公司名 / 内部组织标识（sankuai、dianping）
- 内部产品代号（catXXX 系列）
- 内部工具名（friday、growthbook、statsig 等）
- 内网 URL
- 密钥/密码赋值模式

## 私有配置（不入仓库）

安装后，以下文件会在 `.git/hooks/` 目录下创建（不会被推送到 GitHub）：

| 文件 | 说明 |
|------|------|
| `.git/hooks/blocked-names.txt` | 真实姓名列表，每行一个 |
| `.git/hooks/private-rules.txt` | 私有内容扫描规则（竖线分隔格式） |
| `.git/hooks/private-rules-msg.txt` | 私有 commit-msg 扫描规则 |

**private-rules.txt 格式：**

```
# CATEGORY|regex_pattern|描述|SEVERITY
INTERNAL|your-tool-name|内部工具名|WARN
SECRET|your-prefix[A-Za-z0-9]{20}|内部 token|ERROR
```

## 跳过检查

```bash
git commit --no-verify
```

> ⚠️ 仅在确认内容安全时使用，不要养成习惯。

## 自动修复

部分问题支持自动修复建议（见错误输出提示）。hook 本身不会自动修改文件，避免误改源码。
