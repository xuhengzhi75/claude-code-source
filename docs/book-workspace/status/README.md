# Status Snapshots

这个目录存放阶段性状态快照（`status-*.md`）。

用途：
- 记录某一时间点的完成情况
- 支持中断后续写
- 支持多人/多 agent 交接
- 为 `status/status/status-index.md` 提供原始快照来源

约定：
- 新状态文件统一写入本目录
- 文件名保持 `status-YYYY-MM-DD-HHMM.md`
- `status/status/status-index.md` 负责汇总，不替代原始快照
