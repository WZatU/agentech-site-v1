import unittest

from tests.full_sdk_backend.common import CAPABILITIES, run_method


class MovementMethodsTest(unittest.TestCase):
    def test_diagonal_is_real_body_frame_motion(self):
        _, _, execution = run_method(
            "diagonal(angle_deg=45, speed_mps=0.1, duration_s=2)"
        )
        metric = execution.command_metrics[0]
        capability = CAPABILITIES.get("diagonal")
        self.assertEqual("APPROXIMATE", capability.status.value)
        self.assertEqual(
            "PHYSICALLY_IMPLEMENTED",
            capability.backend_behavior_status.value,
        )
        self.assertEqual(
            "MULTIPLE_UNRESOLVED", capability.sdk_contract_status.value
        )
        self.assertGreater(metric["body_frame_displacement"]["forward"], 0.0)
        self.assertLess(metric["body_frame_displacement"]["left"], 0.0)
        self.assertFalse(metric["fell"])

    def test_return_home_is_model_blocked(self):
        self.assertEqual(
            "BLOCKED_BY_MODEL",
            CAPABILITIES.get("return_to_home").status.value,
        )
