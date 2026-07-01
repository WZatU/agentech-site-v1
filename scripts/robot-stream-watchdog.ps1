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

foreach ($key in @("OBS_WEBSOCKET_PASSWORD", "ROBOT_STREAM_START_HOUR", "ROBOT_STREAM_END_HOUR")) {
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

$startHourRaw = [Environment]::GetEnvironmentVariable("ROBOT_STREAM_START_HOUR", "Process")
if (-not $startHourRaw) {
  $startHourRaw = "8"
}
$endHourRaw = [Environment]::GetEnvironmentVariable("ROBOT_STREAM_END_HOUR", "Process")
if (-not $endHourRaw) {
  $endHourRaw = "22"
}
$startHour = [double]$startHourRaw
$endHour = [double]$endHourRaw
$now = Get-Date
$hourValue = $now.Hour + ($now.Minute / 60.0) + ($now.Second / 3600.0)

$existing = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -and $_.CommandLine -like "*robot-stream-bridge.mjs*" } |
  Select-Object -First 1

if (($hourValue -lt $startHour) -or ($hourValue -ge $endHour)) {
  if ($existing) {
    Stop-Process -Id $existing.ProcessId -Force
    Add-Content -Path $stdoutLog -Value "[$($now.ToString("o"))] Stopped bridge outside operating window $($startHour):00-$($endHour):00."
  }
  exit 0
}

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
