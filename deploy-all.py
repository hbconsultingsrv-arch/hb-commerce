#!/usr/bin/env python3
"""Telecharge main, restaure custom, integre stock, commit et push."""
import io
import os
import re
import shutil
import subprocess
import sys
import zipfile
from urllib.request import urlopen

PROJECT = r"C:\Users\Admin\Projects\hb-commerce"
BACKUP = r"C:\Users\Admin\Projects\hb-commerce-backup"
LOG = r"C:\Users\Admin\hb-deploy-log.txt"
ZIP_URL = "https://github.com/hbconsultingsrv-arch/hb-commerce/archive/refs/heads/main.zip"
ROOT_NAME = "hb-commerce-main"
REPO_URL = "https://github.com/hbconsultingsrv-arch/hb-commerce.git"


def log(msg):
    line = str(msg)
    print(line, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def run(cmd, cwd=PROJECT):
    log(f"$ {cmd}")
    p = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if p.stdout:
        log(p.stdout.rstrip())
    if p.stderr:
        log(p.stderr.rstrip())
    log(f"exit={p.returncode}")
    return p.returncode


def backup_custom():
    if os.path.isdir(BACKUP):
        log(f"Backup existant: {BACKUP}")
        return
    if os.path.isdir(PROJECT):
        shutil.copytree(PROJECT, BACKUP)
        log(f"Backup cree: {BACKUP}")


def restore_custom():
    if not os.path.isdir(BACKUP):
        return
    for root, _, files in os.walk(BACKUP):
        for name in files:
            src = os.path.join(root, name)
            rel = os.path.relpath(src, BACKUP)
            if rel.replace("\\", "/") in ("setup-log.txt", "deploy-all.py"):
                continue
            dest = os.path.join(PROJECT, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(src, dest)
            log(f"  restaure: {rel}")


def download_and_extract():
    log("Telechargement GitHub zip...")
    with urlopen(ZIP_URL, timeout=180) as resp:
        data = resp.read()
    log(f"Recu {len(data) // 1024} Ko")

    if os.path.isdir(PROJECT):
        for entry in os.listdir(PROJECT):
            path = os.path.join(PROJECT, entry)
            if entry in ("setup-log.txt",):
                continue
            if os.path.isdir(path):
                shutil.rmtree(path, ignore_errors=True)
            else:
                os.remove(path)

    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        for member in zf.namelist():
            if not member.startswith(ROOT_NAME + "/"):
                continue
            rel = member[len(ROOT_NAME) + 1:]
            if not rel:
                continue
            dest = os.path.join(PROJECT, rel.replace("/", os.sep))
            if member.endswith("/"):
                os.makedirs(dest, exist_ok=True)
            else:
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with zf.open(member) as src, open(dest, "wb") as out:
                    out.write(src.read())
    log("Archive extraite.")


def insert_after(content, needle, insert):
    if insert.strip()[:40] in content:
        return content, False
    if needle not in content:
        return content, False
    return content.replace(needle, needle + insert, 1), True


def integrate_stock():
    admin = os.path.join(PROJECT, "admin.html")
    checkout = os.path.join(PROJECT, "checkout.html")
    index = os.path.join(PROJECT, "index.html")
    produits = os.path.join(PROJECT, "produits.html")

    if os.path.isfile(admin):
        with open(admin, encoding="utf-8") as f:
            c = f.read()
        c, _ = insert_after(c, '<link rel="stylesheet" href="css/commerce.css', '\n  <link rel="stylesheet" href="css/stock.css?v=stock-20260615">')
        c, _ = insert_after(c, '<header class="dashboard-header">', '\n    <div id="stockAlertBanner" hidden></div>')
        c, _ = insert_after(c, '<th>Prix</th>', '\n                <th>Stock</th>')
        c, _ = insert_after(
            c,
            '<button type="button" class="section-tab" data-section="formulaire">Ajouter / modifier</button>',
            '\n        <button type="button" class="section-tab" data-section="reappro">Réapprovisionner</button>\n        <a href="stock.html" class="btn btn-sm btn-outline-dark" style="margin-left:auto">Page stock</a>',
        )
        c, _ = insert_after(
            c,
            'data-section-panel="formulaire"',
            """
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
""",
        )
        c, _ = insert_after(
            c,
            'name="min_quantity"',
            """
          <div class="form-row">
            <label>Quantité en stock<input type="number" name="stock_quantity" min="0" value="0"></label>
            <label>Seuil alerte (min.)<input type="number" name="min_stock_alert" min="0" value="10" title="Alerte quand le stock descend à ce niveau"></label>
          </div>
""",
        )
        c, _ = insert_after(
            c,
            '<script src="js/admin.js',
            """
  <script src="js/stock.js?v=stock-20260615"></script>
  <script src="js/stock-admin.js?v=stock-20260615"></script>
  <script src="js/admin-stock.js?v=stock-20260615"></script>
""",
        )
        c, _ = insert_after(c, '<div class="nav-actions">', '\n      <a href="stock.html" class="btn btn-sm btn-outline-light">Stock</a>')
        with open(admin, "w", encoding="utf-8", newline="\n") as f:
            f.write(c)
        log("OK admin.html")

    if os.path.isfile(checkout):
        with open(checkout, encoding="utf-8") as f:
            c = f.read()
        c, _ = insert_after(
            c,
            '<script src="js/admin-api.js">',
            '\n  <script src="js/stock.js?v=stock-20260615"></script>\n  <script src="js/admin-api-stock.js?v=stock-20260615"></script>',
        )
        with open(checkout, "w", encoding="utf-8", newline="\n") as f:
            f.write(c)
        log("OK checkout.html")

    for page in (index, produits):
        if not os.path.isfile(page):
            continue
        with open(page, encoding="utf-8") as f:
            c = f.read()
        c, _ = insert_after(
            c,
            '<script src="js/products.js',
            '\n  <script src="js/stock.js?v=stock-20260615"></script>\n  <script src="js/products-stock.js?v=stock-20260615"></script>',
        )
        c, _ = insert_after(c, "css/commerce.css", '\n  <link rel="stylesheet" href="css/stock.css?v=stock-20260615">')
        with open(page, "w", encoding="utf-8", newline="\n") as f:
            f.write(c)
        log(f"OK {os.path.basename(page)}")


def ensure_config():
    cfg = os.path.join(PROJECT, "js", "config.js")
    ex = os.path.join(PROJECT, "js", "config.example.js")
    if not os.path.isfile(cfg) and os.path.isfile(ex):
        shutil.copy2(ex, cfg)
        log("config.js cree depuis example")


def git_push():
    git_dir = os.path.join(PROJECT, ".git")
    if not os.path.isdir(git_dir):
        run(f'git init "{PROJECT}"')
        run(f'git remote add origin "{REPO_URL}"', cwd=PROJECT)

    run("git add -A")
    run('git commit -m "HB Commerce: hero 3D, branding, gestion stock et lancement local"')
    run("git branch -M main")
    rc = run("git push -u origin main")
    return rc == 0


def main():
    if os.path.isfile(LOG):
        os.remove(LOG)
    log("=== deploy-all start ===")
    backup_custom()
    download_and_extract()
    restore_custom()
    ensure_config()
    integrate_stock()

    critical = [
        "css/style.css", "css/commerce.css", "admin.html", "js/products.js",
        "js/auth.js", "index.html", "css/hero-3d.css", "js/hero-cube.js",
        "js/stock.js", "stock.html", "supabase/migration-stock-management.sql",
    ]
    missing = [f for f in critical if not os.path.isfile(os.path.join(PROJECT, f))]
    count = sum(len(files) for _, _, files in os.walk(PROJECT))
    log(f"Fichiers: {count}")
    if missing:
        log("ERREUR manquants: " + ", ".join(missing))
        sys.exit(1)

    pushed = git_push()
    log(f"Push: {'OK' if pushed else 'ECHEC (auth ou droits)'}")
    log("=== deploy-all end ===")


if __name__ == "__main__":
    main()
