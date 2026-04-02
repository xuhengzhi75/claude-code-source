# 关键源码注释信号（第 1 轮抽样）

这份笔记只做一件事：记录“注释里已经写清楚的系统意图”，方便后续写书时直接引用可核对事实。

## 抽样范围
- `src/main.tsx`（启动预取）
- `src/QueryEngine.ts`（headless 启动约束、transcript 持久化时序）
- `src/query.ts`（查询循环约束）

## 观察结果

### 1) 启动阶段把“首轮响应速度”放在很高优先级
- 位置：`src/main.tsx:2338-2363`
- 注释明确说：有一批预取是为了 REPL 首轮响应更快。
- 也明确了 bare/simple 模式会跳过这批预取。

可用于书中的事实表述：
- Claude Code 在启动路径里专门做了“首轮提速”的缓存预热设计。
- 这不是模型本身能力，而是系统层面的体验优化。

### 2) headless/SDK 路径强调“不被网络阻塞”
- 位置：`src/QueryEngine.ts:533-540`
- 注释明确说：startup 不应因插件网络更新阻塞，优先走 cache-only。
- 需要最新插件时，调用方可主动触发 reload。

可用于书中的事实表述：
- 系统在关键路径上优先保证可用性，再把“最新性”交给显式刷新动作。
- 这是工程权衡，不是功能缺失。

### 3) query 循环对错误可见性有控制策略
- 位置：`src/query.ts:166-174`
- 注释明确说：某些 `max_output_tokens` 中间错误会先暂缓暴露给 SDK 调用方，先看恢复循环是否能继续。

可用于书中的事实表述：
- 这个系统不是“发现错误就立即外抛”的单层逻辑，而是带恢复判断的分层错误处理。
- 目标是降低外部调用方因中间态错误而提前终止会话的风险。

### 4) 用户消息会先写入 transcript，再进入主循环
- 位置：`src/QueryEngine.ts:439-446`
- 注释明确说：在进入 query loop 前先持久化用户消息。即使后续被外部中断，也能从“用户消息已被接受”的点恢复。

可用于书中的事实表述：
- Claude Code 对“中断后可恢复”是提前设计的，不是事后补救。
- transcript 不只是日志，也承担会话恢复基线。

### 5) 上下文折叠是“投影视图”，原始会话历史不被直接改写
- 位置：`src/query.ts:433-441`
- 注释明确说：折叠后的摘要不放进 REPL 原始数组，而是存在 collapse store；每轮进入时按提交日志重放，得到当前可用视图。

可用于书中的事实表述：
- Claude Code 的“上下文压缩”更像阅读时的视图层，不是直接把原始对话硬改成一条摘要。
- 这种做法让系统既能控 token 成本，也能保留更完整的历史基线，便于后续恢复与追溯。

### 6) 结果发出前会尝试冲刷 transcript，防止桌面端“先收结果后杀进程”造成丢写
- 位置：`src/QueryEngine.ts:1075-1084`
- 注释明确说：桌面端在收到结果消息后会立刻结束 CLI 进程；如果缓冲写盘没冲刷，就会丢失。
- 代码路径里对持久化会话做了显式 `flushSessionStorage()`（受环境变量控制）。

可用于书中的事实表述：
- Claude Code 把“结果已返回”和“会话已可靠落盘”当成两个不同阶段来处理。
- 这是一种面向真实进程生命周期的防护，目的是减少“看起来回复了，但恢复点没写全”的情况。

### 7) 进程一启动就先设安全阀，优先防 PATH 劫持
- 位置：`src/main.tsx:588-591`
- 注释明确说：`NoDefaultCurrentDirectoryInExePath` 必须在任何命令执行前设置，用于防止 Windows 从当前目录误执行同名程序（PATH hijacking）。

可用于书中的事实表述：
- 这套系统把“先设安全边界，再跑后续逻辑”写在启动主路径里，不是附加补丁。
- 相关安全动作发生在 very early startup 阶段，优先级高于大多数业务初始化。

### 8) 启动时把“信任建立”放在外部能力之前
- 位置：`src/main.tsx:1816-1817, 2018`
- 注释明确说两件事：
  - MCP 资源预取不会在这里提前做，而是延后到 trust dialog 之后。
  - 模型解析放在 setup 之后，目的是先建立 trust，再触发 AWS 认证。

可用于书中的事实表述：
- Claude Code 的启动顺序不是“能跑就先跑”，而是先过信任边界，再做可能触发外部访问的动作。
- 这说明它把权限与安全前置成主流程约束，而不是可选优化。

