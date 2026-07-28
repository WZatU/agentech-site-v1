from __future__ import annotations

import math
import unittest

from simulation import run_headless


class StandingTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        _, _, _, cls.metrics = run_headless("stand", duration=5.0, settle_time=0.5)

    def test_five_second_state_is_finite(self) -> None:
        self.assertTrue(self.metrics["finite"])

    def test_body_remains_upright_at_reasonable_height(self) -> None:
        self.assertGreater(self.metrics["final_height"], 0.20)
        self.assertLess(self.metrics["final_height"], 0.34)
        self.assertLess(self.metrics["max_abs_roll"], 0.20)
        self.assertLess(self.metrics["max_abs_pitch"], 0.20)

    def test_all_feet_are_in_contact(self) -> None:
        self.assertTrue(all(self.metrics["final_contacts"].values()))

    def test_horizontal_drift_is_bounded(self) -> None:
        drift = math.hypot(*self.metrics["xy_displacement"])
        self.assertLess(drift, 0.03)


if __name__ == "__main__":
    unittest.main()

