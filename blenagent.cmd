@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\blender_agent\blenagent.ps1" %*
exit /b %ERRORLEVEL%
