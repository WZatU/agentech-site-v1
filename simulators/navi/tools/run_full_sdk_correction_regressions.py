"""Run and record the required final Full SDK correction regression suites."""

from __future__ import annotations

import argparse
import io
import json
import sys
import time
import unittest
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "results" / "full_sdk_correction" / "regressions" / "final"

SUITES: dict[str, tuple[str, ...] | str] = {
    "correction": ("discover", "tests/full_sdk_correction"),
    "full_sdk_backend": ("discover", "tests/full_sdk_backend"),
    "independent_audit": ("discover", "tests/full_sdk_audit"),
    "translation_core": ("discover", "tests/translation_core"),
    "mujoco_backend": ("discover", "tests/mujoco_translation"),
    "quick": (
        "tests.test_model_load",
        "tests.test_joint_mapping",
        "tests.test_no_root_injection",
        "tests.test_motion_safety",
    ),
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_suite(spec: tuple[str, ...] | str) -> unittest.TestSuite:
    if isinstance(spec, tuple) and spec and spec[0] == "discover":
        return unittest.defaultTestLoader.discover(
            str(ROOT / spec[1]), top_level_dir=str(ROOT)
        )
    return unittest.defaultTestLoader.loadTestsFromNames(spec)


def run_unittest_suite(name: str, spec: tuple[str, ...] | str) -> dict[str, object]:
    suite = load_suite(spec)
    expected = suite.countTestCases()
    stream = io.StringIO()
    started_at = utc_now()
    started = time.perf_counter()
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
    elapsed = time.perf_counter() - started
    record = {
        "suite": name,
        "status": "PASS" if result.wasSuccessful() else "FAIL",
        "tests_expected": expected,
        "tests_run": result.testsRun,
        "passed": result.testsRun - len(result.failures) - len(result.errors),
        "failures": len(result.failures),
        "errors": len(result.errors),
        "skipped": len(result.skipped),
        "started_at": started_at,
        "finished_at": utc_now(),
        "elapsed_seconds": elapsed,
        "log": str(RESULTS / f"{name}.log"),
    }
    (RESULTS / f"{name}.log").write_text(stream.getvalue(), encoding="utf-8")
    return record


def run_model_validation() -> dict[str, object]:
    sys.path.insert(0, str(ROOT))
    import validate_model

    model_dir = RESULTS / "model_validation"
    model_dir.mkdir(parents=True, exist_ok=True)
    validate_model.RESULTS_DIRECTORY = model_dir
    validate_model.JSON_REPORT = model_dir / "model_validation.json"
    validate_model.MARKDOWN_REPORT = model_dir / "model_validation.md"
    stream = io.StringIO()
    started_at = utc_now()
    started = time.perf_counter()
    with redirect_stdout(stream), redirect_stderr(stream):
        exit_code = validate_model.main()
    elapsed = time.perf_counter() - started
    report = json.loads(validate_model.JSON_REPORT.read_text(encoding="utf-8"))
    failures = int(report["status_summary"].get("FAIL", 0))
    checks = len(report["checks"])
    record = {
        "suite": "model_validation",
        "status": "PASS" if exit_code == 0 and failures == 0 else "FAIL",
        "tests_expected": 20,
        "tests_run": checks,
        "passed": checks - failures,
        "failures": failures,
        "errors": 0,
        "skipped": 0,
        "started_at": started_at,
        "finished_at": utc_now(),
        "elapsed_seconds": elapsed,
        "log": str(RESULTS / "model_validation.log"),
        "report": str(validate_model.JSON_REPORT),
    }
    (RESULTS / "model_validation.log").write_text(stream.getvalue(), encoding="utf-8")
    return record


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--suite",
        choices=tuple(SUITES) + ("model_validation",),
        help="Rerun one suite and merge it into the existing final summary.",
    )
    args = parser.parse_args()
    RESULTS.mkdir(parents=True, exist_ok=True)
    records = []
    selected = (
        {args.suite: SUITES[args.suite]}
        if args.suite in SUITES
        else SUITES
    )
    for name, spec in selected.items():
        record = run_unittest_suite(name, spec)
        records.append(record)
        print(
            f"{name}: {record['passed']}/{record['tests_run']} "
            f"{record['status']} ({record['elapsed_seconds']:.3f}s)",
            flush=True,
        )
    if args.suite is None or args.suite == "model_validation":
        model_record = run_model_validation()
        records.append(model_record)
        print(
            f"model_validation: {model_record['passed']}/{model_record['tests_run']} "
            f"{model_record['status']} ({model_record['elapsed_seconds']:.3f}s)",
            flush=True,
        )
    summary_path = RESULTS / "regression_summary.json"
    if args.suite and summary_path.exists():
        previous = json.loads(summary_path.read_text(encoding="utf-8"))
        replacements = {item["suite"]: item for item in records}
        records = [
            replacements.pop(item["suite"], item)
            for item in previous.get("records", [])
        ] + list(replacements.values())
    summary = {
        "status": "PASS" if all(item["status"] == "PASS" for item in records) else "FAIL",
        "generated_at": utc_now(),
        "records": records,
    }
    summary_path.write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    return 0 if summary["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
