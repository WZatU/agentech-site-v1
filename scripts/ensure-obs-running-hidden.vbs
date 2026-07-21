Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
launcherScript = fso.BuildPath(scriptDir, "ensure-obs-running.ps1")

command = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & launcherScript & Chr(34)

Set shell = CreateObject("WScript.Shell")
result = shell.Run(command, 0, True)
WScript.Quit result
