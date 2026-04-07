// =============================================================================
// src/query/deps.ts — query() 的 I/O 依赖注入接口
//
// 【模块职责】
//   定义 QueryDeps 接口，将 query() 的 I/O 依赖（模型调用/压缩/UUID）
//   抽象为可注入的函数类型，便于测试时注入 fake 替代真实实现。
//
// 【设计动机】
//   callModel / autocompact 等函数在 6-8 个测试文件中被 spyOn，
//   每次都需要 module-import-and-spy 样板代码。通过 deps 注入，
//   测试可以直接传入 fake 函数，无需 mock 模块。
//
// 【使用 typeof fn 的好处】
//   签名与真实实现自动保持同步，无需手动维护类型定义。
//
// 【当前 4 个依赖】
//   callModel   — queryModelWithStreaming（模型 API 调用）
//   microcompact — microcompactMessages（微压缩）
//   autocompact  — autoCompactIfNeeded（自动压缩）
//   uuid         — randomUUID（唯一 ID 生成）
// =============================================================================

import { randomUUID } from 'crypto'
import { queryModelWithStreaming } from '../services/api/claude.js'
import { autoCompactIfNeeded } from '../services/compact/autoCompact.js'
import { microcompactMessages } from '../services/compact/microCompact.js'

// -- deps

// I/O dependencies for query(). Passing a `deps` override into QueryParams
// lets tests inject fakes directly instead of spyOn-per-module — the most
// common mocks (callModel, autocompact) are each spied in 6-8 test files
// today with module-import-and-spy boilerplate.
//
// Using `typeof fn` keeps signatures in sync with the real implementations
// automatically. This file imports the real functions for both typing and
// the production factory — tests that import this file for typing are
// already importing query.ts (which imports everything), so there's no
// new module-graph cost.
//
// Scope is intentionally narrow (4 deps) to prove the pattern. Followup
// PRs can add runTools, handleStopHooks, logEvent, queue ops, etc.
export type QueryDeps = {
  // -- model
  callModel: typeof queryModelWithStreaming

  // -- compaction
  microcompact: typeof microcompactMessages
  autocompact: typeof autoCompactIfNeeded

  // -- platform
  uuid: () => string
}

export function productionDeps(): QueryDeps {
  return {
    callModel: queryModelWithStreaming,
    microcompact: microcompactMessages,
    autocompact: autoCompactIfNeeded,
    uuid: randomUUID,
  }
}
