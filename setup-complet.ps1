# Setup complet HB Commerce — clone GitHub + restauration custom + integration stock
$ErrorActionPreference = "Stop"
$project = "C:\Users\Admin\Projects\hb-commerce"
$backup  = "C:\Users\Admin\Projects\hb-commerce-backup"
$tmp     = "C:\Users\Admin\Projects\hb-commerce-tmp"
$log     = Join-Path $project "setup-log.txt"

function Log($msg) {
  $line = "[$(Get-Date -Format 'HH:mm:ss')] $msg"
  Write-Host $line
  Add-Content -Path $log -Value $line -Encoding UTF8
}

if (-not (Test-Path $project)) { New-Item -ItemType Directory -Path $project | Out-Null }
Set-Content -Path $log -Value "=== HB Commerce Setup ===" -Encoding UTF8

# 1. Backup fichiers custom actuels
if (-not (Test-Path $backup)) {
  Log "Sauvegarde des fichiers custom..."
  Copy-Item $project $backup -Recurse -Force
  Log "Backup -> $backup"
} else {
  Log "Backup deja present."
}

# 2. Clone GitHub
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
Log "Clone https://github.com/hbconsultingsrv-arch/hb-commerce.git ..."
$cloneOut = git clone https://github.com/hbconsultingsrv-arch/hb-commerce.git $tmp 2>&1 | Out-String
Log $cloneOut.Trim()

if (-not (Test-Path (Join-Path $tmp ".git"))) {
  Log "ERREUR: clone echoue. Verifiez git et la connexion internet."
  exit 1
}

# 3. Remplacer contenu projet par le clone
Log "Installation du depot dans $project ..."
Get-ChildItem $project -Force | Where-Object { $_.Name -ne "setup-log.txt" } | Remove-Item -Recurse -Force
Get-ChildItem $tmp -Force | Move-Item -Destination $project -Force
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
Log "Clone installe."

# 4. Restaurer fichiers custom depuis backup
$patterns = @(
  "index.html", "stock.html", "integrate-stock.ps1", "setup-complet.ps1",
  "DEMARRER-HB-COMMERCE.bat", "LIREMOI-LOCAL.txt",
  "js\hero-*.js", "js\main.js", "js\stock*.js", "js\admin-*.js",
  "js\products-stock.js", "js\cart-stock.js",
  "css\hero-3d.css", "css\stock.css",
  "assets\logo.svg", "assets\logo-icon.svg",
  "supabase\migration-stock-management.sql", "docs\STOCK-INTEGRATION.md"
)
$restored = 0
if (Test-Path $backup) {
  Log "Restauration fichiers custom..."
  foreach ($pat in $patterns) {
    Get-ChildItem (Join-Path $backup $pat) -ErrorAction SilentlyContinue | ForEach-Object {
      $rel = $_.FullName.Substring($backup.Length).TrimStart("\", "/")
      $dest = Join-Path $project $rel
      $dir = Split-Path $dest -Parent
      if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
      Copy-Item $_.FullName $dest -Force
      Log "  + $rel"
      $restored++
    }
  }
  Log "$restored fichier(s) custom restaure(s)."
}

# 5. config.js local si absent
$configJs = Join-Path $project "js\config.js"
$configEx = Join-Path $project "js\config.example.js"
if (-not (Test-Path $configJs) -and (Test-Path $configEx)) {
  Copy-Item $configEx $configJs -Force
  Log "config.js cree depuis config.example.js"
}

# 6. Integration stock dans HTML
$integrate = Join-Path $project "integrate-stock.ps1"
if (Test-Path $integrate) {
  Log "Integration stock..."
  & powershell -NoProfile -ExecutionPolicy Bypass -File $integrate 2>&1 | ForEach-Object { Log $_ }
}

# 7. Patch index.html — scripts stock + cart si manquants
$indexPath = Join-Path $project "index.html"
if (Test-Path $indexPath) {
  $idx = Get-Content $indexPath -Raw -Encoding UTF8
  if ($idx -notmatch "hero-3d.css") {
    $idx = $idx -replace "(commerce\.css[^""]*"")", "`$1`n  <link rel=""stylesheet"" href=""css/hero-3d.css?v=hero-3d"">"
  }
  if ($idx -notmatch "hero-oil-bg.js") {
    $idx = $idx -replace "(products\.js[^""]*"")", "`$1`n  <script src=""js/hero-oil-bg.js?v=hero-3d""></script>`n  <script src=""js/hero-cube.js?v=hero-3d""></script>"
  }
  if ($idx -notmatch "products-stock.js") {
    $idx = $idx -replace "(main\.js[^""]*"")", "`$1`n  <script src=""js/stock.js?v=stock""></script>`n  <script src=""js/products-stock.js?v=stock""></script>"
  }
  if ($idx -notmatch "stock.css") {
    $idx = $idx -replace "(hero-3d.css[^""]*"")", "`$1`n  <link rel=""stylesheet"" href=""css/stock.css?v=stock"">"
  }
  if ($idx -match 'assets/logo\.svg" alt="FIAFI') {
    $idx = $idx -replace 'alt="FIAFI[^"]*"', 'alt="HB Commerce — HB Consulting &amp; Services"'
  }
  Set-Content $indexPath $idx -Encoding UTF8 -NoNewline
  Log "index.html patche (3D + stock + logo)."
}

# 8. Verification
Push-Location $project
$critical = @("admin.html","checkout.html","produits.html","css\style.css","css\commerce.css","js\config.js","js\products.js","js\auth.js","index.html")
$missing = @()
foreach ($f in $critical) {
  if (-not (Test-Path $f)) { $missing += $f }
}
$fileCount = (Get-ChildItem -Recurse -File | Measure-Object).Count
Log "Fichiers total: $fileCount"
Log "Git: $(git remote get-url origin 2>&1)"
if ($missing.Count) {
  Log "ATTENTION fichiers manquants: $($missing -join ', ')"
} else {
  Log "OK — tous les fichiers critiques presents."
}
Pop-Location
Log "=== Setup termine ==="
