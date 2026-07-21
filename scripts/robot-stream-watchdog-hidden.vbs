Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
watchdogScript = fso.BuildPath(scriptDir, "robot-stream-watchdog-loop.ps1")

Set processService = GetObject("winmgmts:\\.\root\cimv2")
Set processes = processService.ExecQuery("SELECT CommandLine FROM Win32_Process WHERE Name = 'powershell.exe'")

For Each process In processes
  If Not IsNull(process.CommandLine) Then
    If InStr(1, process.CommandLine, " -Command ", vbTextCompare) = 0 And _
       InStr(1, process.CommandLine, " -File ", vbTextCompare) > 0 And _
       InStr(1, process.CommandLine, "robot-stream-watchdog-loop.ps1", vbTextCompare) > 0 Then
      WScript.Quit 0
    End If
  End If
Next

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & watchdogScript & Chr(34)

Set shell = CreateObject("WScript.Shell")
shell.Run command, 0, False
