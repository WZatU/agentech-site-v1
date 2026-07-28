from __future__ import annotations

import unittest

from simulation import run_headless


COMMANDS = (
    "forward",
    "backward",
    "strafe_left",
    "strafe_right",
    "turn_left",
    "turn_right",
)


class MotionSafetyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.metrics = {
            command: run_headless(command, duration=3.0, settle_time=0.5)[3]
            for command in COMMANDS
        }

    def _assert_physical_motion(self, command: str) -> dict[str, object]:
        metrics = self.metrics[command]
        self.assertTrue(metrics["finite"])
        self.assertGreater(max(metrics["joint_peak_to_peak"]), 0.05)
        self.assertGreater(metrics["control_peak"], 0.25)
        self.assertGreaterEqual(metrics["contact_pattern_count"], 2)
        self.assertLess(metrics["max_abs_roll"], 0.45)
        self.assertLess(metrics["max_abs_pitch"], 0.45)
        self.assertGreater(metrics["final_height"], 0.12)
        self.assertLess(metrics["maximum_root_position_step"], 0.005)
        return metrics

    def test_forward(self) -> None:
        metrics = self._assert_physical_motion("forward")
        self.assertGreater(metrics["xy_displacement"][0], 0.003)

    def test_backward(self) -> None:
        metrics = self._assert_physical_motion("backward")
        self.assertLess(metrics["xy_displacement"][0], -0.01)

    def test_strafe_left(self) -> None:
        metrics = self._assert_physical_motion("strafe_left")
        self.assertGreater(metrics["xy_displacement"][1], 0.01)

    def test_strafe_right(self) -> None:
        metrics = self._assert_physical_motion("strafe_right")
        self.assertLess(metrics["xy_displacement"][1], -0.01)

    def test_turn_left(self) -> None:
        metrics = self._assert_physical_motion("turn_left")
        self.assertGreater(metrics["yaw_change"], 0.02)

    def test_turn_right(self) -> None:
        metrics = self._assert_physical_motion("turn_right")
        self.assertLess(metrics["yaw_change"], -0.02)


if __name__ == "__main__":
    unittest.main()

