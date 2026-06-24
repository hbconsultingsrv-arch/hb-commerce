# Clone / met a jour hb-commerce depuis GitHub
$ErrorActionPreference = "Stop"
$target = "C:\Users\Admin\Projects\hb-commerce"
$zip = "C:\Users\Admin\Projects\hb-commerce.zip"
$url = "https://github.com/hbconsultingsrv-arch/hb-commerce/archive/refs/heads/main.zip"

Write-Host "Telechargement hb-commerce..."
Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing

$temp = Join-Path $env:TEMP "hb-commerce-extract"
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
Expand-Archive -Path $zip -DestinationPath $temp -Force

$src = Join-Path $temp "hb-commerce-main"
if (-not (Test-Path $src)) { throw "Archive invalide" }

if (-not (Test-Path $target)) { New-Item -ItemType Directory -Path $target | Out-Null }

# Copie sans ecraser les fichiers locaux deja modifies (hero-3d, logo, etc.)
Get-ChildItem $src -Force | ForEach-Object {
    $dest = Join-Path $target $_.Name
    if ($_.PSIsContainer) {
        if (-not (Test-Path $dest)) {
            Copy-Item $_.FullName $dest -Recurse -Force
        } else {
            Get-ChildItem $_.FullName -Recurse -File | ForEach-Object {
                $rel = $_.FullName.Substring($src.Length + 1)
                $out = Join-Path $target $rel
                $dir = Split-Path $out -Parent
                if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
                if (-not (Test-Path $out)) { Copy-Item $_.FullName $out -Force }
            }
        }
    } elseif (-not (Test-Path $dest)) {
        Copy-Item $_.FullName $dest -Force
    }
}

Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $zip -Force -ErrorAction SilentlyContinue

Write-Host "OK — projet dans $target"
Write-Host "Lancez: cd $target ; python -m http.server 8080"
