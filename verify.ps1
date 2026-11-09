# Verifies every Z.ai integration the plugin uses (MCP search, quota, usage).
#   pwsh -NoProfile -File verify.ps1
$ErrorActionPreference = 'Stop'

$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
$runtimeNode = Join-Path $dshHome 'dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe'
$verifier = Join-Path $PSScriptRoot 'scripts/verify.mjs'

if (-not (Test-Path $runtimeNode)) { throw "dsh runtime node not found: $runtimeNode" }
& $runtimeNode $verifier
exit $LASTEXITCODE
