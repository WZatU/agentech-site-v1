$ErrorActionPreference = "Stop"

foreach ($taskName in @("Agentech Computer Wake 8AM", "Agentech Computer Sleep 10PM")) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed: $taskName"
}

