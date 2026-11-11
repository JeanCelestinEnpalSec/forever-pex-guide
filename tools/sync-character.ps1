<#
.SYNOPSIS
  Met à jour les fiches du site à partir du fichier exporté par l'addon.

.DESCRIPTION
  Cherche WTF\Account\<COMPTE>\SavedVariables\PexGuideExport.lua dans WoW Forever et le convertit
  en docs\data\characters\<perso>.json avec tools\sv2json.js (Node.js 20+ requis).
  Les anciennes fiches sont sauvegardées dans docs\data\characters\.backup (rien n'est supprimé).
  Ensuite : commit + push (GitHub Desktop ou git).

.EXAMPLE
  .\tools\sync-character.ps1
  .\tools\sync-character.ps1 -Account "MONCOMPTE"
#>
param(
  [string]$WowPath = "C:\Program Files (x86)\World of Warcraft\_forever_",
  [string]$Account = ""
)

$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js introuvable. Installe-le (https://nodejs.org, version LTS) ou utilise l'import de fichier sur la page Fiches perso."
}

$accounts = Join-Path $WowPath "WTF\Account"
if (-not (Test-Path $accounts)) { throw "Dossier introuvable : $accounts. Indique le bon chemin avec -WowPath." }

$files = Get-ChildItem -Path $accounts -Directory |
  Where-Object { $Account -eq "" -or $_.Name -eq $Account } |
  ForEach-Object { Join-Path $_.FullName "SavedVariables\PexGuideExport.lua" } |
  Where-Object { Test-Path $_ }

if (-not $files) {
  throw "Aucun PexGuideExport.lua trouvé. En jeu : /pge puis /reload (ou déconnexion), et relance ce script."
}

foreach ($file in $files) {
  Write-Host "Conversion de $file"
  & node (Join-Path $repo "tools\sv2json.js") $file (Join-Path $repo "docs\data\characters")
  if ($LASTEXITCODE -ne 0) { throw "La conversion a échoué pour $file" }
}

& node (Join-Path $repo "tools\validate-data.js")
Write-Host "Fiches à jour. Il reste à faire un commit et un push."
