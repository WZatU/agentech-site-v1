from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


RUNNER_PATH = Path(__file__).with_name("trusted-navi-runner.py")
sys.path.insert(0, str(RUNNER_PATH.parent))
SPEC = importlib.util.spec_from_file_location("trusted_navi_runner", RUNNER_PATH)
assert SPEC and SPEC.loader
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


class FakeAgentech:
    def __init__(self, failures: dict[str, BaseException] | None = None) -> None:
        self.calls: list[str] = []
        self.failures = failures or {}

    def __getattr__(self, name: str):
        def call(**_arguments):
            self.calls.append(name)
            error = self.failures.get(name)
            if error:
                raise error

        return call


def write_plan(commands: list[str]) -> str:
    directory = tempfile.mkdtemp(prefix="agentech-navi-runner-")
    path = Path(directory, "plan.json")
    path.write_text(
        json.dumps({
            "version": 2,
            "robot_model": "navi",
            "commands": [{"name": name, "args": {}} for name in commands],
        }),
        encoding="utf-8",
    )
    return str(path)


class TrustedNaviRunnerTests(unittest.TestCase):
    def test_end_session_lie_down_uses_sdk_then_stops(self) -> None:
        agentech = FakeAgentech()

        with patch.object(runner, "configure_navi", return_value=agentech):
            runner.end_session_lie_down()

        self.assertEqual(agentech.calls, ["lie_down", "stop"])

    def test_yaw_turn_convergence_timeout_stops_then_continues(self) -> None:
        agentech = FakeAgentech({
            "u_turn": TimeoutError("Navi yaw-feedback turn timed out at 135.45 degrees")
        })
        plan = write_plan(["u_turn", "pee", "turn_right", "lie_down"])

        with patch.object(runner, "configure_navi", return_value=agentech):
            runner.execute(plan)

        self.assertEqual(
            agentech.calls,
            ["u_turn", "stop", "pee", "turn_right", "lie_down", "stop"],
        )

    def test_unrelated_timeout_still_aborts_the_plan(self) -> None:
        agentech = FakeAgentech({
            "u_turn": TimeoutError("Navi body_status yaw timed out before the turn")
        })
        plan = write_plan(["u_turn", "pee"])

        with patch.object(runner, "configure_navi", return_value=agentech):
            with self.assertRaisesRegex(TimeoutError, "body_status yaw"):
                runner.execute(plan)

        self.assertEqual(agentech.calls, ["u_turn", "stop"])

    def test_non_turn_timeout_still_aborts_the_plan(self) -> None:
        agentech = FakeAgentech({
            "pee": TimeoutError("Navi yaw-feedback turn timed out at 20 degrees")
        })
        plan = write_plan(["pee", "lie_down"])

        with patch.object(runner, "configure_navi", return_value=agentech):
            with self.assertRaisesRegex(TimeoutError, "yaw-feedback turn"):
                runner.execute(plan)

        self.assertEqual(agentech.calls, ["pee", "stop"])


if __name__ == "__main__":
    unittest.main()
