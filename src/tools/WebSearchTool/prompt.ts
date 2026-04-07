// tools/WebSearchTool/prompt.ts — WebSearchTool 工具名称与描述
// 职责：定义 WebSearchTool 的工具名称和描述文本。
//
// 关键常量：
//   - WEB_SEARCH_TOOL_NAME = 'WebSearch'：工具名称
//   - getWebSearchPrompt()：动态生成工具描述（含当前月份年份）
//
// 描述要点：
//   - 允许 Claude 搜索网络并使用结果
//   - 提供最新信息（当前事件、近期数据）
//   - 结果以搜索结果块形式返回（含 Markdown 超链接）
//   - 注入当前月份年份（getLocalMonthYear）帮助模型判断信息时效性
//
// 关联：
//   - WebSearchTool.ts：调用此文件的常量和描述函数注册工具
//   - constants/common.ts：getLocalMonthYear 时间工具
import { getLocalMonthYear } from 'src/constants/common.js'

export const WEB_SEARCH_TOOL_NAME = 'WebSearch'

export function getWebSearchPrompt(): string {
  const currentMonthYear = getLocalMonthYear()
  return `
- Allows Claude to search the web and use the results to inform responses
- Provides up-to-date information for current events and recent data
- Returns search result information formatted as search result blocks, including links as markdown hyperlinks
- Use this tool for accessing information beyond Claude's knowledge cutoff
- Searches are performed automatically within a single API call

CRITICAL REQUIREMENT - You MUST follow this:
  - After answering the user's question, you MUST include a "Sources:" section at the end of your response
  - In the Sources section, list all relevant URLs from the search results as markdown hyperlinks: [Title](URL)
  - This is MANDATORY - never skip including sources in your response
  - Example format:

    [Your answer here]

    Sources:
    - [Source Title 1](https://example.com/1)
    - [Source Title 2](https://example.com/2)

Usage notes:
  - Domain filtering is supported to include or block specific websites
  - Web search is only available in the US

IMPORTANT - Use the correct year in search queries:
  - The current month is ${currentMonthYear}. You MUST use this year when searching for recent information, documentation, or current events.
  - Example: If the user asks for "latest React docs", search for "React documentation" with the current year, NOT last year
`
}
