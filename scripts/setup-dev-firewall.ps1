param(
  [ValidateRange(1, 65535)]
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Open PowerShell as Administrator and run this script to allow LAN access to the dev server.'
}

$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$ruleName = "LMS-Dev-TCP-$Port"
$existing = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  $existing | Set-NetFirewallRule -Enabled True -Direction Inbound -Action Allow -Profile Private,Public -Program $nodePath -Protocol TCP -LocalPort $Port -RemoteAddress LocalSubnet
} else {
  New-NetFirewallRule -Name $ruleName -DisplayName "LMS development server (TCP $Port, local subnet)" -Enabled True -Direction Inbound -Action Allow -Profile Private,Public -Program $nodePath -Protocol TCP -LocalPort $Port -RemoteAddress LocalSubnet | Out-Null
}

Get-NetFirewallRule -Name $ruleName | Select-Object DisplayName, Enabled, Action, Profile