### 9) LSP 插件执行被明确放在“信任确认之后”
- 位置：`src/main.tsx:1120-1122, 2317-2321`
- 注释明确说：LSP manager 初始化被刻意延后到 trust dialog 通过之后（或非交互模式下的隐式信任）。
- 目的写得很直接：避免插件 LSP server 在未受信任目录里先执行代码。

可用于书中的事实表述：
- Claude Code 把“插件能力可用”排在“目录信任确认”之后，安全边界优先级更高。
- 这不是抽象原则，而是启动主路径里的显式顺序约束。

### 10) 历史记录撤销做了“竞态兜底”，避免上箭头出现重复
- 位置：`src/history.ts:121-126, 286-289, 448-463`
- 注释明确说：`removeLastFromHistory` 先走快路径（从待写缓冲里删）；如果异步 flush 已先写盘，就把 timestamp 放入 skip 集合，在读取历史时统一过滤。
- 目的同样写得很直白：Esc 撤销后，避免输入框和历史记录同时保留同一条，导致上箭头看到重复。

可用于书中的事实表述：
- 这套系统把“撤销提交”当作真实竞态问题处理，不是假设磁盘写入一定慢。
- 它不是只改一个入口函数，而是把写入路径与读取路径一起收口，保证行为一致。

### 11) Assistant 模式有显式信任闸门，未信任目录直接禁用
- 位置：`src/main.tsx:1043-1047, 1067-1069`
- 注释明确说：未信任 clone 里的 `.claude/settings.json` 可能被攻击者控制；在信任弹窗出现前，主流程已经跑过较长一段初始化并拼接过 assistant prompt，所以必须先拒绝激活 assistant 模式。
- 代码行为与注释一致：`checkHasTrustDialogAccepted()` 未通过时会直接告警并禁用 assistant 模式，要求用户先完成信任确认后重启。

可用于书中的事实表述：
- Claude Code 把“目录信任”当作 assistant 能力的硬前置条件，而不是风险提示。
- 这类防护不是只靠文档说明，而是通过启动路径中的显式分支强制执行。

### 12) 启动阶段把“顺序正确”与“并行提速”同时写成了硬约束
- 位置：`src/main.tsx:1903-1934`
- 注释明确说：`setup()` 必须先于依赖 cwd/worktree 的逻辑；但在 `--worktree` 关闭时，会把 `setup()` 与 `getCommands()/getAgentDefinitions()` 并行执行，以缩短启动等待。
- 同一段注释还写明：内置 skills/plugins 要先注册，再触发 `getCommands()`，否则并行路径会把命令列表缓存成空。

可用于书中的事实表述：
- Claude Code 的启动优化不是“盲目并行”，而是先保顺序正确，再在安全边界内并行。
- 这类性能优化和正确性约束写在同一段主流程注释里，说明它把“快”和“稳”作为同时要满足的目标。

### 13) 启动最前面允许“受控副作用”，用来抢并行窗口
- 位置：`src/main.tsx:1-19`
- 文件开头注释明确写出三件必须最先执行的副作用：
  1. `profileCheckpoint` 先打启动埋点；
  2. `startMdmRawRead` 提前启动 MDM 子进程；
  3. `startKeychainPrefetch` 提前并行读取 keychain。
- 注释还给了动机：把这些耗时动作和后续 import 叠在一起执行，避免后面走到配置阶段再串行等待。

可用于书中的事实表述：
- Claude Code 在入口文件最开始就做了“受控并行预热”，不是等所有模块加载完才做慢操作。
- 这说明它把启动时间优化前移到最早阶段，而且写成了可核对的注释约束。

### 14) 启动耗时埋点会刻意避开“用户等弹窗”的时间
- 位置：`src/main.tsx:2231-2234`
- 注释明确说：启动耗时日志要在任何阻塞弹窗（trust/OAuth/onboarding/resume-picker）出现前打点。
- 也给了历史背景：旧位置在 REPL 首次渲染处，会把用户停留在弹窗上的等待时间算进来，导致 p99 被“等确认”主导，而不是代码本身慢。

可用于书中的事实表述：
- Claude Code 把“代码启动耗时”和“用户操作等待耗时”分开统计，避免性能指标被混在一起。
- 这说明它在可观测性上不只看一个总时长，而是尽量保证指标能反映真实问题来源。

### 15) 子命令也会先挂日志 sink，避免“执行了但事件丢了”
- 位置：`src/main.tsx:927-934`
- 注释明确说：`logEvent` 在新实现里会先入队，等 sink 挂上后再发；而 `doctor/mcp/plugin/auth` 这些子命令不会走 `setup()`，如果不在 `preAction` 里补 `initSinks()`，进程退出时会静默丢事件。
- 同段注释还写明：这两个初始化是幂等的，可以重复调用而不破坏状态。

