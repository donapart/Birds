Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File ""D:\Projekte\Birds\scripts\start_ngrok_background.ps1""", 0, False
