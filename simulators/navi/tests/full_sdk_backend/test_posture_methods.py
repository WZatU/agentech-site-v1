import unittest

from tests.full_sdk_backend.common import CAPABILITIES, run_method


class PostureMethodsTest(unittest.TestCase):
    def test_squat_and_sit_are_distinct_profiles(self):
        _, _, squat = run_method("squat(time=1)")
        _, _, sit = run_method("sit(time=1)")
        squat_mapping = squat.backend_mapping[0]["backend_mapping"]
        sit_mapping = sit.backend_mapping[0]["backend_mapping"]
        self.assertNotEqual(squat_mapping["profile"], sit_mapping["profile"])
        self.assertGreater(squat.command_metrics[0]["max_joint_excursion_rad"], 0.1)
        self.assertGreater(sit.command_metrics[0]["max_joint_excursion_rad"], 0.1)

    def test_lie_down_is_a_qualified_physical_approximation(self):
        capability = CAPABILITIES.get("lie_down")
        self.assertEqual(
            "APPROXIMATE",
            capability.status.value,
        )
        self.assertEqual("APPROXIMATE", capability.backend_behavior_status.value)
        self.assertEqual("MULTIPLE_UNRESOLVED", capability.sdk_contract_status.value)
        _, _, result = run_method("lie_down()")
        self.assertEqual("completed", result.status)
        self.assertEqual(1, result.commands_executed)
        self.assertGreater(result.command_metrics[0]["max_joint_excursion_rad"], 0.08)
        self.assertFalse(result.command_metrics[0]["fell"])
