---
name: zai-web-search
description: Set up Z.ai (GLM Coding Plan) web search and reading MCP servers in any MCP-capable agent. Use when the user wants web_search_prime or webReader from their Z.ai subscription.
---

# Z.ai Web Search Setup

1. Ask the user for their GLM Coding Plan API key (https://z.ai/manage-apikey/apikey-list) and make sure it is exported as `ZAI_API_KEY`.
2. Add the MCP servers from this plugin's `.mcp.json` to the agent's MCP config (`~/.claude.json` mcpServers, or `claude mcp add -t http <name> <url> --header "Authorization: Bearer $ZAI_API_KEY"`).
3. Endpoints: `https://api.z.ai/api/mcp/web_search_prime/mcp` (search), `https://api.z.ai/api/mcp/web_reader/mcp` (page reading), `https://api.z.ai/api/mcp/zread/mcp` (GitHub repos). International api.z.ai only — not for mainland China.
4. Verify with a test search after connecting. Full plugin with quota chip for DeepSeek Harness: https://github.com/FamousMonsterr/zai-web-search-mcp
