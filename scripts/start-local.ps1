param([string]$BackendDir = (Join-Path $PSScriptRoot '../../regulatory-evidence-mvp-v0.11.0'), [switch]$SkipSetup, [switch]$Tunnel)
$ErrorActionPreference = 'Stop'
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) { throw 'Install uv and Python >=3.11 first (see README).' }
$taskBackendRoot = (Resolve-Path -LiteralPath $BackendDir).Path
$taskLaunchArgs = @('run', '--directory', $taskBackendRoot, '--locked', 'python', (Join-Path $PSScriptRoot 'run_local.py'), '--backend', $taskBackendRoot)
if ($SkipSetup) { $taskLaunchArgs += '--skip-setup' }
if ($Tunnel) { $taskLaunchArgs += '--tunnel' }
& uv @taskLaunchArgs
exit $LASTEXITCODE