可用于书中的事实表述：
- Claude Code 把“默认命令”和“子命令”分开兜底，确保日志链路在两条路径都能成立。
- 这不是只求功能能跑，还包含“运行证据不要丢”的工程约束。

## 写作提醒
- 以上各点都可直接对应源码注释，属于“可核对事实”。
- 若要进一步解释为什么这样设计，需要明确标注为推断，不要写成已证实结论。

### 16) 系统上下文预取也受“目录信任”约束，避免 Git 侧路执行
- 位置：`src/main.tsx:354-379`
- 注释明确说：系统上下文预取（含 git status）可能触发 Git hooks/config（如 `core.fsmonitor`、`diff.external`）里的外部执行，所以交互模式下必须等 trust 建立后再做；只有非交互模式（`--print`）才按“隐式信任”直接预取。

可用于书中的事实表述：
- Claude Code 连“看起来只是拿上下文”的预取路径也按同一条信任边界管控，不把它当成纯读操作。
- 这说明它把“潜在代码执行面”当作启动流程里的一等风险，而不是只盯主功能入口。

### 17) 非交互模式会先合并环境再预取 Git 上下文，避免“路径已变但环境没跟上”
- 位置：`src/main.tsx:1964-1978`
- 注释明确说：`--print` 路径会先应用配置环境变量，再提前触发 `getSystemContext()`；这样 `PATH/GIT_DIR/GIT_WORK_TREE`（含 trusted + project 来源）已经生效，且 `setup()` 可能发生的 `chdir` 也已完成，后续 deferred prefetch 直接走缓存命中。

可用于书中的事实表述：
- Claude Code 在非交互路径里，不是“尽早预取就好”，而是先保证工作目录和 Git 相关环境一致，再做预取。
- 这体现的是“预取也要满足前置条件”的工程约束，而不是单纯追求并行提速。

### 18) `--settings` 的临时文件路径会固定下来，避免提示词缓存反复失效
- 位置：`src/main.tsx:445-454`
- 注释明确说：当 `--settings` 直接传 JSON 字符串时，临时文件路径不用随机 UUID，而是用内容哈希生成；因为这个路径会进入工具描述，如果每次都变，就会让 API 侧的 prompt cache 前缀失效，输入 token 成本会明显放大。

可用于书中的事实表述：
- Claude Code 连“临时文件怎么命名”都按成本影响来设计：相同配置尽量得到同一路径，减少不必要的重复计费。
- 这类优化不改变功能结果，但会直接影响长期使用时的稳定成本。

### 19) 读取管道输入时有 3 秒探测阈值，优先避免“静默卡住”
- 位置：`src/main.tsx:870-875`
- 注释明确说：如果 3 秒内没有收到 stdin 数据，就不再一直等待，而是继续执行并给出 warning。注释也写了原因：很多场景是父进程继承了管道但并不会真正写入；3 秒通常覆盖 `curl`、大输入 `jq`、有 import 开销的 Python。

可用于书中的事实表述：
- Claude Code 在命令行输入路径里做了“有限等待”策略，防止用户被无提示地卡住。
- 它不是简单地把超时当失败，而是继续执行并明确提示下一步处理方式，属于面向真实命令链路的可用性设计。

### 20) 终端能力探测用“DA1 哨兵 + 顺序屏障”，避免靠超时猜结果
- 位置：`src/ink/terminal-querier.ts:1-14, 155-169, 181-219`
- 注释明确说：终端查询与键盘输入共用 stdin，不走“每个查询单独超时”；而是在一批查询后发送 DA1（`CSI c`）作为哨兵。因为终端按顺序回复：如果某查询回复先于 DA1，就算支持；若 DA1 先到，该查询就按不支持处理。
- 同一段注释还写明：这个机制允许并发批次共存，`flush()` 只结算它之前的队列，不会把后续调用方的查询误伤。

可用于书中的事实表述：
- Claude Code 在终端能力识别上，优先用“协议顺序屏障”判定支持性，而不是靠短超时拍脑袋。
- 这让结果更稳定：慢终端不会被轻易误判成不支持，并发探测也能保持边界清晰。

### 21) 一进程就先固定 PATH 安全基线，防止后续命令被"同名假程序"劫持
- 位置：`src/main.tsx:589`
- 注释明确说：这个设置必须在任何命令执行前完成，用来避免 PATH 劫持（`prevent PATH hijacking attacks`）。
- 这条约束放在主入口很早的位置，不依赖后续功能分支。

