import unittest

from tests.full_sdk_backend.common import CAPABILITIES, run_method


class AthleticsMethodsTest(unittest.TestCase):
    def test_jump_is_physically_airborne(self):
        _, _, execution = run_method("jump()")
        metric = execution.command_metrics[0]
        self.assertEqual("completed", execution.status)
        self.assertGreater(metric["airborne_duration"], 0.05)
        self.assertFalse(metric["fell"])

    def test_jump_forward_is_airborne_and_forward(self):
        _, _, execution = run_method("jump_forward()")
        metric = execution.command_metrics[0]
        self.assertGreater(metric["airborne_duration"], 0.05)
        self.assertGreater(metric["body_frame_displacement"]["forward"], 0.02)

    def test_flips_are_not_executed(self):
        self.assertEqual(
            "BLOCKED_BY_UNRESOLVED_SPEC",
            CAPABILITIES.get("jump_round").status.value,
        )
        for method in ("frontflip", "sideflip"):
            entry = CAPABILITIES.get(method)
            self.assertEqual("FAILED", entry.status.value)
            self.assertEqual("INSUFFICIENT", entry.evidence_status.value)
            self.assertNotEqual("UNSAFE_PROVEN", entry.backend_behavior_status.value)
