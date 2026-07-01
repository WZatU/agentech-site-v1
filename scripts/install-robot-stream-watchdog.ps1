$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$watchdogScript = Join-Path $scriptDir "robot-stream-watchdog.ps1"
$hiddenWatchdogScript = Join-Path $scriptDir "robot-stream-watchdog-hidden.vbs"
$taskName = "Agentech Robot Stream Bridge Watchdog"

foreach ($key in @("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OBS_WEBSOCKET_URL")) {
  $value = [Environment]::GetEnvironmentVariable($key, "Process")
  if ($value) {
    [Environment]::SetEnvironmentVariable($key, $value, "User")
  }
}

$missing = @("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OBS_WEBSOCKET_URL") | Where-Object {
  -not [Environment]::GetEnvironmentVariable($_, "User")
}

if ($missing.Count -gt 0) {
  throw "Missing user environment variables: $($missing -join ', '). Set them in this PowerShell window before installing the watchdog."
}

$wscript = "$env:SystemRoot\System32\wscript.exe"
$action = New-ScheduledTaskAction `
  -Execute $wscript `
  -Argument "//B //Nologo `"$hiddenWatchdogScript`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Host
Start-ScheduledTask -TaskName $taskName

Write-Host "Installed and started: $taskName"
Write-Host "Logs: .robot-stream-logs\robot-stream-bridge.out.log and .robot-stream-logs\robot-stream-bridge.err.log"