可用于书中的事实表述：
- Claude Code 启动后第一批动作里，就先把"去哪找可执行文件"这件事锁住，避免被当前目录或异常环境变量带偏。
- 这属于"先防错、再做事"的基础安全策略：即使功能没开始跑，也先把执行环境收紧。

---

## 第 2 轮抽样（conversationRecovery.ts / compact.ts / sessionMemory.ts）

更新时间：2026-04-02

### 22) 恢复反序列化是"先取事实、再语义修复"的两步设计
- 位置：`src/utils/conversationRecovery.ts:461-468`（`loadConversationForResume` 函数注释）
- 注释明确说：先尽量"取回事实"（日志链、快照、metadata），再统一做"语义修复"（反序列化/去脏/补哨兵）。这样加载路径可扩展（sessionId、latest、jsonl）而恢复规则保持单点维护。

可用于书中的事实表述：
- Claude Code 的恢复不是"加载后直接用"，而是把"取数据"和"修复数据"分成两个明确阶段。
- 这让不同的加载来源（最近会话、指定 ID、jsonl 文件）可以共用同一套修复逻辑，不需要每条路径各自处理脏数据。

### 23) 中断检测把"interrupted_turn"统一转换成"interrupted_prompt"，让 SDK/REPL 走同一条恢复路径
- 位置：`src/utils/conversationRecovery.ts:207-227`（`deserializeMessagesWithInterruptDetection` 内部注释）
- 注释明确说：把 mid-turn 中断转换成 interrupted_prompt 是语义修复步骤，不是 transcript 回放步骤。恢复先从磁盘还原事实，再把尾部改写成 API 合法、可恢复的对话形态。统一两种中断类型，让 SDK/REPL resume 走同一条路径，而不是各自特殊处理半损坏的尾部。

可用于书中的事实表述：
- 中断检测的目标不只是"发现中断"，而是把不同形态的中断统一成一种可恢复的标准形态。
- 这个统一发生在反序列化层，调用方不需要知道原始中断是哪种类型。

### 24) assistant sentinel 的插入位置有精确约束，为了让 removeInterruptedMessage 的 splice 找到正确配对
- 位置：`src/utils/conversationRecovery.ts:229-248`（sentinel 插入注释）
- 注释明确说：在最后一条 user 消息后插入合成 assistant sentinel，让对话在没有 resume 动作时也是 API 合法的。跳过尾部的 system/progress 消息，插在 user 消息正后方，这样 `removeInterruptedMessage` 的 `splice(idx, 2)` 能移除正确的配对。

可用于书中的事实表述：
- sentinel 的插入位置不是随意的，它需要和后续的"移除中断消息"逻辑精确配合。
- 这类"两处代码互相依赖位置"的约束，是系统在真实场景中积累出来的，不是设计文档里能预先写全的。

### 25) Brief 模式的 tool_result 结尾是"正常完成"，不是中断——需要特殊识别
- 位置：`src/utils/conversationRecovery.ts:338-376`（`isTerminalToolResult` 函数注释）
- 注释明确说：Brief 模式（#20467）去掉了 assistant 的尾部文本块，所以一个正常完成的 brief-mode turn 合法地以 SendUserMessage 的 tool_result 结尾。没有这个检查，resume 会把每个 brief-mode 会话都误判为 mid-turn 中断，并注入一条幽灵的"Continue from where you left off."。

可用于书中的事实表述：
- 中断检测不能只看消息类型，还要看工具语义：某些工具的 tool_result 是合法的 turn 终态。
- 这类"模型版本行为变化导致的检测逻辑补丁"，在长期运行的系统里会积累，每一个都对应一段真实的故障历史。

### 26) 技能状态必须在反序列化前从 attachment 回放，否则下次 compact 会"遗忘"技能
- 位置：`src/utils/conversationRecovery.ts:385-408`（`restoreSkillStateFromMessages` 函数注释）
- 注释明确说：恢复阶段必须先回放 attachment 里的技能状态，再做后续反序列化/继续对话。否则 invokedSkills 仅存在于进程内存，resume 后下一次 compact 会把技能上下文"遗忘"。另外，先前进程已经注入过 skills-available 提醒（约 600 tokens），不需要再次注入，通过 `suppressNextSkillListing()` 避免重复。

可用于书中的事实表述：
- 恢复不只是"把消息加载回来"，还包括把进程内存里的状态（技能列表）从持久化数据里重建。
- 这类"进程内存状态需要从磁盘重建"的设计，是跨进程恢复的核心挑战之一。

