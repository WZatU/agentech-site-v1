$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$watchdogScript = Join-Path $scriptDir "robot-stream-watchdog.ps1"
$logDir = Join-Path (Split-Path -Parent $scriptDir) ".robot-stream-logs"
$logPath = Join-Path $logDir "robot-stream-gateway-restart.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# This restarts only the trusted Node bridge. It deliberately does not touch
# OBS, Camo Studio, Windows power state, or the robot controller.
$bridges = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -and $_.CommandLine -like "*robot-stream-bridge.mjs*" })

foreach ($bridge in $bridges) {
  Stop-Process -Id $bridge.ProcessId -ErrorAction SilentlyContinue
  Add-Content -LiteralPath $logPath -Value "[$(Get-Date -Format o)] Stopped Gateway bridge PID $($bridge.ProcessId)."
}

$deadline = (Get-Date).AddSeconds(10)
do {
  $remaining = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine -like "*robot-stream-bridge.mjs*" })
  if ($remaining.Count -eq 0) {
    break
  }
  Start-Sleep -Milliseconds 200
} while ((Get-Date) -lt $deadline)

if ($remaining.Count -gt 0) {
  throw "Gateway bridge did not stop within 10 seconds; Windows was not restarted."
}

& $watchdogScript
if ($LASTEXITCODE -ne 0) {
  throw "Gateway watchdog restart failed with exit code $LASTEXITCODE."
}

Add-Content -LiteralPath $logPath -Value "[$(Get-Date -Format o)] Gateway bridge restart completed without restarting Windows or OBS."
