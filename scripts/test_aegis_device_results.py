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

    def test_error_shaped_telemetry_cannot_be_completed(self) -> None:
        with self.assertRaisesRegex(ValueError, "error"):
            self.module.success_record(
                {"name": "get_battery_status", "line": 3},
                {"percent": None, "voltage": None, "error": "no feedback"},
                "2026-08-24T20:00:00.000Z",
            )

    def test_hardware_absence_is_serialized_as_not_supported(self) -> None:
        error = RuntimeError("battery is not installed")
        error.capability = "battery"
        error.reason = "hardware_absent"
        error.device = "192.168.4.88"

        record = self.module.not_supported_record(
            {"name": "get_battery_status", "line": 3},
            error,
            "2026-08-24T20:00:00.000Z",
        )

        self.assertEqual(record["status"], "not_supported")
        self.assertEqual(record["error"]["reason"], "hardware_absent")
        self.assertIsNone(record["result"])

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

    def test_trusted_runner_records_body_return_and_final_result(self) -> None:
        fake_sdk = """
class Agentech:
    @staticmethod
    def get_body_state(**kwargs):
        return {"mode": "Stand"}
    @staticmethod
    def stop(**kwargs):
        return None
"""
        plan = {
            "version": 2,
            "robot_model": "aegis",
            "submission_id": "submission-test",
            "source_sha256": "a" * 64,
            "device_profile": {"device": "192.168.4.88", "battery_present": False, "battery_reason": "hardware_absent"},
            "commands": [
                {"name": "get_body_state", "args": {}, "line": 4},
            ],
        }

        completed, payload, final = self.run_trusted_runner(fake_sdk, plan)

        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(payload[0]["command"], "get_body_state")
        self.assertEqual(payload[0]["result"]["mode"], "Stand")
        self.assertEqual(final["outcome"], "completed")
        self.assertEqual(final["completed_count"], 1)

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
            "version": 2,
            "robot_model": "aegis",
            "submission_id": "submission-test",
            "source_sha256": "a" * 64,
            "device_profile": {"device": "192.168.4.88", "battery_present": False, "battery_reason": "hardware_absent"},
            "commands": [{"name": "get_body_state", "args": {}, "line": 4}],
        }

        completed, payload, final = self.run_trusted_runner(fake_sdk, plan)

        self.assertNotEqual(completed.returncode, 0)
        self.assertEqual(payload[0]["status"], "failed")
        self.assertEqual(
            payload[0]["error"],
            {"type": "RuntimeError", "message": "status unavailable"},
        )
        self.assertEqual(final["outcome"], "failed")
        self.assertEqual(final["error"]["command_index"], 1)

    def run_trusted_runner(
        self, fake_sdk: str, plan: dict
    ) -> tuple[subprocess.CompletedProcess[str], list[dict], dict]:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "agentech.py").write_text(fake_sdk, encoding="utf-8")
            plan_path = root / "session.plan.json"
            plan_path.write_text(json.dumps(plan), encoding="utf-8")
            results_path = root / "session.results.json"
            final_path = root / "session.execution.json"
            environment = os.environ.copy()
            environment["PYTHONPATH"] = str(root)
            completed = subprocess.run(
                [
                    sys.executable,
                    str(Path(__file__).with_name("trusted-robot-runner.py")),
                    str(plan_path),
                    "--results",
                    str(results_path),
                    "--final-result",
                    str(final_path),
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
            final = (
                json.loads(final_path.read_text(encoding="utf-8"))
                if final_path.exists()
                else {}
            )
            return completed, payload, final


if __name__ == "__main__":
    unittest.main()
