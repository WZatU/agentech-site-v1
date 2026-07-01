$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$bridgeScript = Join-Path $scriptDir "robot-stream-bridge.mjs"
$logDir = Join-Path $repoRoot ".robot-stream-logs"
$stdoutLog = Join-Path $logDir "robot-stream-bridge.out.log"
$stderrLog = Join-Path $logDir "robot-stream-bridge.err.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

foreach ($key in @("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OBS_WEBSOCKET_URL")) {
  if (-not [Environment]::GetEnvironmentVariable($key, "Process")) {
    $userValue = [Environment]::GetEnvironmentVariable($key, "User")
    if ($userValue) {
      [Environment]::SetEnvironmentVariable($key, $userValue, "Process")
    }
  }
}

$missing = @("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OBS_WEBSOCKET_URL") | Where-Object {
  -not [Environment]::GetEnvironmentVariable($_, "Process")
}

if ($missing.Count -gt 0) {
  Add-Content -Path $stderrLog -Value "[$(Get-Date -Format o)] Missing environment variables: $($missing -join ', ')"
  exit 1
}

$existing = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -and $_.CommandLine -like "*robot-stream-bridge.mjs*" } |
  Select-Object -First 1

if ($existing) {
  exit 0
}

$node = (Get-Command node.exe -ErrorAction Stop).Source

Start-Process `
  -FilePath $node `
  -ArgumentList @("`"$bridgeScript`"") `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog
