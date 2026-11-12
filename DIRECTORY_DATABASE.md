# DIRECTORY_DATABASE.md — Master Placement-Target Database

> Master database of verified listing/distribution targets for this product and future MCP products
> built on the same stack (Z.ai / GLM MCP servers, quota UI, Claude Code / Cursor / Cline integrations).
> Companion to [PLACEMENTS.md](PLACEMENTS.md), which tracks **per-channel submission status**; this file
> tracks the **candidate universe** (what exists, how to submit, fit assessment).
>
> Every entry below was verified via live web search results or a successful fetch (November 2026).
> Dead or unverifiable sites were dropped rather than padded in. Current total: **94 confirmed targets**
> across 7 categories.

---

## 1. MCP server directories / registries (21)

| Name | URL | Lists | How to submit | Fit |
|---|---|---|---|---|
| Official MCP Registry | registry.modelcontextprotocol.io | MCP servers (server.json metadata) | Free; `mcp-publisher` CLI, GitHub or DNS-verified namespace; no review | **High** — feeds most other directories automatically |
| Glama | glama.ai/mcp/servers | Open-source MCP servers + remote connectors | Free; auto-imports registry; claim via `/.well-known/glama.json`; $49/mo boost | **High** — largest independent index, health-checked |
| mcp.so | mcp.so (+/submit) | MCP servers, remote servers, clients | Free form (repo URL), slow queue; $39 one-time = instant + dofollow + badge | **High** — ~2.2M visits/yr claimed |
| mcpservers.org | mcpservers.org | MCP servers ("Awesome MCP Servers", 9,800+) | Free form, review ≤2 wks; $39 = 24h review + dofollow | **High** |
| PulseMCP | pulsemcp.com | MCP servers + usage stats | Submissions PAUSED; publish to official registry and it imports later | **Medium** (do registry first, then wait) |
| MCP Market | mcpmarket.com | MCP servers + Agent Skills (50,999 listed) | Free form, 4–6 wk queue; $29 = 24h + Official badge | **High** |
| Smithery | smithery.ai | MCP servers (directory survives; proxy shut down 31 Oct 2026, now run by Arcade.dev) | Free; add HTTPS URL at /new, gateway scans tools; vendor verification checklist | **High** (only if a hosted/HTTP endpoint exists) |
| cursor.directory | cursor.directory | Cursor MCP servers + plugins | Free; submit GitHub repo (Agent Plugins format) | **High** |
| Docker MCP Catalog | github.com/docker/mcp-registry | Local (Dockerfile) + remote (HTTP) MCP servers | Free PR with `server.yaml`; Docker team review, test credentials via form; MIT/Apache OK, GPL not | **Medium** |
| Microsoft MCP Center | mcp.microsoft.com | Curated ~110 servers for Azure/API Center customers | Free; comment on a GitHub issue, 1–2 wk onboarding | **Medium** |
| LobeHub MCP Marketplace | lobehub.com | MCP servers + skills (97k+) | Free via `lhm` CLI (@lobehub/market-cli) + GitHub login; likely already crawled — claim it | **Medium** |
| mcp.directory | mcp.directory | MCP servers (3k+) | Free; GitHub repo URL, auto-pulls metadata, ≤24h; imports official registry; claim for badge | **Medium** |
| mcp-get | mcp-get.com | npm/PyPI MCP packages | Free; package ownership only (no hosted-only servers) | **Medium** — we're an npm package |
| API Tracker | apitracker.io | MCP servers (165k results) + APIs | Free submit form, manual accuracy review; registry servers auto-listed | **Medium** |
| OpenTools | opentools.ai | AI tools + MCP servers | MCP launch page: listing + 4 days homepage + social posts; **paid** ($199/yr per Submitator's checkout check) | **Medium** (only if paid is OK) |
| ProtocolProbe | protocolprobe.com | MCP registry aggregator (mirrors official registry) | Automatic from official registry (nothing to submit) | **Medium** — free byproduct of registry publish |
| AgenticSkills | agenticskills.io/submit | Agent skills + MCP servers | Free form (name, repo/MCP URL, clients), reviewed | **High** — accepts both skills and MCP servers |
| SkillForAgents | skillforagents.com/submit | Claude skills + MCP servers | Free; structured GitHub issue, no account | **High** |
| Anthropic Connectors Directory | claude.ai org settings (portal; docs on anthropic.com) | Remote MCP connectors inside Claude.ai | Team/Enterprise plan + OAuth 2.0 + 7 policy acknowledgments + test account; human review | **Low** — requires OAuth, plugin is API-key based |
| AIBase MCP Directory | aibase.com | Chinese/global MCP server directory | Chinese AI portal; submission/收录 form | **High** for CN GLM audience |
| mcpservers.com | mcpservers.com | MCP servers (905) | No working submit form (checked 13 Sep 2026); passive | **Low** |

## 2. Claude Code / Claude Skills marketplaces & directories (10)

| Name | URL | Lists | How to submit | Fit |
|---|---|---|---|---|
| SkillsMP | skillsmp.com | Agent skills (3.6M SKILL.md indexed from public GitHub) | Free; publish a public repo with SKILL.md and it gets indexed; independent, not Anthropic-affiliated | **High** if we ship a skill wrapper |
| Agensi | agensi.io | Paid skill marketplace (14k+ skills, 13k users), MCP-native (mcp.agensi.io) | Creator account, vetted + 8-point security scan; **paid listings** | **Medium** (see rev-share notes at end) |
| Claude Marketplace | claudemarketplace.net | Skills, MCP servers, plugin marketplaces, CLIs | Free; email submission, hand review ≤2 business days | **High** — explicitly accepts MCP servers |
| Claude Skills Hub | claudeskillsgithub.com | Curated Claude skills + repos | Free submit on site | **Medium** |
| Awesome Claude | awesomeclaude.ai | Claude tools, skills, MCP servers, plugins, cheatsheets | Submit via site form/contact | **Medium** |
| Smithery Skills | smithery.ai/skills | Claude/agent skills alongside MCP servers | Free; same Smithery account flow | **Medium** |
| ClawHub (OpenClaw) | docs.openclaw.ai/clawhub; github.com/openclaw/clawhub | OpenClaw skills + plugins registry | Free; publish via `openclaw` CLI commands | **Medium** — big, fast-growing agent userbase |
| SkillsLLM | skillsllm.com | Agent skills indexed from GitHub | Auto-indexing aggregator; claim/submit | **Low** |
| anthropics/skills | github.com/anthropics/skills | Anthropic's official Agent Skills repo | PR / issue to maintainers (curated) | **Medium** — hard bar, high halo |
| tons-of-skills-marketplace | github.com/jeremylongshore/tons-of-skills-marketplace | Claude Code plugin marketplace (installable via `/plugin marketplace add`) | PR to add your plugin | **Low** — small reach |

## 3. Coding-agent plugin/ecosystem directories (9)

| Name | URL | Lists | How to submit | Fit |
|---|---|---|---|---|
| Cursor Marketplace (official) | cursor.com/marketplace | ~490 open-source plugins incl. MCP | Publisher application; manual review of every plugin AND update; open source required | **High** if a Cursor plugin wrapper is shipped |
| Cline MCP Marketplace | cline.bot/mcp-marketplace; github.com/cline/mcp-marketplace | MCP servers, one-click install in Cline | PR to cline/mcp-marketplace repo | **High** |
| Roo Code Marketplace | docs.roocode.com/features/marketplace | Extensions: MCPs + Modes in Roo Code | PR/submit per their marketplace docs | **High** |
| Kilo Marketplace | kilo.ai/docs/customize/marketplace | MCP + skills in Kilo Code | Run their validation/generation commands, then submit MCP entry + catalog | **High** |
| Gemini CLI Extensions Gallery | geminicli.com/extensions; github.com/gemini-cli-extensions | Gemini CLI extensions (46+ repos, MCP server extensions featured) | Publish extension per Google's guide (github.com/gemini-cli-extensions) | **Medium** |
| Zed Extensions | zed.dev/extensions | Zed editor extensions | Free; publish per zed.dev/docs/extensions/publishing (accepted license required) | **Medium** |
| awesome-opencode | github.com/awesome-opencode/awesome-opencode | OpenCode plugins, themes, agents | PR | **Medium** |
| Trae MCP | docs.trae.ai/ide/model-context-protocol | MCP servers usable in Trae IDE | Trae MCP docs incl. "How to Submit Your MCP Server" guide (verify current form — snippet seen without full URL) | **Medium** |
| JetBrains Marketplace | plugins.jetbrains.com | IDE plugins (e.g. plugin 26071 "MCP Server") | Account + upload; JetBrains review | **Low** — only if a JetBrains plugin wrapper is built |

## 4. Generic AI tool directories that accept free submissions (17)

| Name | URL | Lists | How to submit | Fit |
|---|---|---|---|---|
| There's An AI For That | theresanaiforthat.com | AI tools (largest general dir) | Free submit form (paid promotion optional) | **Medium** |
| Futurepedia | futurepedia.io | AI tools | Free submit form | **Medium** |
| Toolify.ai | toolify.ai | 30,000+ AI tools | Free (slow queue) + paid expedite | **Medium** |
| Futuretools.io | futuretools.io/submit-a-tool | AI tools (Matt Wolfe) | Free form, hand-reviewed by Matt | **Medium** |
| aitools.fyi | aitools.fyi | AI tools | Free submit | **Low** |
| AIcyclopedia | aicyclopedia.com | AI tools/news/learning | Free "Submit A Tool" | **Low** |
| TopAI.tools | topai.tools/submit | AI tools (2,472+ free tools) | **Paid only** — Submitator verified pay-first Stripe flow | **Low** |
| Dang.ai | dang.ai | AI tools | Free submit | **Low** |
| ToolPilot.ai | toolpilot.ai | 20,000+ AI tools, revenue rankings | Free + paid (DR 76) | **Low** |
| AI Tools Directory | aitoolsdirectory.com/submit-tool | AI tools | Free form + paid "Fast Track" (DR 67) | **Low** |
| SaaSHub | saashub.com/submit | SaaS/software alternatives | Free submit, approval required | **Medium** — alternatives angle |
| Neil Patel AI Tools | neilpatel.com (AI tools section) | Curated AI tools | Free + paid (per IdeaProof Aug 2026 audit) | **Low** |
| EliteAI Tools | eliteai.tools | Premium-curated AI tools | Free + paid (DR 45) | **Low** |
| AI Library | library.phygital.plus | AI tools library | Free + paid (DR 46) | **Low** |
| AI Startups | aistartups.net | AI startups | Free + paid (DR 43) | **Low** |
| Good AI Tools | goodaitools.com | AI tools + badge program | Free + paid (DR 40) | **Low** |
| AI Tools Marketer | aitoolsmarketer.com | Marketing AI tools | Free + paid (DR 37) | **Low** |

## 5. GitHub awesome-lists / contribution catalogs (10)

| Name | URL | Lists | How to submit | Fit |
|---|---|---|---|---|
| awesome-mcp-servers | github.com/punkpeye/awesome-mcp-servers | MCP servers (~4,600 entries, 97k★) | PR; CI requires a Glama listing + score badge first; 3,857 open PRs (queue is long) | **High** |
| awesome-remote-mcp-servers | github.com/jaw9c/awesome-remote-mcp-servers | Hosted/remote MCP servers (Glama health badge) | PR | **High** for the hosted endpoint |
| awesome-claude-code | github.com/hesreallyhim/awesome-claude-code | Claude Code tools, hooks, integrations | PR | **High** |
| awesome-claude-skills | github.com/travisvn/awesome-claude-skills | Claude skills, resources, tools (15.8k★ per skillsllm) | PR | **High** |
| awesome-claude-skills (Composio) | github.com/ComposioHQ/awesome-claude-skills | Claude skills | PR | **Medium** |
| awesome-deepseek-integrations | github.com/deepseek-ai/awesome-deepseek-integrations | Official DeepSeek integrations list | PR/issue to DeepSeek org | **High** — DeepSeek audience |
| awesome-deepseek-agent | github.com/deepseek-ai/awesome-deepseek-agent | Official guides for DeepSeek + coding agents | PR/issue | **High** |
| awesome-gemini-cli | github.com/Piebald-AI/awesome-gemini-cli | Gemini CLI tools/extensions/resources | PR | **Medium** |
| awesome-claude-plugins | github.com/quemsah/awesome-claude-plugins | Automated Top-100 Claude Code plugin index (crawler + adoption metrics) | PR / get crawled on GitHub | **Medium** |
| Github-Ranking-AI Top100 | github.com/yuxiaopeng/Github-Ranking-AI (Top100/Claude.md) | Ranked AI plugin/skill repos across harnesses | PR | **Low** |

## 6. Chinese developer platforms / GLM-Zhipu ecosystem (13)

| Name | URL | Lists | How to submit | Fit |
|---|---|---|---|---|
| ModelScope 魔搭 | modelscope.cn (MCP 广场 section) | Models, datasets, MCP services | Free account; publish MCP/repo or post in community | **High** — Alibaba ecosystem, MCP-native |
| Gitee 码云 | gitee.com | Open-source repos | Free; mirror repo; GVP (最有价值项目) application for featured status | **High** |
| GitCode (AtomGit) | gitcode.com | Open-source repos + blogs | Free account, push repo; CSDN-integrated | **Medium** |
| OSCHINA 开源中国 | oschina.net | Open-source news/projects (软件收录) | Submit 开源软件收录 / news tip | **Medium** |
| OpenCSG | opencsg.com | LLM models, agents, repos (传神社区) | Free account; publish agent/repo | **Medium** |
| HelloGitHub | hellogithub.com | Monthly curated interesting GitHub repos | 自荐 (self-recommendation) form; picked for monthly issue (28th) | **Medium** |
| linux.do | linux.do | Dev forum, very active | Account required (trust-level gated); post in 分享 category | **Medium** — the GLM/APIKey crowd lives here |
| V2EX | v2ex.com/go/create | 分享创造 node — self-made products | Free account; post your work | **Medium** |
| SegmentFault 思否 | segmentfault.com | Dev Q&A/articles | Free account; write article | **Medium** |
| Juejin 稀土掘金 | juejin.cn | Dev articles | Free account; write article | **Medium** |
| CSDN | mp.csdn.net (创作中心) | Dev articles + GitCode | Free account; publish; wide CN SEO reach | **Medium** |
| Zhihu 知乎 | zhihu.com (专栏/回答) | Q&A, columns | Free account; answer GLM/Z.ai MCP questions + column post | **Medium** |
| AI工具集 ai-bot.cn | ai-bot.cn | CN AI tools navigation (收录提交) | 提交收录 form on site | **Medium** — huge CN consumer/dev traffic |

## 7. Other: agent stores, launchpads, npm aggregators (14)

| Name | URL | Lists | How to submit | Fit |
|---|---|---|---|---|
| Product Hunt | producthunt.com | Product launches | Free account; scheduled launch | **Medium** |
| DevHunt | devhunt.org | Dev tools only, GitHub-auth voting | Free launch (or $19 featured per Nov 2026 guide) | **High** — dev-tool audience |
| Uneed | uneed.best/submit-a-tool | Tech product launches | Free queue; paid guaranteed homepage + DR75 backlink | **Medium** |
| AlternativeTo | alternativeto.net | Software alternatives | Free "Suggest new application" (per official FAQ) | **Medium** — list as "Z.ai search alternative" |
| BetaList | betalist.com | Early startup listings | Free submit (active — verified via live startup pages) | **Low** |
| agent.ai (Dharmesh Shah) | agent.ai | AI agent directory/network | Free account; register agent | **Medium** |
| AI Agents Directory | aiagentsdirectory.com | AI agents marketplace (DR 43) | Free + paid tiers | **Medium** |
| AgentHunter | agenthunter.io | AI agents (DR 60) | Free + paid | **Medium** |
| AI Agents List | aiagentslist.com | AI tools/agents (600+) | Free eligibility check, then **paid listing** | **Low** |
| npm Registry | npmjs.com | npm packages (the package itself IS the listing) | `npm publish`; good README = search visibility | **High** — free, and npm search is where devs look |
| Libraries.io | libraries.io | Auto-index of 9.96M packages incl. npm | Automatic on publish; claim account for extras | **Medium** |
| Snyk Advisor | snyk.io/advisor | npm package health/security scores | Automatic on publish | **Low** |
| GitHub Topics | github.com/topics | Topic pages (mcp, zai, glm, deepseek, claude…) | Free; add topics to the repo | **Medium** — github.com/topics/mcp is a real discovery surface |
| DEV.to + Hacker News (Show HN) | dev.to; news.ycombinator.com/showhn | Dev articles / "something you've made" | Free account; publish announcement / Show HN post per guidelines | **Medium** |

---

## (a) Top-20 priority ranking (reach/effort for an MCP-integration plugin)

1. **Official MCP Registry** — 30 min, seeds mcp.directory, ProtocolProbe, API Tracker, PulseMCP later
2. **Glama** — claim + health-check creds (badge shows on 3 lists)
3. **mcp.so** — free submit (biggest consumer MCP traffic)
4. **mcpservers.org** — free submit
5. **punkpeye/awesome-mcp-servers PR** — do AFTER Glama badge (CI requires it)
6. **cursor.directory** — repo submit
7. **Cline MCP Marketplace PR** — one-click install audience
8. **SkillsMP** — ship one SKILL.md wrapper, get indexed free
9. **awesome-remote-mcp-servers PR** — if a hosted Z.ai endpoint exists
10. **claudemarketplace.net** — free hand-reviewed listing, accepts MCP servers
11. **Smithery** — add HTTP URL (skills + servers)
12. **MCP Market** — free queue (skip the $29 unless timing matters)
13. **LobeHub** — claim the crawled entry via `lhm`
14. **npm + GitHub Topics** — README SEO (npm search, topic pages)
15. **Docker MCP Catalog PR** — Docker Desktop users
16. **deepseek-ai/awesome-deepseek-integrations PR** — exact target audience
17. **AgenticSkills + SkillForAgents** — free, accept skills+MCP, low effort
18. **DevHunt / Product Hunt** — one launch week each
19. **ai-bot.cn + AIBase** — Chinese GLM ecosystem reach
20. **PulseMCP** — already handled if #1 done (imports registry)

## (b) Honest waste-of-time notes

- **Long-tail generic AI directories (EliteAI, AI Library, AI Startups, GoodAI, AI Tools Marketer, aitools.fyi, AIcyclopedia, Dang.ai)**: near-zero referral traffic for a dev/agent plugin; only worth it for backlink volume. Do There's An AI For That / Futurepedia / Toolify / Futuretools and stop.
- **Anthropic Connectors Directory**: needs Team/Enterprise + OAuth 2.0 + test account; an API-key MCP plugin can't qualify without real work.
- **PulseMCP**: submissions paused (Sep 2026); only the registry path works.
- **goose extensions**: closed to new servers; **modelcontextprotocol/servers community list**: retired in favor of the registry.
- **Dead/broken per the Sep 2026 audit**: mcpindex.net (HTTP 522), claudemcp.com, mcp-server-directory.com (no response), mcpservers.com / MCP Server Finder / MCP Server Spot (no working submit form), "MCP Store" (loads, GitHub-login submit, but URL not verifiable this session — excluded). claudecodemarketplace.com: fetch failed twice (network error) — existence unconfirmed, excluded. Windsurf, Codex CLI, Copilot: no public third-party directories exist at all — config docs only.
- **B2B review platforms** (G2/Capterra/SourceForge/Trustpilot): wrong audience for an OSS dev plugin.
- **$39 "dofollow" fast lanes** (mcp.so, mcpservers.org): you're buying a link on one of 20–50k pages; same entry appears free weeks later.
- **Smithery proxy shutdown happened 31 Oct 2026** — if we list there, verify the listing doesn't point at a dead `run.tools` / `server.smithery.ai` URL.

## (c) Marketplaces that SELL skills (with revenue share)

- **Agensi.io** (verified live): the main paid SKILL.md marketplace — 14,000+ skills, 13,000+ users, 1,800+ creators. **Creators keep 70%, flat 30% platform fee**, payouts via Stripe or USDC on Solana (Zoneless); one-time or subscription pricing; MCP-native delivery via mcp.agensi.io so agents buy/install skills on demand. Free skills can also be listed.
- **TopAI.tools**: paid-only submissions (Stripe checkout before the form) — tool directory, not skills.
- **OpenTools.ai**: $199/yr MCP launch package.
- **MCP Market**: $29 one-time fast-lane; **mcp.so / mcpservers.org**: $39 one-time fast-lanes (paid listings, not skills).
- **aiagentslist.com**: free eligibility check, paid listings.
- Paid-adjacent but free-to-list: Uneed (paid = guaranteed homepage), DevHunt ($19 featured).
