$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$docs = Join-Path $root 'docs'
$tmp = Join-Path $env:TEMP 'hb-docx-build'
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory -Path $tmp, "$tmp\_rels", "$tmp\word", "$tmp\word\_rels", "$tmp\docProps" | Out-Null

$today = Get-Date -Format 'dd/MM/yyyy'
$lines = @(
  'CAHIER DES CHARGES',
  'HB Commerce — Plateforme B2B FIAFI v1.2',
  '',
  "Dernière modification : $today",
  'Créateur : HB Consulting & Services / HB Commerce',
  'Site demo : https://hbconsultingsrv-arch.github.io/hb-commerce/',
  '',
  'SOMMAIRE',
  '1. Contexte et objectifs',
  '2. Périmètre fonctionnel',
  '3. Rôles et permissions',
  '4. Parcours client B2B',
  '5. Dashboard admin',
  '6. Dashboard super root',
  '7. Agents commerciaux',
  '8. Fournisseurs et stock',
  '9. Commandes, factures et livraison',
  '10. Chat et modération',
  '11. Prix personnalisés',
  '12. Environnement de démonstration',
  '13. Pages d''exemple (présentation)',
  '14. Architecture technique',
  '15. Migrations Supabase',
  '16. Déploiement GitHub Pages',
  '',
  '12. ENVIRONNEMENT DE DÉMONSTRATION',
  'Mot de passe commun : Test1234!',
  'Script SQL : supabase/seed-demo-data.sql',
  'Hub demo : docs/exemples/index.html',
  '',
  'Comptes demo :',
  'super@hbcommerce.demo | Super root | super-root.html',
  'admin@hbcommerce.demo | Admin | admin.html',
  'agent.martin@hbcommerce.demo | Agent commercial | admin.html',
  'agent.dubois@hbcommerce.demo | Agent commercial | admin.html',
  'contact@restaurant-paris.demo | Client | compte.html',
  'achats@traiteur-lyon.demo | Client | compte.html',
  'commandes@epicerie-bdx.demo | Client | compte.html',
  'direction@hotel-nice.demo | Client | compte.html',
  'inscription@nouvelle-societe.demo | Société en attente | compte.html',
  'stock@fiafi-tunisie.demo | Fournisseur | supplier.html',
  '',
  '13. PAGES D''EXEMPLE',
  'index.html, produits.html, panier.html, checkout.html, login.html, register.html',
  'compte.html, admin.html, super-root.html, supplier.html',
  'brochure-france.html, brochure-luxembourg.html',
  'docs/exemples/index.html, docs/presentation/index.html'
)

function Escape-Xml([string]$s) {
  return [System.Security.SecurityElement]::Escape($s)
}

$paras = ($lines | ForEach-Object { "<w:p><w:r><w:t xml:space=`"preserve`">$(Escape-Xml $_)</w:t></w:r></w:p>" }) -join ''
$document = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>$paras<w:sectPr/></w:body>
</w:document>
"@

$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>
'@

$rels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>
'@

$core = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Cahier des charges HB Commerce v1.2</dc:title>
  <dc:creator>HB Commerce</dc:creator>
</cp:coreProperties>
"@

function Write-Utf8([string]$Path, [string]$Content) {
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

Write-Utf8 "$tmp\[Content_Types].xml" $contentTypes
Write-Utf8 "$tmp\_rels\.rels" $rels
Write-Utf8 "$tmp\word\document.xml" $document
Write-Utf8 "$tmp\docProps\core.xml" $core

$out = Join-Path $docs 'cahier-des-charges-hb-commerce.docx'
if (Test-Path $out) { Remove-Item $out -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tmp, $out)
Write-Host "Generated $out"
