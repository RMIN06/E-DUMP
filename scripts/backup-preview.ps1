param(
    [Parameter(Mandatory)][string]$UvPath,
    [Parameter(Mandatory)][string]$DatabaseToolsPath
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$taskPrivate = Join-Path $env:LOCALAPPDATA 'EDUMP-release'
$taskEnvFile = Join-Path $taskPrivate 'preview.env'
$taskLogs = Join-Path $taskPrivate 'backup-logs'
$taskRoot = Split-Path -Parent $PSScriptRoot
New-Item -ItemType Directory -Force -Path $taskLogs | Out-Null
$taskLog = Join-Path $taskLogs ("backup-{0}.log" -f [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))
$taskPrevious = @{}
$taskOldPath = $env:PATH
try {
    foreach ($taskLine in [System.IO.File]::ReadAllLines($taskEnvFile)) {
        if ([string]::IsNullOrWhiteSpace($taskLine) -or $taskLine.StartsWith('#')) { continue }
        $taskPair = $taskLine.Split('=', 2)
        if ($taskPair.Length -ne 2 -or $taskPair[0] -notmatch '^[A-Z][A-Z0-9_]*$') { throw 'Invalid private environment file.' }
        $taskPrevious[$taskPair[0]] = [Environment]::GetEnvironmentVariable($taskPair[0], 'Process')
        [Environment]::SetEnvironmentVariable($taskPair[0], ($taskPair[1] | ConvertFrom-Json), 'Process')
    }
    $env:PATH = "$DatabaseToolsPath;$env:PATH"
    Push-Location (Join-Path $taskRoot 'backend')
    try {
        & $UvPath run --frozen python scripts/backup.py *> $taskLog
        if ($LASTEXITCODE -ne 0) { throw 'Private backup failed; inspect the private backup log.' }
    } finally { Pop-Location }
    Get-ChildItem -LiteralPath $taskLogs -File -Filter 'backup-*.log' |
        Where-Object LastWriteTimeUtc -LT ([DateTime]::UtcNow.AddDays(-14)) |
        ForEach-Object { Remove-Item -LiteralPath $_.FullName }
} finally {
    $env:PATH = $taskOldPath
    foreach ($taskName in $taskPrevious.Keys) {
        [Environment]::SetEnvironmentVariable($taskName, $taskPrevious[$taskName], 'Process')
    }
}
