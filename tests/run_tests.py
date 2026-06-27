#!/usr/bin/env python3
"""Lance la suite E2E et produit tests/reports/latest.json."""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def main():
    args = [
        str(ROOT / "tests" / "scenarios"),
        "-v",
        "--tb=short",
    ]
    args.extend(sys.argv[1:])
    code = pytest.main(args)
    print(f"\nRapport : {ROOT / 'tests' / 'reports' / 'latest.json'}")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
