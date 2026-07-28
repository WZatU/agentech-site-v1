import unittest

from simulation.actions import ActionRegistry
from tests.full_sdk_backend.common import CAPABILITIES, RAW_SPEC, run_method


class ActionMethodsTest(unittest.TestCase):
    def test_all_78_actions_have_one_capability(self):
        actions = {
            name for name, value in RAW_SPEC["methods"].items()
            if value["category"] == "actions"
        }
        self.assertEqual(78, len(actions))
        self.assertTrue(all(method in CAPABILITIES for method in actions))

    def test_all_executable_profile_actions_are_covered(self):
        registry = ActionRegistry()
        expected = {
            entry.method for entry in CAPABILITIES.entries
            if entry.category == "actions"
            and entry.status.value == "APPROXIMATE"
            and entry.implementation == "data_driven_joint_profile"
        }
        self.assertEqual(expected, set(registry.method_profiles) & expected)

    def test_wave_hand_has_real_joint_excursion(self):
        _, _, execution = run_method("wave_hand()")
        self.assertGreater(
            execution.command_metrics[0]["max_joint_excursion_rad"], 0.1
        )

