// tools/WebFetchTool/prompt.ts — WebFetchTool 工具名称与描述
// 职责：定义 WebFetchTool 的工具名称、描述文本和二级模型提示词。
//
// 关键常量：
//   - WEB_FETCH_TOOL_NAME = 'WebFetch'：工具名称
//   - DESCRIPTION：工具描述，包含使用场景和注意事项
//
// 描述要点：
//   - 抓取 URL 内容，HTML 转 Markdown
//   - 使用小型快速模型处理内容（Claude Haiku）
//   - 优先使用 MCP 提供的 web fetch 工具（限制更少）
//   - HTTP 自动升级为 HTTPS
//
// makeSecondaryModelPrompt(url, prompt)：
//   生成发送给 Haiku 的提示词，指导其从抓取内容中提取所需信息
//
// 关联：
//   - WebFetchTool.ts：调用此文件的常量注册工具
//   - utils.ts：调用 makeSecondaryModelPrompt 生成摘要提示词
export const WEB_FETCH_TOOL_NAME = 'WebFetch'

export const DESCRIPTION = `
- Fetches content from a specified URL and processes it using an AI model
- Takes a URL and a prompt as input
- Fetches the URL content, converts HTML to markdown
- Processes the content with the prompt using a small, fast model
- Returns the model's response about the content
- Use this tool when you need to retrieve and analyze web content

Usage notes:
  - IMPORTANT: If an MCP-provided web fetch tool is available, prefer using that tool instead of this one, as it may have fewer restrictions.
  - The URL must be a fully-formed valid URL
  - HTTP URLs will be automatically upgraded to HTTPS
  - The prompt should describe what information you want to extract from the page
  - This tool is read-only and does not modify any files
  - Results may be summarized if the content is very large
  - Includes a self-cleaning 15-minute cache for faster responses when repeatedly accessing the same URL
  - When a URL redirects to a different host, the tool will inform you and provide the redirect URL in a special format. You should then make a new WebFetch request with the redirect URL to fetch the content.
  - For GitHub URLs, prefer using the gh CLI via Bash instead (e.g., gh pr view, gh issue view, gh api).
`

export function makeSecondaryModelPrompt(
  markdownContent: string,
  prompt: string,
  isPreapprovedDomain: boolean,
): string {
  const guidelines = isPreapprovedDomain
    ? `Provide a concise response based on the content above. Include relevant details, code examples, and documentation excerpts as needed.`
    : `Provide a concise response based only on the content above. In your response:
 - Enforce a strict 125-character maximum for quotes from any source document. Open Source Software is ok as long as we respect the license.
 - Use quotation marks for exact language from articles; any language outside of the quotation should never be word-for-word the same.
 - You are not a lawyer and never comment on the legality of your own prompts and responses.
 - Never produce or reproduce exact song lyrics.`

  return `
Web page content:
---
${markdownContent}
---

${prompt}

${guidelines}
`
}
