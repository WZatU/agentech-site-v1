from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch


class FakeAgentech:
    calls: list[tuple[str, dict]] = []
    fail_on: str | None = None

    @classmethod
    def stand(cls, **arguments):
        cls.calls.append(("stand", arguments))
        return {"state": "standing"}

    @classmethod
    def squat(cls, **arguments):
        cls.calls.append(("squat", arguments))
        if cls.fail_on == "squat":
            raise RuntimeError("point-foot preparation failed")
        return {"state": "squat"}

    @classmethod
    def sit(cls, **arguments) -> None:
        cls.calls.append(("sit", arguments))

    @classmethod
    def stop(cls, **arguments) -> None:
        cls.calls.append(("stop", arguments))


RUNNER_PATH = Path(__file__).with_name("trusted-robot-runner.py")
SPEC = importlib.util.spec_from_file_location("trusted_robot_runner", RUNNER_PATH)
assert SPEC and SPEC.loader
runner = importlib.util.module_from_spec(SPEC)
fake_module = types.ModuleType("agentech")
fake_module.Agentech = FakeAgentech
with patch.dict(sys.modules, {"agentech": fake_module}):
    SPEC.loader.exec_module(runner)


class TrustedRobotRunnerTests(unittest.TestCase):
    def setUp(self) -> None:
        FakeAgentech.calls.clear()
        FakeAgentech.fail_on = None

    def plan(self, commands: list[dict]) -> dict:
        return {
            "version": 2,
            "robot_model": "aegis",
            "submission_id": "submission-test",
            "source_sha256": "a" * 64,
            "device_profile": {
                "device": "192.168.4.88",
                "battery_present": False,
                "battery_reason": "hardware_absent",
            },
            "commands": commands,
        }

    def test_end_session_lie_down_uses_verified_sit_route_then_stops(self) -> None:
        runner.end_session_lie_down()

        self.assertEqual(
            FakeAgentech.calls,
            [
                ("sit", {"host": "127.0.0.1"}),
                ("stop", {"host": "127.0.0.1"}),
            ],
        )

    def test_execute_writes_atomic_completed_final_result(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            plan_path = root / "session-42.plan.json"
            final_path = root / "session-42.execution.json"
            plan_path.write_text(
                json.dumps(self.plan([{"name": "stand", "args": {}, "line": 2}])),
                encoding="utf-8",
            )

            result = runner.execute(
                plan_path,
                final_result_path=final_path,
                agentech=FakeAgentech,
            )

            self.assertEqual(result["outcome"], "completed")
            self.assertEqual(result["session_id"], "42")
            self.assertEqual(result["completed_count"], 1)
            self.assertEqual(result["commands"][0]["status"], "completed")
            self.assertEqual(json.loads(final_path.read_text(encoding="utf-8")), result)
            self.assertFalse(final_path.with_suffix(final_path.suffix + ".tmp").exists())

    def test_execute_failure_preserves_first_command_error(self) -> None:
        FakeAgentech.fail_on = "squat"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            plan_path = root / "session-43.plan.json"
            final_path = root / "session-43.execution.json"
            plan_path.write_text(
                json.dumps(
                    self.plan(
                        [
                            {"name": "stand", "args": {}, "line": 2},
                            {"name": "squat", "args": {}, "line": 3},
                        ]
                    )
                ),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(RuntimeError, "point-foot preparation failed"):
                runner.execute(
                    plan_path,
                    final_result_path=final_path,
                    agentech=FakeAgentech,
                )

            result = json.loads(final_path.read_text(encoding="utf-8"))
            self.assertEqual(result["outcome"], "failed")
            self.assertEqual(result["completed_count"], 1)
            self.assertEqual(result["error"]["command_index"], 2)
            self.assertEqual(result["error"]["type"], "RuntimeError")

    def test_hand_edited_plan_is_refused_before_motion_dispatch(self) -> None:
        plan = self.plan(
            [
                {
                    "name": "turn",
                    "args": {"angle_deg": -10, "turn_rate_deg_s": -10},
                    "line": 2,
                }
            ]
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            plan_path = root / "session-44.plan.json"
            plan_path.write_text(json.dumps(plan), encoding="utf-8")

            with self.assertRaisesRegex(ValueError, "non-normalized"):
                runner.execute(plan_path, agentech=FakeAgentech)

        self.assertEqual(FakeAgentech.calls, [])

    def test_gateway_termination_becomes_a_structured_runner_failure(self) -> None:
        with self.assertRaisesRegex(runner.SessionTerminated, "terminated by signal 15"):
            runner._termination_handler(15, None)


if __name__ == "__main__":
    unittest.main()
