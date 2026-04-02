# ch06 QueryEngine 论点树（示例）

这是《Claude Code 系统能力解析》第6章的论点树，作为 tech-writing-coach skill 的参考示例。

---

**核心主张**：QueryEngine 把"先持久化后执行"固定为系统约束，调用方无法绕过。

```
核心主张：QueryEngine 把"先持久化后执行"固定为系统约束，调用方无法绕过。
├── 论点一：顺序颠倒时，恢复能力静默消失
│   ├── --resume 失效精确路径：queue-operation 被过滤 → getLastSessionLog 返回 null
│   └── 写入成本可控：SSD 4ms，按场景分策略（交互 await / bare fire-and-forget）
├── 论点二：两阶段替换防止状态污染，不引入新类型
│   ├── 第一个 processUserInputContext：真实 setMessages，允许斜杠命令修改
│   ├── 第二个 processUserInputContext：空操作 setMessages，锁定后续写入
│   └── turn 级/会话级状态区分是隐式约定（已知技术债）
├── 论点三：职责分层让两层可独立推理
│   └── QueryEngine 管跨 turn，query.ts 管单轮
└── 边界与可迁移原则：写入时序决定恢复边界；不可分割操作或无意义中间状态时原则不适用
```

---

## 用法说明

写作时，先输出这棵树让读者（或合作者）确认方向，再动笔写正文。

**核心主张的判断标准**：能被反驳。
- ✅ "QueryEngine 把'先持久化后执行'固定为系统约束，调用方无法绕过"——可反驳（有人会问：真的无法绕过吗？bare 模式呢？）
- ❌ "本章介绍 QueryEngine 的工作原理"——陈述意图，无法反驳

**论点的判断标准**：每个论点独立回答"为什么核心主张成立"，且互不重叠。

**细节/证据的判断标准**：可以是代码路径、数据、反例、源码锚点，不是泛化描述。
