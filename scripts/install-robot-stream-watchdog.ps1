$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$watchdogScript = Join-Path $scriptDir "robot-stream-watchdog.ps1"
$hiddenWatchdogScript = Join-Path $scriptDir "robot-stream-watchdog-hidden.vbs"
$taskName = "Agentech Robot Stream Bridge Watchdog"

foreach ($key in @("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ROBOT_RUNNER_SECRET", "OBS_WEBSOCKET_URL", "OBS_WEBSOCKET_PASSWORD", "ROBOT_HOST", "ROBOT_SSH_USER", "ROBOT_SSH_KEY", "ROBOT_REMOTE_DIR", "ROBOT_PYTHON", "ROBOT_LOCAL_PYTHON", "ROBOT_STREAM_START_HOUR", "ROBOT_STREAM_END_HOUR", "ROBOT_STREAM_PREP_SECONDS", "ROBOT_STREAM_POLL_MS")) {
  $value = [Environment]::GetEnvironmentVariable($key, "Process")
  if ($value) {
    [Environment]::SetEnvironmentVariable($key, $value, "User")
  }
}

if (-not [Environment]::GetEnvironmentVariable("ROBOT_STREAM_START_HOUR", "User")) {
  [Environment]::SetEnvironmentVariable("ROBOT_STREAM_START_HOUR", "0", "User")
}

if (-not [Environment]::GetEnvironmentVariable("ROBOT_STREAM_END_HOUR", "User")) {
  [Environment]::SetEnvironmentVariable("ROBOT_STREAM_END_HOUR", "24", "User")
}

$missing = @("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ROBOT_HOST", "ROBOT_SSH_USER") | Where-Object {
  -not [Environment]::GetEnvironmentVariable($_, "User")
}

if ($missing.Count -gt 0) {
  throw "Missing user environment variables: $($missing -join ', '). Set them in this PowerShell window before installing the watchdog."
}

$wscript = "$env:SystemRoot\System32\wscript.exe"
$action = New-ScheduledTaskAction `
  -Execute $wscript `
  -Argument "//B //Nologo `"$hiddenWatchdogScript`""
$trigger = New-ScheduledTaskTrigger -Daily -At 12:00AM
$trigger.Repetition = New-ScheduledTaskTrigger -Once -At 12:00AM -RepetitionInterval (New-TimeSpan -Minutes 1) -RepetitionDuration (New-TimeSpan -Hours 24) | Select-Object -ExpandProperty Repetition
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Host
Start-ScheduledTask -TaskName $taskName

Write-Host "Installed and started: $taskName"
Write-Host "Logs: .robot-stream-logs\robot-stream-bridge.out.log and .robot-stream-logs\robot-stream-bridge.err.log"
