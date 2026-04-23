param(
  [string]$Source = "C:\Users\Saifuddin\Desktop\umroh-platform",
  [string]$Target = "C:\Users\Saifuddin\Documents\gemini",
  [switch]$SkipBackup,
  [switch]$RunWebChecks
)

$ErrorActionPreference = "Stop"

function Resolve-StrictPath([string]$PathValue, [string]$Label) {
  if (-not (Test-Path -LiteralPath $PathValue)) {
    throw "$Label path does not exist: $PathValue"
  }

  return (Resolve-Path -LiteralPath $PathValue).Path
}

function Get-SyncSourceFiles([string]$Root) {
  $excludeDirs = @(".git", "node_modules", ".next", "venv", ".venv", "__pycache__")
  $excludeExt = @(".pyc", ".log")

  Get-ChildItem -LiteralPath $Root -Recurse -File -Force | Where-Object {
    $fullPath = $_.FullName
    -not ($excludeDirs | Where-Object { $fullPath -like "*\$_\*" }) -and
    -not ($excludeExt -contains $_.Extension)
  } | ForEach-Object {
    [pscustomobject]@{
      Rel = $_.FullName.Substring($Root.Length + 1)
      Full = $_.FullName
      Length = $_.Length
    }
  }
}

function Assert-SourceMirror([string]$SourceRoot, [string]$TargetRoot) {
  $sourceFiles = Get-SyncSourceFiles $SourceRoot
  $targetFiles = Get-SyncSourceFiles $TargetRoot

  $sourceMap = @{}
  foreach ($file in $sourceFiles) {
    $sourceMap[$file.Rel] = $file
  }

  $targetMap = @{}
  foreach ($file in $targetFiles) {
    $targetMap[$file.Rel] = $file
  }

  $onlySource = @($sourceFiles | Where-Object { -not $targetMap.ContainsKey($_.Rel) })
  $onlyTarget = @($targetFiles | Where-Object { -not $sourceMap.ContainsKey($_.Rel) })
  $different = @()

  foreach ($file in $sourceFiles) {
    if (-not $targetMap.ContainsKey($file.Rel)) {
      continue
    }

    $sourceHash = (Get-FileHash -LiteralPath $file.Full -Algorithm SHA256).Hash
    $targetHash = (Get-FileHash -LiteralPath $targetMap[$file.Rel].Full -Algorithm SHA256).Hash
    if ($sourceHash -ne $targetHash) {
      $different += $file.Rel
    }
  }

  [pscustomobject]@{
    SourceFiles = $sourceFiles.Count
    TargetFiles = $targetFiles.Count
    OnlySource = $onlySource.Count
    OnlyTarget = $onlyTarget.Count
    Different = $different.Count
  }

  if ($onlySource.Count -or $onlyTarget.Count -or $different.Count) {
    if ($onlySource.Count) {
      Write-Host "Only in source:" -ForegroundColor Yellow
      $onlySource | Select-Object -First 20 -ExpandProperty Rel
    }

    if ($onlyTarget.Count) {
      Write-Host "Only in target:" -ForegroundColor Yellow
      $onlyTarget | Select-Object -First 20 -ExpandProperty Rel
    }

    if ($different.Count) {
      Write-Host "Different files:" -ForegroundColor Yellow
      $different | Select-Object -First 20
    }

    throw "Mirror verification failed."
  }
}

$sourceRoot = Resolve-StrictPath $Source "Source"
$targetRoot = Resolve-StrictPath $Target "Target"

if ($sourceRoot -eq $targetRoot) {
  throw "Source and target cannot be the same folder."
}

$expectedSource = "C:\Users\Saifuddin\Desktop\umroh-platform"
$expectedTarget = "C:\Users\Saifuddin\Documents\gemini"

if ($sourceRoot -ne $expectedSource) {
  throw "Unexpected source path. Expected $expectedSource but got $sourceRoot"
}

if ($targetRoot -ne $expectedTarget) {
  throw "Unexpected target path. Expected $expectedTarget but got $targetRoot"
}

Write-Host "Source: $sourceRoot"
Write-Host "Target: $targetRoot"

if (-not $SkipBackup) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupRoot = Join-Path (Split-Path $targetRoot -Parent) "gemini-backup-before-sync-$timestamp"

  if (Test-Path -LiteralPath $backupRoot) {
    throw "Backup path already exists: $backupRoot"
  }

  New-Item -ItemType Directory -Path $backupRoot | Out-Null
  Write-Host "Creating backup: $backupRoot"

  robocopy $targetRoot $backupRoot /E /XD .git node_modules .next venv .venv __pycache__ /XF *.pyc *.log /R:1 /W:1 /NFL /NDL /NP
  $backupCode = $LASTEXITCODE
  if ($backupCode -ge 8) {
    throw "Backup failed with robocopy code $backupCode"
  }
}

Write-Host "Mirroring source to target..."
robocopy $sourceRoot $targetRoot /MIR /XD .git node_modules .next venv .venv __pycache__ /XF *.pyc *.log /R:1 /W:1 /NFL /NDL /NP
$mirrorCode = $LASTEXITCODE
if ($mirrorCode -ge 8) {
  throw "Mirror failed with robocopy code $mirrorCode"
}

Write-Host "Verifying 1:1 source mirror..."
$summary = Assert-SourceMirror $sourceRoot $targetRoot
$summary | Format-List

if ($RunWebChecks) {
  $webRoot = Join-Path $targetRoot "apps\web"
  if (-not (Test-Path -LiteralPath $webRoot)) {
    throw "Web workspace not found: $webRoot"
  }

  Write-Host "Running web lint in target..."
  npm run lint --prefix $webRoot

  Write-Host "Running web build in target..."
  npm run build --prefix $webRoot
}

Write-Host "Sync complete." -ForegroundColor Green
