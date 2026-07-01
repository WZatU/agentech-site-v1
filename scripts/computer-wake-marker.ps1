$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$logDir = Join-Path $repoRoot ".robot-stream-logs"
$logPath = Join-Path $logDir "computer-power-schedule.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Add-Content -Path $logPath -Value "[$(Get-Date -Format o)] Wake task ran."

