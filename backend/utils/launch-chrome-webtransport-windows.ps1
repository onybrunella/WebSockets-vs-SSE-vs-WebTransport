# Chrome sous Windows → serveurs dans WSL (QUIC vers IP WSL).
# Éditer $WslBackend si le chemin WSL du projet diffère.

param(
    [string]$WslBackend = "/home/brunella/Documents/ESIEE/E4/S4/RECHERCHE/projet-recherche/backend"
)

$ErrorActionPreference = "Stop"

$ip = (wsl -e bash -c "source '$WslBackend/utils/wt-host.sh' && get_wt_ip").Trim()
$hashLine = wsl -e bash -c "grep WT_HASH_BASE64 '$WslBackend/../frontend/src/app/wt-config.ts'"
$hash = ($hashLine -replace ".*'([^']+)'.*", '$1').Trim()

$appUrl = "http://${ip}:4200"
$wtOrigin = "${ip}:3003"
$chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) {
    $chrome = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
}
if (-not (Test-Path $chrome)) {
    throw "Chrome introuvable. Installez Google Chrome ou adaptez le chemin dans ce script."
}

Write-Host "IP WSL/LAN: $ip"
Write-Host "Hash SPKI:  $hash"
Write-Host "URL app:    $appUrl"
Write-Host ""
Write-Host "Fermez toutes les fenêtres Chrome avant de continuer."

$profile = "$env:TEMP\chrome-webtransport-dev-win"
& $chrome `
    "--user-data-dir=$profile" `
    "--unsafely-treat-insecure-origin-as-secure=$appUrl" `
    "--ignore-certificate-errors" `
    "--ignore-certificate-errors-spki-list=$hash" `
    "--origin-to-force-quic-on=$wtOrigin" `
    $appUrl
