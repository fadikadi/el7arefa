# Run in PowerShell from Explorer: Right-click -> Run with PowerShell,
# or:  powershell -ExecutionPolicy Bypass -File .\publish-github.ps1
Set-Location $PSScriptRoot
$gh = Join-Path ${env:ProgramFiles} "GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) {
  Write-Error "Install GitHub CLI: winget install GitHub.cli"
  exit 1
}

& $gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "GitHub login (browser will open)..."
  & $gh auth login --hostname github.com --git-protocol https -w
}

Write-Host "Publishing to github.com/.../el7arefa ..."
& $gh repo create el7arefa --public --source=. --remote=origin --push

if ($LASTEXITCODE -eq 0) {
  Write-Host "OK — code is on GitHub. Next: Render -> New Blueprint -> el7arefa -> Root Directory workspace -> DATABASE_URL"
  exit 0
}

Write-Host "If the repo already exists, run:"
Write-Host '  git remote add origin https://github.com/YOUR_USER/el7arefa.git'
Write-Host '  git push -u origin main'
exit 1
