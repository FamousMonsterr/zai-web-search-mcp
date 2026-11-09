# PLACEMENTS.md — where this plugin (and future MCP products) are listed

Status database for directory/marketplace placements. Reuse for any future MCP product:
copy the Queue column, swap names/links. Last full sweep: 2026-11-09 (v1.8.0).

## ✅ Done

| Official MCP Registry | https://registry.modelcontextprotocol.io — io.github.FamousMonsterr/zai-coding-plan-mcp@1.0.1 | published |
| npm (wrapper server) | https://www.npmjs.com/package/zai-coding-plan-mcp | live 1.0.1 |

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
| ~~Agensi~~ | **SKIPPED — Stripe-payout marketplace, we ship free-only.** Draft left unpublished at /dashboard/submit |
| mcp.so | /submit — URL field rejects automation input, submit by hand |
| claude.com/marketplace | Cloudflare gate — submit by hand (plugin dir: claude-code-plugin/) |
| OpenTools | https://opentools.ai — submit pending sign-in state check |
| Glama | https://glama.ai/mcp/servers — "Add MCP server" → repo URL → attach root Dockerfile; score badge auto-renders (PR #19030 already carries the badge markup) |

## 📋 Queue (not started, free)

~~Official MCP Registry~~ — DONE, see Done + `npx mcp-publisher login github && npx mcp-publisher publish server.json` (device-flow GitHub auth). Feeds API Tracker, Glama, MCP Market and most aggregators at once — do FIRST. Namespace: `io.github.famousmonsterr/...` (org namespaces broken from CLI)
- GitHub MCP Registry (github.com/mcp) — new 2026 official catalog
- **API Tracker** (apitracker.io) — 165k results; free submit form, manual review — cross-check from Apideck
- **Microsoft MCP Center** — comment on GitHub issue at Azure/mcp-center (109 curated, 1–2 weeks onboarding) — cross-check from Apideck
- **Prowl** — claim-by-domain agent index — cross-check from Apideck
- SourceForge listing (DR~93, OSS-fit)
- ModelScope MCP / linux.do / V2EX / Juejin / OSChina — CN block (email codes needed)
- AlternativeTo "suggest application" (angle: alternative to paid search MCPs)
- e2b-dev/awesome-ai-agents, BehiSecc/awesome-claude-skills, awesome-mcp-devtools PRs

## ⚠ Corrections from Apideck cross-check (2026-10-31 data)

- Smithery: CLI publish/accounts were shut down on Oct 31 2026 (Arcade acquisition) — it is now a plain directory; do NOT chase smithery.yaml publishing. Remove `run.tools`/`smithery.ai` URLs from client configs everywhere.
- awesome-mcp-servers CI prefers entries that are already listed on **Glama with a score badge** — our PR #19030 may be asked for that; Glama listing needs glama.json in repo root with maintainer usernames (repo is under a personal account — claim flow differs).
- MCP Market may already auto-list us from GitHub ("unclaimed") — claim it after the free-queue review.
- modelcontextprotocol/servers third-party list is RETIRED — do not PR there.
- goose extensions directory is closed — moving to the official registry.

## ⏸ Skipped (with reason)

- PulseMCP — submissions paused Nov 2026
- Docker MCP Catalog — requires verified containers
- Composio toolkits, Trae — curated by vendor
- SkillHQ / Sigrix / Agensi — paid, Stripe-based payouts/kyc (we ship free; not using)
- G2 / Capterra / aitools.fyi ($30) / BetaList — wrong audience or paid
- Windsurf / Roo Code — no directory / shut down

## References

- Meta-list of directories: https://www.apideck.com/blog/mcp-server-directories
- Submission-process skill (no URLs, process only): https://github.com/coreyhaines31/marketingskills/blob/main/skills/directory-submissions/SKILL.md
- Full 81-platform verified sweep: see chat log 2026-11-09 / this file's Done+Manual+Queue sections
