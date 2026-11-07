#
# TripNext - Secure Gemini API Key Entry Script
#
# Prompts for the API key via Read-Host -AsSecureString to prevent displaying
# or logging the key in console history or shell transcripts.
#

param()

$envFile = Join-Path $PSScriptRoot "..\apps\api\.env"

if (-not (Test-Path $envFile)) {
    Write-Error "Could not find apps/api/.env at '$envFile'."
    exit 1
}

Write-Host "TripNext - Secure Gemini API Key Setup" -ForegroundColor Cyan
Write-Host "Please enter your replacement Gemini API key below."
Write-Host "(Input will be masked and not displayed on screen or saved in shell history)" -ForegroundColor Gray

$secureKey = Read-Host -Prompt "Enter Gemini API Key" -AsSecureString

if ($null -eq $secureKey -or $secureKey.Length -eq 0) {
    Write-Warning "No key entered. Configuration aborted."
    exit 1
}

# Convert SecureString in memory only
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
    $plainKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)

    $lines = Get-Content -Path $envFile
    $found = $false
    $newLines = @()

    foreach ($line in $lines) {
        if ($line -match '^\s*GEMINI_API_KEY=') {
            $newLines += "GEMINI_API_KEY=$plainKey"
            $found = $true
        } else {
            $newLines += $line
        }
    }

    if (-not $found) {
        $newLines += "GEMINI_API_KEY=$plainKey"
    }

    $newLines | Set-Content -Path $envFile -Encoding UTF8
    Write-Host "Success: GEMINI_API_KEY configured in apps/api/.env." -ForegroundColor Green
} finally {
    # Zero out unmanaged BSTR memory and clear plain text variable immediately
    if ($bstr -ne [IntPtr]::Zero) {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    $plainKey = $null
    $secureKey = $null
}
