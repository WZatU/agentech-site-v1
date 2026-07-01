$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$logDir = Join-Path $repoRoot ".robot-stream-logs"
$logPath = Join-Path $logDir "computer-power-schedule.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Add-Content -Path $logPath -Value "[$(Get-Date -Format o)] Sleep task requested suspend."

Add-Type -Namespace AgentechPower -Name NativeMethods -MemberDefinition @"
[System.Runtime.InteropServices.DllImport("PowrProf.dll", SetLastError = true)]
public static extern bool SetSuspendState(bool hibernate, bool forceCritical, bool disableWakeEvent);
"@

[AgentechPower.NativeMethods]::SetSuspendState($false, $true, $false) | Out-Null

