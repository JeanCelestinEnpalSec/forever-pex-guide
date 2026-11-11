<#
.SYNOPSIS
  Installe (ou met à jour) l'addon Pex Guide Export dans WoW Forever.

.DESCRIPTION
  Copie addon\PexGuideExport dans <WoW>\_forever_\Interface\AddOns\PexGuideExport.
  Si une version existe déjà, elle est d'abord copiée dans Interface\AddOns-sauvegardes (rien n'est supprimé).

.EXAMPLE
  .\tools\install-addon.ps1
  .\tools\install-addon.ps1 -WowPath "D:\Jeux\World of Warcraft\_forever_"
#>
param(
  [string]$WowPath = "C:\Program Files (x86)\World of Warcraft\_forever_"
)

$ErrorActionPreference = "Stop"
$source = Join-Path $PSScriptRoot "..\addon\PexGuideExport"
$addons = Join-Path $WowPath "Interface\AddOns"
$target = Join-Path $addons "PexGuideExport"

if (-not (Test-Path $addons)) {
  throw "Dossier AddOns introuvable : $addons. Indique le bon chemin avec -WowPath."
}

if (Test-Path $target) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backup = Join-Path $WowPath "Interface\AddOns-sauvegardes\PexGuideExport-$stamp"
  New-Item -ItemType Directory -Force -Path (Split-Path $backup) | Out-Null
  Copy-Item -Path $target -Destination $backup -Recurse
  Write-Host "Ancienne version sauvegardée : $backup"
}

New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item -Path (Join-Path $source "*") -Destination $target -Recurse -Force
Write-Host "Pex Guide Export installé dans $target"
Write-Host "En jeu : /reload, puis /pge pour forcer une photo de ta fiche."
