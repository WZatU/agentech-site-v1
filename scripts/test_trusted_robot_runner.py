from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


class FakeAgentech:
    calls: list[tuple[str, dict]] = []

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

    def test_end_session_lie_down_uses_verified_sit_route_then_stops(self) -> None:
        runner.end_session_lie_down()

        self.assertEqual(
            FakeAgentech.calls,
            [
                ("sit", {"host": "127.0.0.1"}),
                ("stop", {"host": "127.0.0.1"}),
            ],
        )


if __name__ == "__main__":
    unittest.main()
