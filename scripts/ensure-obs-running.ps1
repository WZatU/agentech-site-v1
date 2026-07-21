$ErrorActionPreference = "Stop"

$obsPath = "C:\Program Files\obs-studio\bin\64bit\obs64.exe"
$obsWorkingDirectory = Split-Path -Parent $obsPath
$safeModeMarker = Join-Path $env:APPDATA "obs-studio\safe_mode"
$logDirectory = "C:\AgentechRobotGateway\.robot-stream-logs"
$logPath = Join-Path $logDirectory "ensure-obs-running.log"

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

if (Get-Process -Name "obs64" -ErrorAction SilentlyContinue) {
  Add-Content -LiteralPath $logPath -Value "[$(Get-Date -Format o)] OBS is already running."
  exit 0
}

if (-not (Test-Path -LiteralPath $obsPath)) {
  Add-Content -LiteralPath $logPath -Value "[$(Get-Date -Format o)] OBS executable was not found at $obsPath."
  exit 1
}

if (Test-Path -LiteralPath $safeModeMarker) {
  Remove-Item -LiteralPath $safeModeMarker -Force
  Add-Content -LiteralPath $logPath -Value "[$(Get-Date -Format o)] Cleared the stale unclean-shutdown marker before launching OBS normally."
}

Start-Process `
  -FilePath $obsPath `
  -WorkingDirectory $obsWorkingDirectory `
  -ArgumentList @("--minimize-to-tray")

Start-Sleep -Seconds 5

if (Get-Process -Name "obs64" -ErrorAction SilentlyContinue) {
  Add-Content -LiteralPath $logPath -Value "[$(Get-Date -Format o)] OBS started successfully."
  exit 0
}

Add-Content -LiteralPath $logPath -Value "[$(Get-Date -Format o)] OBS did not remain running after launch."
exit 1
