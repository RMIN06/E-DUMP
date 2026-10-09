param([Parameter(Mandatory)][uri]$ApiBaseUrl)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($ApiBaseUrl.Scheme -ne 'https' -or $ApiBaseUrl.AbsolutePath.TrimEnd('/') -ne '/api/v1') {
    throw 'Pass the hosted HTTPS API URL ending in /api/v1.'
}
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskSigning = Join-Path $env:LOCALAPPDATA 'EDUMP-release'
New-Item -ItemType Directory -Force -Path $taskSigning | Out-Null
$taskKey = Join-Path $taskSigning 'android-preview.keystore'
$taskPasswordFile = Join-Path $taskSigning 'android-preview-password.txt'
if (!(Test-Path -LiteralPath $taskKey)) {
    if (Test-Path -LiteralPath $taskPasswordFile) { throw 'Signing state is incomplete; recover the existing keystore first.' }
    $taskPassword = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
    [System.IO.File]::WriteAllText($taskPasswordFile, $taskPassword)
    $env:EDUMP_KEYSTORE_PASSWORD = $taskPassword
    & (Join-Path $env:JAVA_HOME 'bin/keytool.exe') -genkeypair -keystore $taskKey -storepass:env EDUMP_KEYSTORE_PASSWORD -keypass:env EDUMP_KEYSTORE_PASSWORD -alias edump -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=E-DUMP Android Preview'
    if ($LASTEXITCODE -ne 0) { throw 'Signing key generation failed. Preserve the signing directory for recovery.' }
}
$env:EDUMP_KEYSTORE_PASSWORD = [System.IO.File]::ReadAllText($taskPasswordFile)
$env:EDUMP_KEYSTORE_FILE = $taskKey.Replace('\', '/')
$env:EDUMP_KEY_ALIAS = 'edump'
$env:EDUMP_LOCAL_ANDROID_RELEASE = '1'
$env:EAS_BUILD_PROFILE = 'preview'
$env:EDUMP_PREVIEW_FALLBACK_FONTS = '1'
$env:EXPO_PUBLIC_API_BASE_URL = $ApiBaseUrl.AbsoluteUri.TrimEnd('/')
Push-Location (Join-Path $taskRoot 'mobile')
try {
    node ../scripts/check-fonts.mjs --prepare --build
    if ($LASTEXITCODE -ne 0) { throw 'Font preparation failed.' }
    npx expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw 'Android prebuild failed.' }
    Push-Location android
    try {
        & ./gradlew.bat :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a,armeabi-v7a' '-Pkotlin.compiler.execution.strategy=in-process' --no-daemon --max-workers=1 '-Dorg.gradle.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=768m'
        if ($LASTEXITCODE -ne 0) { throw 'Android release build failed.' }
    } finally { Pop-Location }
    $taskArtifacts = Join-Path $taskRoot 'artifacts/android'
    New-Item -ItemType Directory -Force -Path $taskArtifacts | Out-Null
    Get-ChildItem -LiteralPath 'android/app/build/outputs/apk/release' -Filter '*.apk' | ForEach-Object {
        if ($_.Length -ge 60MB) { throw "APK exceeds the 60 MB install budget: $($_.Name)" }
        Copy-Item -LiteralPath $_.FullName -Destination $taskArtifacts
        Get-FileHash -LiteralPath (Join-Path $taskArtifacts $_.Name) -Algorithm SHA256
    }
} finally {
    Pop-Location
    Remove-Item Env:EDUMP_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:EDUMP_LOCAL_ANDROID_RELEASE -ErrorAction SilentlyContinue
}
