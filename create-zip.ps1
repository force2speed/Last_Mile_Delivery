param (
    [string]$OutputFile = "LastMileDelivery_Source.zip"
)

# Move up if inside backend/frontend
$repoRoot = $PSScriptRoot

Write-Host "Creating zip archive: $OutputFile"
Write-Host "Zipping contents of: $repoRoot"

# Using Compress-Archive with wildcard, but we need to exclude folders.
# It's easier to use a temporary directory or just Compress-Archive with specific exclusions
$exclude = @(
    "node_modules",
    ".next",
    "dist",
    "out",
    ".git",
    "*.zip",
    "*.env.local",
    "*.env"
)

# Collect all files that do not match the exclusion
$filesToZip = Get-ChildItem -Path $repoRoot -Recurse | Where-Object {
    $item = $_
    $skip = $false
    foreach ($ex in $exclude) {
        if ($item.FullName -match [regex]::Escape($ex)) {
            $skip = $true
            break
        }
    }
    return -not $skip
}

# Delete existing zip if it exists
if (Test-Path $OutputFile) {
    Remove-Item $OutputFile
}

# Zip
Compress-Archive -Path $filesToZip.FullName -DestinationPath "$repoRoot\$OutputFile" -Force

Write-Host "Successfully created $OutputFile"
