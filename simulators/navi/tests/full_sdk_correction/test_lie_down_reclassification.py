import unittest

from tests.mujoco_translation.common import run_scenario

from .common import CAPABILITIES, EXPECTED


class LieDownReclassificationTest(unittest.TestCase):
    def test_physical_approximation_is_separate_from_contract(self):
        entry = CAPABILITIES.get("lie_down")
        expected = EXPECTED["lie_down"]
        self.assertEqual(
            expected["target_backend_behavior_status"],
            entry.backend_behavior_status.value,
        )
        self.assertEqual(expected["contract_status"], entry.sdk_contract_status.value)
        self.assertEqual("VERIFIED_WITH_LIMITATIONS", entry.evidence_status.value)
        self.assertEqual(expected["target_legacy_status"], entry.status.value)
        _, _, execution = run_scenario("Agentech.lie_down()")
        metric = execution.command_metrics[0]
        self.assertEqual("completed", execution.status)
        self.assertLessEqual(
            execution.final_state["base_position"][2],
            expected["maximum_final_base_height_m"],
        )
        self.assertGreaterEqual(
            metric["max_joint_excursion_rad"],
            expected["minimum_joint_excursion_rad"],
        )
        self.assertFalse(metric["fell"])
