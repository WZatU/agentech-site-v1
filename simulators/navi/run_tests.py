"""Run all Navi tests and write machine-readable and Markdown summaries."""

from __future__ import annotations

import json
from pathlib import Path
import time
import unittest


ROOT = Path(__file__).resolve().parent
RESULTS = ROOT / "results"


def flatten_suite(suite):
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            yield from flatten_suite(item)
        else:
            yield item


class RecordingResult(unittest.TextTestResult):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.records: list[dict[str, str]] = []

    def addSuccess(self, test) -> None:
        super().addSuccess(test)
        self.records.append({"test": test.id(), "status": "PASS", "details": ""})

    def addFailure(self, test, err) -> None:
        super().addFailure(test, err)
        self.records.append(
            {"test": test.id(), "status": "FAIL", "details": self._exc_info_to_string(err, test)}
        )

    def addError(self, test, err) -> None:
        super().addError(test, err)
        self.records.append(
            {"test": test.id(), "status": "FAIL", "details": self._exc_info_to_string(err, test)}
        )

    def addSkip(self, test, reason) -> None:
        super().addSkip(test, reason)
        self.records.append({"test": test.id(), "status": "WARN", "details": reason})


def main() -> int:
    started = time.perf_counter()
    suite = unittest.defaultTestLoader.discover(str(ROOT / "tests"), pattern="test_*.py")
    test_instances = list(flatten_suite(suite))
    runner = unittest.TextTestRunner(verbosity=2, resultclass=RecordingResult)
    result: RecordingResult = runner.run(suite)
    elapsed = time.perf_counter() - started
    motion_metrics = {}
    standing_metrics = {}
    for test in test_instances:
        if test.__class__.__name__ == "MotionSafetyTest":
            motion_metrics = getattr(test.__class__, "metrics", {})
        elif test.__class__.__name__ == "StandingTest":
            standing_metrics = getattr(test.__class__, "metrics", {})
    report = {
        "tests_run": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "skipped": len(result.skipped),
        "elapsed_seconds": elapsed,
        "status": "PASS" if result.wasSuccessful() else "FAIL",
        "tests": result.records,
        "standing_metrics": standing_metrics,
        "motion_metrics": motion_metrics,
    }
    RESULTS.mkdir(parents=True, exist_ok=True)
    json_path = RESULTS / "test_results.json"
    markdown_path = RESULTS / "test_results.md"
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = [
        "# Navi MuJoCo Test Results",
        "",
        f"Overall: **{report['status']}**",
        "",
        f"Tests: `{report['tests_run']}`, failures: `{report['failures']}`, errors: `{report['errors']}`, elapsed: `{elapsed:.3f} s`",
        "",
        "| Test | Status |",
        "|---|:---:|",
    ]
    lines.extend(f"| `{item['test']}` | {item['status']} |" for item in result.records)
    lines.extend(
        [
            "",
            "## Motion metrics",
            "",
            "All displacement values are physical floating-base results after stepping; the controller does not assign root state.",
            "",
            "| Command | Δx (m) | Δy (m) | Δyaw (rad) | Height (m) | Peak roll | Peak pitch | Contact patterns |",
            "|---|---:|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for command, metrics in motion_metrics.items():
        lines.append(
            f"| `{command}` | {metrics['xy_displacement'][0]:.6f} | "
            f"{metrics['xy_displacement'][1]:.6f} | {metrics['yaw_change']:.6f} | "
            f"{metrics['final_height']:.6f} | {metrics['max_abs_roll']:.6f} | "
            f"{metrics['max_abs_pitch']:.6f} | {metrics['contact_pattern_count']} |"
        )
    markdown_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"JSON report: {json_path}")
    print(f"Markdown report: {markdown_path}")
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
