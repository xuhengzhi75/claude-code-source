# ch13 挖掘任务卡：最小可用 Agent 骨架

**交给**：startheart  
**写作侧**：小许  
**背景**：ch13 是全书最有实操价值的章节，但目前"最小"的边界画得不够清楚——读者知道需要三层，但不知道"每层如果缺失，具体会发生什么灾难"，也不知道"最小可用"和"能用但脆"的区别在哪。

---

## 你需要挖的问题（按优先级排）

### 🔴 必答

**Q1：`main()` 的快路径分流，每条路径的实际代价差多少？**  
ch13 说轻操作不需要拉起完整系统。  
想知道的是：完整主流程（`import('../main.js')`）启动时会加载哪些模块？重量级操作是哪些？`--version` 这类轻操作跳过了什么？代码里有没有延迟加载（dynamic import）的证据？  
- 目标文件：`src/entrypoints/cli.tsx`，L33-L310，把动态 import 的位置全找出来

**Q2：`query.ts#L561` 那条注释（"推导是否继续，不依赖 stop_reason"）背后，stop_reason 到底有多不可靠？**  
现有章节提到"不同 provider/SDK 的 stop_reason 细节不总一致"，但这是个推断还是有真实案例？  
想知道的是：代码里有没有注释或兼容性处理说明某个 provider/SDK 的 stop_reason 表现不一致？具体是哪个 provider 出了问题？  
- 目标文件：`src/query.ts`，L555-L580，把完整注释和判断逻辑截出来

**Q3：`QueryEngine.ts#L443` 的"先落盘再执行"设计，在恢复时是如何使用这条落盘记录的？**  
ch13 提到用户输入在执行前先写入 transcript，防止进程被杀后丢失。  
想知道的是：恢复时是怎么读取这条记录的？恢复后的执行会从哪里继续？有没有去重机制防止同一条用户输入被执行两次？  
- 目标文件：`src/QueryEngine.ts`，L443 附近，再搜索 transcript 相关的读取逻辑

---

### 🟡 加分项

**Q4：`while(true)` 循环的终止路径有几条？**  
ch13 说循环的终止条件是"没有 tool_use"，但这肯定不是唯一退出路径。  
想挖的是：循环里有几条 `return` 或 `break`？每条对应什么场景？哪些是正常退出，哪些是异常退出？把所有退出路径列出来，这是理解"最小骨架"必须知道的。  
- 目标文件：`src/query.ts`，`queryLoop()` 函数，从 L243 开始把所有退出点找出来

**Q5：能力层的"全集再过滤"，filter 具体过滤掉了什么？**  
ch13 提到 `filterToolsByDenyRules()`，但没说规则是什么。  
想挖的是：denyRules 有哪些维度？是工具名称白名单/黑名单，还是基于工具类型？有没有动态规则（比如根据用户权限级别过滤）？  
- 目标文件：`src/tools.ts`，L265 的 `filterToolsByDenyRules()`，把完整逻辑截出来

**Q6：`TOOL_DEFAULTS` 里的 `toAutoClassifierInput: () => ''` 是什么意思？**  
这个默认值意味着：安全相关的工具如果不显式实现 `toAutoClassifierInput`，会被跳过分类。  
想挖的是：AutoClassifier 是用来干什么的？`toAutoClassifierInput` 返回空字符串，在分类系统里会触发什么行为？代码注释里说"security-relevant tools must override"，有没有例子说明哪些工具确实覆盖了这个方法？  
- 目标文件：`src/Tool.ts`，搜索 `toAutoClassifierInput`，找所有有实现的工具

---

### 🟢 意外发现区

ch13 是"三层结构"章节，重点是"三层缺一不可"。如果你发现了"缺了某层会怎样"的具体代码证据（比如某个防御性检查，说明缺少某层真的出过问题），这类素材最有价值。

---

## startheart 填写区

> （待填写）

---

## 小许备注

这章改写的目标读者：打算自己从零搭 Agent 的工程师。改完之后他应该能说出"我知道为什么三层都要有，而不只是因为书上这么说"。填好后 commit 到 main。
