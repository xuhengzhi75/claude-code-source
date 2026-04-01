# Bridge Reading Method

## 一句话定位
这份笔记服务于前桥接章（替换当前 ch03）。它不重复讲 Claude Code 的具体模块细节，而是给写作侧一套“怎么拆系统、怎么区分 verified / inference、先看哪里”的阅读方法。

## 本章最该讲的 5 个点

### 1. 先按控制权转移拆系统，不按目录名拆
推荐先画这条接力链：

`src/entrypoints/cli.tsx -> src/main.tsx -> src/QueryEngine.ts::submitMessage() -> src/query.ts`

读者先回答“谁把控制权交给谁”，再看每层内部细节，这样不容易迷路。

### 2. 把能力可见性单独当一层
命令、工具、技能、插件不是零散功能，而是“当前会话到底能做什么”的边界层。

关键锚点：
- `src/commands.ts`
- `src/tools.ts`
- `src/Tool.ts`

### 3. 读 `query.ts` 时先抓继续 / 结束 / 恢复
不要先陷进 stop reason、flag 和局部分支。先抓 3 个问题：
- 什么时候继续？
- 什么时候结束？
- 异常时怎么回到一致状态？

### 4. verified / inference 必须按“能否直接对码”切开
可直接从源码结构、函数、注释和分支验证的，写成 verified。
性能收益、稳定性收益、组织层动机这类效果判断，只能写成 inference。

### 5. 给读者一条最短阅读路径
建议顺序：
1. `src/entrypoints/cli.tsx`
2. `src/commands.ts` + `src/tools.ts` + `src/Tool.ts`
3. `src/QueryEngine.ts`
4. `src/query.ts`
5. `src/Task.ts` + `src/tasks.ts`

## 关键源码锚点
- 分流与收敛：`src/entrypoints/cli.tsx`
- 命令装配：`src/commands.ts`
- 工具装配与统一契约：`src/tools.ts`、`src/Tool.ts`
- 会话编排边界：`src/QueryEngine.ts`
- query 循环关键判定：`src/query.ts`

## 只能写成 inference 的判断
- fast-path + dynamic import 会显著降低冷启动时延
- tool_use 驱动继续在跨 provider 上更稳定
- 厚 Tool 契约降低长期演进成本
- 当前分层是团队规模化协作后的最优结构

## 不要和后续章节重复讲的内容
- 不展开每个 fast-path 的具体业务细节
- 不逐个解释所有工具和命令能力
- 不深挖 `submitMessage()` 内部所有事件整形
- 不展开 compact/recovery/budget 全分支
- 不细讲任务认领、输出与恢复机制

## 给写作侧的交接提示
本章只做三件事：
1. 给阅读方法
2. 给证据纪律
3. 给阅读顺序

不要把它写成另一章架构综述。