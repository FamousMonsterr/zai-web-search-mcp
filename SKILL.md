---
name: zai-web-search
description: Set up Z.ai (GLM Coding Plan) web search and reading MCP servers (web_search_prime, webReader, zread, vision) in any MCP-capable AI coding agent, using the user's own GLM Coding Plan API key.
---

# Z.ai Web Search Setup

1. Get the user's GLM Coding Plan API key (https://z.ai/manage-apikey/apikey-list) and make sure it is exported as `ZAI_API_KEY`.
2. Register the MCP servers (any MCP client, e.g. `claude mcp add -t http <name> <url> --header "Authorization: Bearer $ZAI_API_KEY"`):
   - Search: `https://api.z.ai/api/mcp/web_search_prime/mcp`
   - Page reading: `https://api.z.ai/api/mcp/web_reader/mcp`
   - GitHub repos: `https://api.z.ai/api/mcp/zread/mcp`
3. International `api.z.ai` only — mainland China accounts use open.bigmodel.cn (not supported).
4. Verify with one test search after connecting.
5. DeepSeek Harness users get a full plugin (quota chip + vision bridge): https://github.com/FamousMonsterr/zai-web-search-mcp
