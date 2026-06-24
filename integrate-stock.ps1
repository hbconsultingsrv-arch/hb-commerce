# Intègre les fichiers stock dans admin.html, checkout.html, index.html
$root = "C:\Users\Admin\Projects\hb-commerce"
$admin = Join-Path $root "admin.html"
$checkout = Join-Path $root "checkout.html"
$index = Join-Path $root "index.html"

function Insert-After($file, $needle, $insert) {
  if (-not (Test-Path $file)) { Write-Host "SKIP (absent): $file"; return }
  $c = Get-Content $file -Raw -Encoding UTF8
  if ($c -match [regex]::Escape($insert.Trim().Substring(0, [Math]::Min(40, $insert.Trim().Length)))) {
    Write-Host "Deja present: $file"; return
  }
  if ($c -notmatch [regex]::Escape($needle)) { Write-Host "Needle introuvable dans $file"; return }
  $c = $c.Replace($needle, $needle + $insert)
  Set-Content $file $c -Encoding UTF8 -NoNewline
  Write-Host "OK: $file"
}

if (Test-Path $admin) {
  Insert-After $admin '<link rel="stylesheet" href="css/commerce.css' "`n  <link rel=`"stylesheet`" href=`"css/stock.css?v=stock-20260615`">"
  Insert-After $admin '<header class="dashboard-header">' "`n    <div id=`"stockAlertBanner`" hidden></div>"
  Insert-After $admin '<th>Prix</th>' "`n                <th>Stock</th>"
  Insert-After $admin '<button type="button" class="section-tab" data-section="formulaire">Ajouter / modifier</button>' "`n        <button type=`"button`" class=`"section-tab`" data-section=`"reappro`">Réapprovisionner</button>`n        <a href=`"stock.html`" class=`"btn btn-sm btn-outline-dark`" style=`"margin-left:auto`">Page stock</a>"
  Insert-After $admin 'data-section-panel="formulaire"' @"

      <div data-section-panel="reappro" class="dashboard-card" hidden>
        <h2>Réapprovisionner (achat reçu)</h2>
        <form id="stockReceiveForm" class="auth-form">
          <label>Produit<select name="product_slug" id="stockReceiveProductSelect" required></select></label>
          <label>Quantité reçue<input type="number" name="quantity" min="1" required></label>
          <label>Notes<textarea name="notes" rows="2"></textarea></label>
          <button type="submit" class="btn btn-primary">Ajouter au stock</button>
          <p class="form-note" id="stockReceiveNote"></p>
        </form>
      </div>

"@
  Insert-After $admin 'name="min_quantity"' @"
          <div class="form-row">
            <label>Quantité en stock<input type="number" name="stock_quantity" min="0" value="0"></label>
            <label>Seuil alerte (min.)<input type="number" name="min_stock_alert" min="0" value="10" title="Alerte quand le stock descend à ce niveau"></label>
          </div>
"@
  Insert-After $admin '<script src="js/admin.js' @"
  <script src="js/stock.js?v=stock-20260615"></script>
  <script src="js/stock-admin.js?v=stock-20260615"></script>
  <script src="js/admin-stock.js?v=stock-20260615"></script>
"@
  Insert-After $admin '<div class="nav-actions">' "`n      <a href=`"stock.html`" class=`"btn btn-sm btn-outline-light`">Stock</a>"
}

if (Test-Path $checkout) {
  Insert-After $checkout '<script src="js/admin-api.js">' "`n  <script src=`"js/stock.js?v=stock-20260615`"></script>`n  <script src=`"js/admin-api-stock.js?v=stock-20260615`"></script>"
}

foreach ($page in @($index, (Join-Path $root "produits.html"))) {
  if (Test-Path $page) {
    Insert-After $page '<script src="js/products.js' "`n  <script src=`"js/stock.js?v=stock-20260615`"></script>`n  <script src=`"js/products-stock.js?v=stock-20260615`"></script>"
    Insert-After $page 'css/commerce.css' "`n  <link rel=`"stylesheet`" href=`"css/stock.css?v=stock-20260615`">"
  }
}

Write-Host "Termine. Executez aussi supabase/migration-stock-management.sql dans Supabase."
