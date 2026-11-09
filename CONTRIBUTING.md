# Contributing to zai-web-search-mcp

Thanks for your interest in improving this plugin! Contributions from humans
**and AI agents** are welcome. AI agents: read [`AGENTS.md`](AGENTS.md) first —
it explains the repository in simple English and lists the rules below in
more detail.

## Ground rules

1. **No secrets, ever.** The Z.ai API key must never appear in code, logs,
   issues, pull requests, or screenshots. It lives only in
   `~/.dsh/.credentials.yaml` on your machine.
2. **One pull request = one change.** Keep diffs small and reviewable.
3. **Test before you push** (see below).
4. **Scripts stay ASCII-only** (`scripts/*.mjs`, `*.ps1`); human-language text
   belongs in `README.md` / `locale/*.json`.
5. **Windows PowerShell is `pwsh`** (PowerShell 7+), never the legacy
   `powershell.exe`.

## Setup

```powershell
git clone https://github.com/FamousMonsterr/zai-web-search-mcp.git
cd zai-web-search-mcp
pwsh -NoProfile -File install.ps1     # needs DeepSeek Harness installed & run once
```

## Before opening a pull request

```powershell
node --check index.js
node --check client.js
node --check scripts/install.mjs
node --check scripts/verify.mjs
pwsh -NoProfile -File verify.ps1       # live test; must end with ALL CHECKS PASSED
```

CI runs the syntax checks on every push; the live check needs your own
credential, so run it locally and mention the result in the PR.

## Bugs and feature requests

Open an issue first (Bug report or Feature request template) unless the fix
is trivial. Fill in every field of the template — the templates tell you
exactly what information maintainers need.

## Star it ⭐

If this repository was useful to you — even if you only read the code and
never send a PR — please star it:
<https://github.com/FamousMonsterr/zai-web-search-mcp/stargazers>.
Stars help other people find the plugin.
