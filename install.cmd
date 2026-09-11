@echo off
rem Install the dep CLI on Windows without PowerShell: only cmd, curl.exe (Windows 10 1803+) and dep itself.
rem
rem   curl.exe -fsSL -o %TEMP%\install-dep.cmd https://raw.githubusercontent.com/maxios/DEP/main/install.cmd && %TEMP%\install-dep.cmd
rem   set DEP_VERSION=v0.3.3 before running to pin a release.
setlocal

set "REPO=maxios/DEP"
if "%DEP_HOME%"=="" set "DEP_HOME=%USERPROFILE%\.dep"
set "BIN=%DEP_HOME%\bin"
set "TARGET=%BIN%\dep.exe"

if /I not "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
  echo Unsupported architecture: %PROCESSOR_ARCHITECTURE% ^(only x64 builds are published^)
  exit /b 1
)

if "%DEP_VERSION%"=="" (
  set "URL=https://github.com/%REPO%/releases/latest/download/dep-windows-x64.exe"
) else (
  set "URL=https://github.com/%REPO%/releases/download/%DEP_VERSION%/dep-windows-x64.exe"
)

echo Installing DEP CLI...
echo   Platform: windows-x64
echo   URL: %URL%

if not exist "%BIN%" mkdir "%BIN%"
curl.exe -fSL --progress-bar -o "%TARGET%.download" "%URL%" || (
  echo The download failed. Check the URL above, or download it in a browser and run: dep-windows-x64.exe setup
  exit /b 1
)
if exist "%TARGET%" move /Y "%TARGET%" "%TARGET%.prev" >nul
move /Y "%TARGET%.download" "%TARGET%" >nul

rem dep finishes the job itself: user PATH (via reg), Claude Desktop entry when a project is given, and a self-check.
"%TARGET%" setup %*
