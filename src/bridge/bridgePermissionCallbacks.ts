// bridge/bridgePermissionCallbacks.ts — Bridge 模式权限回调类型定义
// 职责：定义 Bridge 模式下权限请求的回调接口，
// 允许远程用户（通过 claude.ai 网页端）响应本地工具的权限请求。
//
// 工作流程：
//   本地工具需要权限 → Bridge 将权限请求发送给远程用户
//   → 远程用户在网页端点击允许/拒绝 → Bridge 回调通知本地
//   → BridgePermissionResponse 携带决策（allow/deny）和可选的输入修改
import type { PermissionUpdate } from '../utils/permissions/PermissionUpdateSchema.js'

type BridgePermissionResponse = {
  behavior: 'allow' | 'deny'
  updatedInput?: Record<string, unknown>
  updatedPermissions?: PermissionUpdate[]
  message?: string
}

type BridgePermissionCallbacks = {
  sendRequest(
    requestId: string,
    toolName: string,
    input: Record<string, unknown>,
    toolUseId: string,
    description: string,
    permissionSuggestions?: PermissionUpdate[],
    blockedPath?: string,
  ): void
  sendResponse(requestId: string, response: BridgePermissionResponse): void
  /** Cancel a pending control_request so the web app can dismiss its prompt. */
  cancelRequest(requestId: string): void
  onResponse(
    requestId: string,
    handler: (response: BridgePermissionResponse) => void,
  ): () => void // returns unsubscribe
}

/** Type predicate for validating a parsed control_response payload
 *  as a BridgePermissionResponse. Checks the required `behavior`
 *  discriminant rather than using an unsafe `as` cast. */
function isBridgePermissionResponse(
  value: unknown,
): value is BridgePermissionResponse {
  if (!value || typeof value !== 'object') return false
  return (
    'behavior' in value &&
    (value.behavior === 'allow' || value.behavior === 'deny')
  )
}

export { isBridgePermissionResponse }
export type { BridgePermissionCallbacks, BridgePermissionResponse }
