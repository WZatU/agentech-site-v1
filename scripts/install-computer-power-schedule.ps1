$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$wakeScript = Join-Path $scriptDir "computer-wake-marker.ps1"
$sleepScript = Join-Path $scriptDir "computer-sleep.ps1"
$powershell = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"

$wakeTaskName = "Agentech Computer Wake 8AM"
$sleepTaskName = "Agentech Computer Sleep 10PM"

powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP RTCWAKE 1 | Out-Host
powercfg /setdcvalueindex SCHEME_CURRENT SUB_SLEEP RTCWAKE 1 | Out-Host
powercfg /change standby-timeout-ac 0 | Out-Host
powercfg /setactive SCHEME_CURRENT | Out-Host

$wakeAction = New-ScheduledTaskAction `
  -Execute $powershell `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$wakeScript`""
$wakeTrigger = New-ScheduledTaskTrigger -Daily -At 8:00AM
$wakeSettings = New-ScheduledTaskSettingsSet -WakeToRun -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

Register-ScheduledTask -TaskName $wakeTaskName -Action $wakeAction -Trigger $wakeTrigger -Settings $wakeSettings -Principal $principal -Force | Out-Host

$sleepAction = New-ScheduledTaskAction `
  -Execute $powershell `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$sleepScript`""
$sleepTrigger = New-ScheduledTaskTrigger -Daily -At 10:00PM
$sleepSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

Register-ScheduledTask -TaskName $sleepTaskName -Action $sleepAction -Trigger $sleepTrigger -Settings $sleepSettings -Principal $principal -Force | Out-Host

Write-Host "Installed:"
Write-Host "- ${wakeTaskName}: wake at 8:00 AM every day"
Write-Host "- ${sleepTaskName}: sleep at 10:00 PM every day"
Write-Host "- AC idle sleep disabled so the computer stays awake while plugged in between 8:00 AM and 10:00 PM"
Write-Host "Wake from full shutdown is not controlled by Windows; leave the computer sleeping, hibernating, or powered with wake timers enabled."
