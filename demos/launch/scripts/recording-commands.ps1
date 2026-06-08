$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$demoRepo = Join-Path $repoRoot "demos/launch/.work/checkout-before"
$cli = Join-Path $repoRoot "dist/main.js"

Set-Location $repoRoot

function Show-Command {
  param([string]$Command, [int]$PauseSeconds = 2)
  Write-Host ""
  Write-Host "> $Command" -ForegroundColor Green
  Start-Sleep -Seconds 1
  Invoke-Expression $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Recording command failed: $Command"
  }
  Start-Sleep -Seconds $PauseSeconds
}

& (Join-Path $PSScriptRoot "run-demo.ps1") -PrepareOnly

Show-Command "node `"$cli`" inspect `"$demoRepo`""
Show-Command "node `"$cli`" doctor `"$demoRepo`""
Show-Command "node `"$cli`" recommend `"$demoRepo`"" 3
Show-Command "node `"$cli`" check `"$demoRepo`""
Show-Command "node `"$cli`" apply `"$demoRepo`" --agents=codex,claude-code,github-copilot,cursor,kiro" 3
Show-Command "node `"$cli`" apply `"$demoRepo`" --write --agents=codex,claude-code,github-copilot,cursor,kiro"
Show-Command "node `"$cli`" doctor `"$demoRepo`""
Show-Command "node `"$cli`" drift `"$demoRepo`""
Show-Command "node `"$cli`" validate `"$demoRepo`"" 3
