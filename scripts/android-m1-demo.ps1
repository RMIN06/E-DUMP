param([string]$Serial)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$taskAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskApk = Join-Path $taskRoot 'mobile\.expo\edump-m1-development.apk'
if (!(Test-Path -LiteralPath $taskAdb) -or !(Test-Path -LiteralPath $taskApk)) {
    throw 'Android SDK or M1 development APK is missing. See docs/M1PhoneTest.md.'
}
$taskDevices = @(& $taskAdb devices | Where-Object { $_ -match '^([^\s]+)\s+device$' -and $_ -notmatch '^emulator-' } | ForEach-Object { ($_ -split '\s+')[0] })
if (!$Serial) {
    if ($taskDevices.Count -ne 1) { throw 'Connect one authorized Android phone, or pass its ADB serial with -Serial.' }
    $Serial = $taskDevices[0]
}
if ($Serial -notin $taskDevices) { throw 'The selected phone is not connected and authorized for USB debugging.' }
foreach ($taskPort in @(8080, 8081)) {
    $taskSocket = [System.Net.Sockets.TcpClient]::new()
    try { $taskSocket.Connect('127.0.0.1', $taskPort) }
    catch { throw "Local service on port $taskPort is not running. See docs/M1PhoneTest.md." }
    finally { $taskSocket.Dispose() }
}
& $taskAdb -s $Serial install -r $taskApk
if ($LASTEXITCODE -ne 0) { throw 'APK installation failed.' }
foreach ($taskPort in @(8080, 8081)) {
    & $taskAdb -s $Serial reverse "tcp:$taskPort" "tcp:$taskPort"
    if ($LASTEXITCODE -ne 0) { throw 'USB port forwarding failed.' }
}
& $taskAdb -s $Serial shell am start -a android.intent.action.VIEW -d 'edump://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081' com.edump.bcs3e
if ($LASTEXITCODE -ne 0) { throw 'The development client could not launch.' }
Write-Output 'E-DUMP opened. Keep the USB cable connected while testing the local API and Metro.'
