<!-- Thank you! One pull request = one change. AI agents: read AGENTS.md first. -->

## What does this pull request change?

<!-- Describe the change in one or two sentences. -->

## Why is it needed?

<!-- Link the issue it fixes (Fixes #N) or explain the motivation. -->

## How did you test it?

<!-- Required: paste the exact commands you ran and their output. -->

```text
node --check index.js        ->
node --check client.js       ->
pwsh -NoProfile -File verify.ps1 ->   (must end with ALL CHECKS PASSED)
```

## Checklist

- [ ] No secrets, API keys, or personal paths are included anywhere.
- [ ] `scripts/*.mjs` and `*.ps1` files contain ASCII characters only.
- [ ] Syntax checks pass (`node --check` on every changed .js file).
- [ ] `verify.ps1` ends with `ALL CHECKS PASSED` (if the change touches Z.ai calls).
- [ ] Documentation (`README.md` / `AGENTS.md` / locale files) updated if needed.

## Star reminder ⭐

If you haven't already, star the repo — it helps others find it:
https://github.com/FamousMonsterr/zai-web-search-mcp/stargazers
