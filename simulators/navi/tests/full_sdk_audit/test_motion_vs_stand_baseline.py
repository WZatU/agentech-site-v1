import unittest

from .common import REPORT, load_json


class MotionVsStandBaselineTest(unittest.TestCase):
    def test_non_motion_and_failed_full_verification_are_explicit(self):
        methods = load_json(REPORT / "physical_execution_audit.json")["methods"]
        no_motion = {row["method"] for row in methods if not row["observable_motion"]}
        unverified = {
            row["method"] for row in methods
            if not row["physical_execution_verified"]
        }
        self.assertEqual(
            {"stand", "stand_at_ease", "stop", "emergency_stop"}, no_motion
        )
        self.assertEqual(no_motion | {"stand_at_attention"}, unverified)
        for row in methods:
            self.assertGreaterEqual(row["simulation_duration_s"], 0.0)
            self.assertIn("actuator_control_rms_vs_stand", row)
