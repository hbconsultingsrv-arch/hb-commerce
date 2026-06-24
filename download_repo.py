#!/usr/bin/env python3
"""Telecharge hb-commerce depuis GitHub (zip) si git clone echoue."""
import io
import os
import shutil
import sys
import zipfile
from urllib.request import urlopen

PROJECT = r"C:\Users\Admin\Projects\hb-commerce"
BACKUP = r"C:\Users\Admin\Projects\hb-commerce-backup"
ZIP_URL = "https://github.com/hbconsultingsrv-arch/hb-commerce/archive/refs/heads/main.zip"
ROOT_NAME = "hb-commerce-main"

CUSTOM_FILES = [
    "index.html", "stock.html", "integrate-stock.ps1", "setup-complet.ps1",
    "DEMARRER-HB-COMMERCE.bat", "LIREMOI-LOCAL.txt", "download_repo.py",
]


def log(msg):
    print(msg, flush=True)


def backup_custom():
    if os.path.isdir(BACKUP):
        log(f"Backup deja present: {BACKUP}")
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
            if rel.replace("\\", "/") in ("setup-log.txt",):
                continue
            dest = os.path.join(PROJECT, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(src, dest)
            log(f"  restaure: {rel}")


def main():
    log("Telechargement GitHub zip...")
    with urlopen(ZIP_URL, timeout=120) as resp:
        data = resp.read()
    log(f"Recu {len(data) // 1024} Ko")

    if os.path.isdir(PROJECT):
        backup_custom()
        for entry in os.listdir(PROJECT):
            path = os.path.join(PROJECT, entry)
            if entry == "setup-log.txt":
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
    restore_custom()

    cfg = os.path.join(PROJECT, "js", "config.js")
    ex = os.path.join(PROJECT, "js", "config.example.js")
    if not os.path.isfile(cfg) and os.path.isfile(ex):
        shutil.copy2(ex, cfg)
        log("config.js cree")

    critical = [
        "css/style.css", "css/commerce.css", "admin.html", "js/products.js",
        "js/auth.js", "index.html",
    ]
    missing = [f for f in critical if not os.path.isfile(os.path.join(PROJECT, f))]
    if missing:
        log("ERREUR fichiers manquants: " + ", ".join(missing))
        sys.exit(1)

    count = sum(len(files) for _, _, files in os.walk(PROJECT))
    log(f"OK — {count} fichiers installes dans {PROJECT}")


if __name__ == "__main__":
    main()
