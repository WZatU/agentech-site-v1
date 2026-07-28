import unittest

from tests.full_sdk_backend.common import run_method


class SafetyMethodsTest(unittest.TestCase):
    def test_emergency_stop_is_distinct_stable_simulation(self):
        _, _, execution = run_method("emergency_stop()")
        mapping = execution.backend_mapping[0]
        self.assertEqual("SIMULATED", mapping["backend_capability_status"])
        self.assertEqual(
            "zero_velocity_and_joint_pd_hold",
            mapping["backend_mapping"]["stop_mapping"],
        )
        self.assertFalse(execution.final_state["base_position"][2] < 0.12)

