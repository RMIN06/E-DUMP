param([Parameter(Mandatory)][string]$Message)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskFonts = Join-Path $taskRoot 'mobile/src/theme/fontAssets.ts'
$taskOriginalFonts = [IO.File]::ReadAllBytes($taskFonts)
$env:EAS_BUILD_PROFILE = 'preview'
$env:EDUMP_PREVIEW_FALLBACK_FONTS = '1'
$env:EXPO_PUBLIC_API_BASE_URL = 'https://edump-api.onrender.com/api/v1'
$env:NODE_OPTIONS = '--max-old-space-size=768'
Push-Location (Join-Path $taskRoot 'mobile')
try {
    node ../scripts/check-fonts.mjs --prepare --build
    if ($LASTEXITCODE -ne 0) { throw 'Font preparation failed.' }
    npx expo export --platform android --output-dir .updates-preview --max-workers 1
    if ($LASTEXITCODE -ne 0) { throw 'Android update export failed.' }
    npx --yes eas-cli update --channel preview --environment preview --platform android --input-dir .updates-preview --skip-bundler --message $Message --non-interactive
    if ($LASTEXITCODE -ne 0) { throw 'Android update publication failed.' }
} finally {
    Pop-Location
    [IO.File]::WriteAllBytes($taskFonts, $taskOriginalFonts)
}
