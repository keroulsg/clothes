# ==============================================================================
# GarmentOS Cloud — Disaster Recovery Restore Script (PowerShell)
# Usage: .\scripts\restore.ps1 [-Target backup_id] [-TargetDb db_name] [-Force]
# ==============================================================================

param(
    [string]$Target = "",
    [string]$TargetDb = "",
    [switch]$Force,
    [switch]$VerifyOnly
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$ApiDir = Join-Path $RootDir "apps\api"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " GarmentOS Cloud — Disaster Recovery Restore      " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Set-Location $ApiDir

$cmdArgs = @("artisan", "garmentos:restore")
if ($Target) {
    $cmdArgs += $Target
}
if ($TargetDb) {
    $cmdArgs += "--target-db=$TargetDb"
}
if ($Force) {
    $cmdArgs += "--force"
}
if ($VerifyOnly) {
    $cmdArgs += "--verify-only"
}

& php $cmdArgs

