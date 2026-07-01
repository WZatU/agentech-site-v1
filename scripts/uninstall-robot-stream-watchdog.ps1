$ErrorActionPreference = "Stop"

$taskName = "Agentech Robot Stream Bridge Watchdog"
schtasks.exe /Delete /F /TN $taskName | Out-Host
Write-Host "Removed: $taskName"

