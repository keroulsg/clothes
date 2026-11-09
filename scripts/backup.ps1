# ==============================================================================
# GarmentOS Cloud — Automated Database Backup Script (PowerShell)
# Usage: .\scripts\backup.ps1 [-Destination local|s3|all] [-Retention 7] [-Encrypt]
# ==============================================================================

param(
    [string]$Destination = "local",
    [int]$Retention = 7,
    [switch]$Encrypt
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$ApiDir = Join-Path $RootDir "apps\api"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " GarmentOS Cloud — Production Database Backup     " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Set-Location $ApiDir

$cmdArgs = @("artisan", "garmentos:backup", "--destination=$Destination", "--retention=$Retention")
if ($Encrypt) {
    $cmdArgs += "--encrypt"
}

& php $cmdArgs

