@echo off
setlocal
title Voxiva Setup

echo.
echo   Installing Voxiva for this Windows user...
echo   Administrator rights are not required.
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if errorlevel 1 (
  echo.
  echo   Installation failed. Keep this window open and report the error above.
  pause
  exit /b 1
)

call "%USERPROFILE%\.voxiva\bin\voxiva.cmd"
