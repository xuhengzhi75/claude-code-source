# Tool System Detail

## 一句话定位
这份笔记服务于 Part IV 中“工具作为手脚”。重点不是列工具清单，而是解释 Claude Code 为什么把工具做成“受治理的执行单元”。

## 核心判断
`src/Tool.ts` 里的 Tool 契约不是简单函数签名，而是“能力 + 执行 + 风险 + 呈现”的统一协议。`src/tools.ts` 则负责把理论工具全集裁剪为当前会话可见的动作池。

## 最该讲的 5 个点

### 1. Tool 是厚接口，不是 RPC 壳
工具同时带有：
- schema
- aliases / searchHint
- validate / permission / call
- isReadOnly / isDestructive / concurrency
- renderToolUse / renderToolResult

### 2. `buildTool()` 默认值是 fail-closed
默认值整体偏保守，要求工具作者显式声明更宽权限。这是 secure-by-default 风格。

### 3. 工具集合是“先全集，再过滤，再合并”
- `getAllBaseTools()`
- `getTools(permissionContext)`
- `assembleToolPool(permissionContext, mcpTools)`

### 4. 风险语义是可编程的
工具可以声明只读、破坏性、分类器输入、权限匹配器，不是完全靠外层猜。

### 5. 工具排序和去重还服务于 prompt cache 稳定性
这不是纯整理癖，而是运行时性能与稳定性设计的一部分。

## 典型工具举例建议
- 本地读：`FileReadTool`
- 小改动：`FileEditTool`
- 整体覆盖：`FileWriteTool`
- 页面抓取：`WebFetchTool`
- 搜索：`WebSearchTool`
- 保底执行：`BashTool`

## 关键源码锚点
- `src/Tool.ts`
- `src/tools.ts`
- `src/tools/BashTool/*`
- `src/tools/FileReadTool/*`
- `src/tools/FileEditTool/*`
- `src/tools/FileWriteTool/*`
- `src/tools/WebFetchTool/*`
- `src/tools/WebSearchTool/*`

## 不要重复讲的内容
- 不逐个铺开所有工具目录
- 不把 permissions 全讲到这章里
- 不把 MCP 全部细节压进这章

## 给写作侧的交接提示
本章要让读者理解：
**工具为什么是受治理的执行单元，而不是一堆可调用函数。**
不要把正文写成工具名词大全。