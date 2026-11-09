# Installs the zai-web-search-mcp plugin into the local DeepSeek Harness (dsh)
# desktop profile. Requires PowerShell 7+ (pwsh) and an installed DeepSeek
# Harness desktop (run it once so ~/.dsh is initialized).
#
# Usage (from the cloned repo folder):
#   pwsh -NoProfile -File install.ps1
#
# Optional: pass the API key via the environment so it is not echoed:
#   $env:ZAI_API_KEY = "<your GLM Coding Plan key>"; pwsh -NoProfile -File install.ps1
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
$runtimeNode = Join-Path $dshHome 'dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe'
$installer = Join-Path $PSScriptRoot 'scripts/install.mjs'

foreach ($p in @($runtimeNode, $installer)) {
    if (-not (Test-Path $p)) {
        throw "Required file not found: $p. Install the DeepSeek Harness desktop app and run it once, then retry."
    }
}

& $runtimeNode $installer --plugin $PSScriptRoot --dsh-home $dshHome
exit $LASTEXITCODE
