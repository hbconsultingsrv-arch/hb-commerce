#!/usr/bin/env python3
"""Regénère les documents Office HB Commerce (nécessite python-pptx).

NE PAS utiliser generate-docs.ps1 : il produit des fichiers Word invalides.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def restore_from_git(rev: str, path: str) -> None:
    target = ROOT / path
    content = subprocess.check_output(["git", "show", f"{rev}:{path}"], cwd=ROOT)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)


def main() -> None:
    print("Restauration des versions stables...")
    restore_from_git("93ccc9a", "docs/cahier-des-charges-hb-commerce.docx")
    restore_from_git("ae113f0", "docs/presentation-hb-commerce.pptx")
    print("Ajout des sections demo...")
    subprocess.check_call([sys.executable, str(ROOT / "scripts/patch-docs-demo.py")], cwd=ROOT)
    print("Terminé.")


if __name__ == "__main__":
    main()
