# Agent Role Templates v0

## 1. 架构侦察员（Architecture Scout）
职责：快速阅读仓库结构、关键源码与已有文档，输出系统分层、主链路和证据锚点。
产出：architecture notes、evidence map、核心文件导航。

## 2. 章节工程师（Chapter Builder）
职责：把架构笔记改写成面向弱技术读者的章节草稿。
产出：章节初稿、本章小结、读者导向解释。

## 3. 证据审校员（Evidence Reviewer）
职责：核对章节中的关键判断是否有源码依据，并标记 verified / inference / unsupported。
产出：证据校对清单、风险点清单。

## 4. 风格编辑（Style Editor）
职责：统一语气、压缩废话、降低 AI 味、统一术语。
产出：精修章节、术语统一建议、重复内容清单。

## 5. 业务 Agent 设计师（Business Agent Designer）
职责：把 Claude-Code-like 架构缩小为一个可落地的业务 Agent 方案。
产出：最小模块图、任务流、工具接口、恢复策略、迭代计划。
