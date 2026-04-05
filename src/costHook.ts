// costHook.ts — React 费用摘要副作用钩子
// 职责：在 React 组件挂载时注册 process.exit 监听器，
// 会话结束时自动打印费用摘要并将费用快照持久化到 project config。
// 仅在用户拥有 console billing 访问权限时打印费用（hasConsoleBillingAccess）。
import { useEffect } from 'react'
import { formatTotalCost, saveCurrentSessionCosts } from './cost-tracker.js'
import { hasConsoleBillingAccess } from './utils/billing.js'
import type { FpsMetrics } from './utils/fpsTracker.js'

export function useCostSummary(
  getFpsMetrics?: () => FpsMetrics | undefined,
): void {
  useEffect(() => {
    const f = () => {
      if (hasConsoleBillingAccess()) {
        process.stdout.write('\n' + formatTotalCost() + '\n')
      }

      saveCurrentSessionCosts(getFpsMetrics?.())
    }
    process.on('exit', f)
    return () => {
      process.off('exit', f)
    }
  }, [])
}
