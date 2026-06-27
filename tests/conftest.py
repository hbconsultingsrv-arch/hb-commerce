"""Fixtures pytest et génération du rapport JSON."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tests.helpers.browser import create_driver

REPORT_DIR = ROOT / "tests" / "reports"
REPORT_JSON = REPORT_DIR / "latest.json"

RESULTS: list[dict] = []
SESSION_START = None


@pytest.fixture(scope="function")
def driver():
    drv = create_driver()
    try:
        yield drv
    finally:
        drv.quit()


def pytest_configure(config):
    global SESSION_START
    SESSION_START = datetime.now(timezone.utc)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    if rep.when != "call":
        return

    marker = item.get_closest_marker("scenario")
    scenario_id = marker.args[0] if marker else item.name
    suite = item.get_closest_marker("suite")
    suite_name = suite.args[0] if suite else "general"

    entry = {
        "id": scenario_id,
        "suite": suite_name,
        "name": (item.function.__doc__ or item.name).strip().split("\n")[0],
        "status": rep.outcome,
        "duration_ms": round((rep.duration or 0) * 1000),
        "message": "",
    }
    if rep.failed and rep.longrepr:
        entry["message"] = str(rep.longrepr).split("\n")[-1][:500]
    RESULTS.append(entry)


def _git_info():
    try:
        commit = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, text=True, stderr=subprocess.DEVNULL
        ).strip()
        branch = subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=ROOT, text=True, stderr=subprocess.DEVNULL
        ).strip()
        return {"commit": commit, "branch": branch}
    except Exception:
        return {"commit": "", "branch": ""}


def pytest_sessionfinish(session, exitstatus):
    finished = datetime.now(timezone.utc)
    duration = (finished - SESSION_START).total_seconds() if SESSION_START else 0
    passed = sum(1 for r in RESULTS if r["status"] == "passed")
    failed = sum(1 for r in RESULTS if r["status"] == "failed")
    skipped = sum(1 for r in RESULTS if r["status"] == "skipped")
    total = len(RESULTS)
    pass_rate = round((passed / total) * 100, 1) if total else 0

    suites: dict[str, dict] = {}
    for row in RESULTS:
        s = suites.setdefault(row["suite"], {"passed": 0, "failed": 0, "skipped": 0, "total": 0})
        s[row["status"]] = s.get(row["status"], 0) + 1
        s["total"] += 1

    payload = {
        "generated_at": finished.isoformat(),
        "duration_seconds": round(duration, 2),
        "tool": "selenium-python-pytest",
        "base_url": os.getenv("HB_TEST_BASE_URL", "http://localhost:8080/"),
        "summary": {
            "total": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "pass_rate": pass_rate,
            "exit_code": exitstatus,
        },
        "suites": [
            {"name": name, **stats} for name, stats in sorted(suites.items())
        ],
        "scenarios": RESULTS,
        "ci": {
            "run_id": os.getenv("GITHUB_RUN_ID", ""),
            "workflow": os.getenv("GITHUB_WORKFLOW", ""),
            **_git_info(),
        },
    }

    REPORT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
