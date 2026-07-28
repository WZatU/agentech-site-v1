"""Launch the long legacy physics regression without blocking progress updates."""

from __future__ import annotations

import json
import subprocess
import sys
import time
import traceback
import unittest
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "results" / "full_sdk_correction" / "regressions" / "final"
LOG = RESULTS / "old_full_regression_67.log"
STATUS = RESULTS / "old_full_regression_67.status.json"
TEST_MODULES = (
    "tests.test_basic_locomotion",
    "tests.test_joint_mapping",
    "tests.test_locomotion_refinement",
    "tests.test_model_load",
    "tests.test_motion_safety",
    "tests.test_no_root_injection",
    "tests.test_standing",
    "tests.test_unified_locomotion",
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def worker() -> int:
    RESULTS.mkdir(parents=True, exist_ok=True)
    sys.path.insert(0, str(ROOT))
    started_at = _utc_now()
    started = time.perf_counter()
    exit_code = 1
    with LOG.open("w", encoding="utf-8") as stream:
        try:
            suite = unittest.defaultTestLoader.loadTestsFromNames(TEST_MODULES)
            result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
            exit_code = 0 if result.wasSuccessful() else 1
        except BaseException:
            traceback.print_exc(file=stream)
        elapsed = time.perf_counter() - started
    STATUS.write_text(
        json.dumps(
            {
                "status": "PASS" if exit_code == 0 else "FAIL",
                "exit_code": exit_code,
                "started_at": started_at,
                "finished_at": _utc_now(),
                "elapsed_seconds": elapsed,
                "log": str(LOG),
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    return exit_code


def launch() -> int:
    RESULTS.mkdir(parents=True, exist_ok=True)
    STATUS.write_text(
        json.dumps({"status": "RUNNING", "started_at": _utc_now()}, indent=2) + "\n",
        encoding="utf-8",
    )
    command = [sys.executable, str(Path(__file__).resolve()), "--worker"]
    creation_flags = (
        subprocess.CREATE_NEW_PROCESS_GROUP
        | subprocess.CREATE_NO_WINDOW
    )
    process = subprocess.Popen(
        command,
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        close_fds=True,
        creationflags=creation_flags,
    )
    print(process.pid)
    return 0


if __name__ == "__main__":
    raise SystemExit(worker() if "--worker" in sys.argv else launch())
