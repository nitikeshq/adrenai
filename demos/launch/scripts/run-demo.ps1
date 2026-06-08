param(
  [switch]$PrepareOnly
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$fixture = Join-Path $repoRoot "demos/launch/fixtures/before"
$workRoot = Join-Path $repoRoot "demos/launch/.work"
$demoRepo = Join-Path $workRoot "checkout-before"
$cli = Join-Path $repoRoot "dist/main.js"

Set-Location $repoRoot

if (-not (Test-Path $cli)) {
  Write-Host "Building the current AdrenAI CLI..."
  corepack pnpm build
}

if (Test-Path $demoRepo) {
  $resolvedDemoRepo = (Resolve-Path $demoRepo).Path
  $resolvedWorkRoot = (Resolve-Path $workRoot).Path
  if (-not $resolvedDemoRepo.StartsWith($resolvedWorkRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to reset a demo repository outside $resolvedWorkRoot"
  }
  Remove-Item -LiteralPath $demoRepo -Recurse -Force
}
New-Item -ItemType Directory -Path $workRoot -Force | Out-Null
Copy-Item -LiteralPath $fixture -Destination $demoRepo -Recurse

Write-Host ""
Write-Host "Prepared launch demo repository:"
Write-Host "  $demoRepo"

if ($PrepareOnly) {
  exit 0
}

function Invoke-DemoStep {
  param(
    [string]$Title,
    [string[]]$Arguments
  )
  Write-Host ""
  Write-Host "=== $Title ===" -ForegroundColor Cyan
  & node $cli @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Demo step failed: $Title"
  }
}

Invoke-DemoStep "1. Inspect the existing repository" @("inspect", $demoRepo)
Invoke-DemoStep "2. Recommend a repository-aware setup" @("recommend", $demoRepo)
Invoke-DemoStep "3. Preview quality gates" @("check", $demoRepo)
Invoke-DemoStep "4. Preview native agent configuration" @(
  "apply",
  $demoRepo,
  "--agents=codex,claude-code,github-copilot,cursor,kiro"
)
Invoke-DemoStep "5. Apply approved configuration" @(
  "apply",
  $demoRepo,
  "--write",
  "--agents=codex,claude-code,github-copilot,cursor,kiro"
)
Invoke-DemoStep "6. Verify instruction health" @("doctor", $demoRepo)
Invoke-DemoStep "7. Verify managed-file drift" @("drift", $demoRepo)
Invoke-DemoStep "8. Validate locked configuration" @("validate", $demoRepo)

Write-Host ""
Write-Host "Demo complete. Generated repository:" -ForegroundColor Green
Write-Host "  $demoRepo"
