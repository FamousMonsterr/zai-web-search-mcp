# PLACEMENTS.md — where this plugin (and future MCP products) are listed

Status database for directory/marketplace placements. Reuse for any future MCP product:
copy the Queue column, swap names/links. Last full sweep: 2026-11-09 (v1.8.0).

## ✅ Done

| Channel | Where | Status |
|---|---|---|
| npm | https://www.npmjs.com/package/dsh-zai-web-search-mcp | live, `latest` 1.8.0 |
| Anthropic official catalog | https://github.com/anthropics/claude-plugins-official/pull/7046 | in review |
| DeepSeek official list | https://github.com/deepseek-ai/awesome-deepseek-integration/pull/798 | in review |
| punkpeye/awesome-mcp-servers | https://github.com/punkpeye/awesome-mcp-servers/pull/19030 | in review (CI fixed) |
| Cline marketplace | https://github.com/cline/mcp-marketplace/issues/3658 | in review |
| Cursor Directory | https://cursor.directory/plugins/zai-web-search-mcp | live |
| mcpservers.org | /submit | accepted, moderating |
| SkillsMP | auto-index of root SKILL.md | pending crawl |
| DeepSeek Harness discussions | https://github.com/deepseek-ai/deepseek-harness/discussions/12761 | posted |
| ZCode plugins marketplace | https://github.com/zai-org/zcode-plugins/issues/182 | posted |
| GitHub topics on repo | mcp, mcp-server, web-search, deepseek, zai, glm, deepseek-harness, agent-skills | set |

## 🖐 Manual TODO (forms prepared / auth blocks automation)

| Channel | Action |
|---|---|
| MCP Market | https://mcpmarket.com/submit — form filled, needs email famousmonster@ya.ru + inbox confirm |
| ComposioHQ/awesome-claude-skills PR | branch pushed: https://github.com/ComposioHQ/awesome-claude-skills/compare/master...FamousMonsterr:awesome-claude-skills:add-zai-web-search |
| hesreallyhim/awesome-claude-code PR | branch pushed: https://github.com/hesreallyhim/awesome-claude-code/compare/main...FamousMonsterr:awesome-claude-code:add-zai-web-search-mcp |
| DevHunt | https://devhunt.org/account/tools/new — form filled, needs 1 screenshot upload |
| Agensi (paid-skip) | draft at /dashboard/submit — publish only if we ever go paid |
| mcp.so | /submit — URL field rejects automation input, submit by hand |
| claude.com/marketplace | Cloudflare gate — submit by hand (plugin dir: claude-code-plugin/) |
| OpenTools | https://opentools.ai — submit pending sign-in state check |

## 📋 Queue (not started, free)

- Official MCP Registry — add `server.json` + `npx mcp-publisher login github && npx mcp-publisher publish server.json` (device-flow GitHub auth)
- GitHub MCP Registry (github.com/mcp) — new 2026 official catalog
- Smithery — add `smithery.yaml`, `npx -y @smithery/cli publish` (GitHub sign-in at smithery.ai for API key)
- SourceForge listing (DR~93, OSS-fit)
- ModelScope MCP / linux.do / V2EX / Juejin / OSChina — CN block (email codes needed)
- AlternativeTo "suggest application" (angle: alternative to paid search MCPs)
- e2b-dev/awesome-ai-agents, BehiSecc/awesome-claude-skills, awesome-mcp-devtools PRs

## ⏸ Skipped (with reason)

- PulseMCP — submissions paused Nov 2026
- Docker MCP Catalog — requires verified containers
- Composio toolkits, Trae — curated by vendor
- SkillHQ / Sigrix / Agensi — paid marketplaces (we ship free; revisit only if paid tiers appear)
- G2 / Capterra / aitools.fyi ($30) / BetaList — wrong audience or paid
- Windsurf / Roo Code — no directory / shut down

## References

- Meta-list of directories: https://www.apideck.com/blog/mcp-server-directories
- Submission-process skill (no URLs, process only): https://github.com/coreyhaines31/marketingskills/blob/main/skills/directory-submissions/SKILL.md
- Full 81-platform verified sweep: see chat log 2026-11-09 / this file's Done+Manual+Queue sections
