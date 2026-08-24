from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("aegis-device-results.py")


def load_module():
    spec = importlib.util.spec_from_file_location("aegis_device_results", MODULE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("unable to load AEGIS device results module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Sample:
    def __init__(self) -> None:
        self.percent = 82


class AegisDeviceResultsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.module = load_module()

    def test_success_record_normalizes_sdk_object(self) -> None:
        record = self.module.success_record(
            {"name": "get_battery_status", "line": 3},
            Sample(),
            "2026-08-24T20:00:00.000Z",
        )

        self.assertEqual(record["command"], "get_battery_status")
        self.assertEqual(record["line"], 3)
        self.assertEqual(record["result"], {"percent": 82})
        self.assertEqual(record["status"], "completed")
        self.assertIsNone(record["error"])

    def test_failure_record_preserves_structured_error(self) -> None:
        record = self.module.failure_record(
            {"name": "get_body_state", "line": 4},
            RuntimeError("status unavailable"),
            "2026-08-24T20:00:01.000Z",
        )

        self.assertEqual(record["command"], "get_body_state")
        self.assertEqual(record["status"], "failed")
        self.assertIsNone(record["result"])
        self.assertEqual(
            record["error"],
            {"type": "RuntimeError", "message": "status unavailable"},
        )

    def test_write_result_atomically_replaces_the_sidecar(self) -> None:
        record = {
            "command": "get_battery_status",
            "line": 3,
            "status": "completed",
            "result": {"percent": 82},
            "error": None,
            "recorded_at": "2026-08-24T20:00:00.000Z",
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "session.results.json"

            self.module.write_result(path, [record])

            self.assertEqual(json.loads(path.read_text(encoding="utf-8")), [record])
            self.assertFalse(path.with_suffix(path.suffix + ".tmp").exists())

    def test_trusted_runner_records_battery_and_body_returns(self) -> None:
        fake_sdk = """
class Agentech:
    @staticmethod
    def get_battery_status(**kwargs):
        return {"percent": 82, "voltage": 28.4}
    @staticmethod
    def get_body_state(**kwargs):
        return {"mode": "Stand"}
    @staticmethod
    def stop(**kwargs):
        return None
"""
        plan = {
            "version": 1,
            "commands": [
                {"name": "get_battery_status", "args": {}, "line": 3},
                {"name": "get_body_state", "args": {}, "line": 4},
            ],
        }

        completed, payload = self.run_trusted_runner(fake_sdk, plan)

        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(payload[0]["command"], "get_battery_status")
        self.assertEqual(payload[0]["result"]["percent"], 82)
        self.assertEqual(payload[1]["command"], "get_body_state")
        self.assertEqual(payload[1]["result"]["mode"], "Stand")

    def test_trusted_runner_records_telemetry_failure_before_exiting(self) -> None:
        fake_sdk = """
class Agentech:
    @staticmethod
    def get_body_state(**kwargs):
        raise RuntimeError("status unavailable")
    @staticmethod
    def stop(**kwargs):
        return None
"""
        plan = {
            "version": 1,
            "commands": [{"name": "get_body_state", "args": {}, "line": 4}],
        }

        completed, payload = self.run_trusted_runner(fake_sdk, plan)

        self.assertNotEqual(completed.returncode, 0)
        self.assertEqual(payload[0]["status"], "failed")
        self.assertEqual(
            payload[0]["error"],
            {"type": "RuntimeError", "message": "status unavailable"},
        )

    def run_trusted_runner(
        self, fake_sdk: str, plan: dict
    ) -> tuple[subprocess.CompletedProcess[str], list[dict]]:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "agentech.py").write_text(fake_sdk, encoding="utf-8")
            plan_path = root / "session.plan.json"
            plan_path.write_text(json.dumps(plan), encoding="utf-8")
            results_path = root / "session.results.json"
            environment = os.environ.copy()
            environment["PYTHONPATH"] = str(root)
            completed = subprocess.run(
                [
                    sys.executable,
                    str(Path(__file__).with_name("trusted-robot-runner.py")),
                    str(plan_path),
                    "--results",
                    str(results_path),
                ],
                capture_output=True,
                text=True,
                env=environment,
                check=False,
            )
            payload = (
                json.loads(results_path.read_text(encoding="utf-8"))
                if results_path.exists()
                else []
            )
            return completed, payload


if __name__ == "__main__":
    unittest.main()