### 27) compact 后重建上下文的顺序是协议，不是偏好——改顺序会引发级联兼容问题
- 位置：`src/services/compact/compact.ts:330-339`（`buildPostCompactMessages` 函数注释）
- 注释明确说：顺序即协议：boundary → summary → kept → attachments → hooks。下游恢复/渲染/差分逻辑都默认这条"压缩后最小可恢复链路"，改顺序会引发级联兼容问题。

可用于书中的事实表述：
- 压缩后的消息顺序不是实现细节，而是系统各层之间的接口协议。
- 任何修改这个顺序的"优化"，都会在恢复、渲染、差分等下游环节引发难以追踪的兼容问题。

### 28) preservedSegment 是 compact↔resume 的契约字段，记录保留段的 head/anchor/tail 供恢复期重连
- 位置：`src/services/compact/compact.ts:351-371`（`annotateBoundaryWithPreservedSegment` 函数注释）
- 注释明确说：这是 compact↔resume 的契约字段：记录保留段 head/anchor/tail，让 `loadTranscriptFile` 能在恢复期做 parent 重连，避免"保留了消息但链断了"。suffix-preserving（反应式压缩，保留最后一段）和 prefix-preserving（部分压缩，保留开头）两种模式的 anchorUuid 含义不同。

可用于书中的事实表述：
- 压缩不只是"生成摘要"，还要在 boundary 消息上记录足够的元数据，让恢复时能重建消息链。
- 这个元数据字段是 compact 和 resume 两个系统之间的显式接口，不是隐式约定。

### 29) compact 请求本身也可能 prompt-too-long，有专门的截断重试逻辑
- 位置：`src/services/compact/compact.ts:466-495`（PTL retry 注释）
- 注释明确说：CC-1180：compact 请求本身命中 prompt-too-long 时，截断最旧的 API round groups 并重试，而不是让用户卡住。截断后同时更新 `forkContextMessages`，因为 forked-agent 路径从这里读取，不从 messages 参数读取。

可用于书中的事实表述：
- 压缩系统本身也需要处理"压缩请求太长"的情况，这是一个递归问题：用来缩短上下文的操作，本身也可能因为上下文太长而失败。
- 解法是截断最旧的内容后重试，而不是直接报错——这体现了"尽量恢复，最后才报错"的设计倾向。

### 30) compact 后重新注入 delta attachments，让模型在第一个 post-compact turn 就有完整工具上下文
- 位置：`src/services/compact/compact.ts:567-589`（delta attachment 重注入注释）
- 注释明确说：压缩吃掉了之前的 delta attachments。重新从当前状态 announce，让模型在 post-compact 第一轮就有工具/指令上下文。空消息历史 → diff against nothing → 宣告完整集合。

可用于书中的事实表述：
- 压缩不只是截断历史，还要重建模型需要的"当前状态快照"——工具列表、MCP 指令、Agent 列表都需要重新注入。
- 这说明压缩后的第一轮对话，系统需要做比普通轮次更多的准备工作。

### 31) session memory 的触发是双重阈值：token 增量是硬门槛，tool call 次数是软门槛
- 位置：`src/services/SessionMemory/sessionMemory.ts:134-187`（`shouldExtractMemory` 函数注释）
- 注释明确说：token 阈值是硬门槛（hard gate）。tool-call 次数单独满足不能触发提取，必须等 token 阈值也满足。这让提取与有意义的上下文增长对齐，而不是在每次 tool-heavy burst 时触发。`lastMemoryMessageUuid` 是连续性游标，不只是"最近看到的消息"标记。

可用于书中的事实表述：
- 记忆更新的触发不是"有变化就更新"，而是"变化足够大才更新"——token 增量是主要判断依据。
- 这防止了在短对话或密集工具调用时频繁触发，避免记忆文件被噪声化。

### 32) session memory 用 forked agent 执行，主会话继续响应用户，记忆更新在旁路完成
- 位置：`src/services/SessionMemory/sessionMemory.ts:321-333`（`runForkedAgent` 调用注释）
- 注释明确说：通过 forked agent 执行提取，隔离主线程对话状态：主会话继续响应用户，记忆更新在旁路完成并回写同一 memoryPath。`createMemoryFileCanUseTool` 只允许对指定 memoryPath 做 FileEdit，任何其他工具调用都被拒绝。

可用于书中的事实表述：
- 记忆更新是异步旁路操作，不阻塞主对话。这是"后台整理"模式的具体实现。
- 最小权限不只是安全设计，也是隔离副作用的工程手段：forked agent 只能改记忆文件，不能意外影响主会话状态。
