# Security Policy

## Supported versions

Only the latest `main` branch is supported.

## Reporting a vulnerability

Do **not** open a public issue for security problems. Use GitHub's private
reporting: *Security → Report a vulnerability* on this repository.

Please include:

- what you found and how it could be abused,
- steps or a proof of concept,
- the file(s) involved.

You will get a response within a few days. Please do not disclose the issue
publicly until it is fixed.

## Secret hygiene

This plugin never stores credentials in the repository. The Z.ai API key is
read from the Harness credential store (`~/.dsh/.credentials.yaml`,
reference `ZAI_API_KEY`) and is never sent to the browser or written to
logs. If you find the key leaked anywhere in code, history, or logs, report
it immediately as above — and rotate the key in your Z.ai account.
