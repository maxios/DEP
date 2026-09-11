# Install the dep CLI on Windows into %USERPROFILE%\.dep\bin (or $env:DEP_HOME\bin).
#
#   irm https://raw.githubusercontent.com/maxios/DEP/main/install.ps1 | iex
#   $env:DEP_VERSION = 'v0.3.1'; irm … | iex     # pin a release
$ErrorActionPreference = 'Stop'

$repo = 'maxios/DEP'
$home = if ($env:DEP_HOME) { $env:DEP_HOME } else { Join-Path $env:USERPROFILE '.dep' }
$bin = Join-Path $home 'bin'
$target = Join-Path $bin 'dep.exe'

$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -ne 'AMD64') { throw "Unsupported architecture: $arch (only x64 builds are published)" }

$url = if ($env:DEP_VERSION) {
  "https://github.com/$repo/releases/download/$($env:DEP_VERSION)/dep-windows-x64.exe"
} else {
  "https://github.com/$repo/releases/latest/download/dep-windows-x64.exe"
}

Write-Host "Installing DEP CLI..."
Write-Host "  Platform: windows-x64"
Write-Host "  URL: $url"

New-Item -ItemType Directory -Force -Path $bin | Out-Null
$download = "$target.download"
Invoke-WebRequest -Uri $url -OutFile $download -UseBasicParsing
if (Test-Path $target) { Move-Item -Force $target "$target.prev" }
Move-Item -Force $download $target

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not ($userPath -split ';' | Where-Object { $_ -eq $bin })) {
  [Environment]::SetEnvironmentVariable('Path', "$bin;$userPath", 'User')
  $env:Path = "$bin;$env:Path"
  Write-Host "  Added $bin to your user PATH (open a new terminal for other windows to see it)"
}

Write-Host ""
Write-Host "DEP CLI installed to $target"
& $target version
