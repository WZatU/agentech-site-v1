import unittest

import numpy as np

from simulation.actions import ActionRegistry
from tests.mujoco_translation.common import run_scenario

from .common import CAPABILITIES, EXPECTED


class StandVsStandAtEaseTest(unittest.TestCase):
    def test_relaxed_stance_has_fixed_measurable_target_difference(self):
        expected = EXPECTED["static_semantics"]["stand_at_ease"]
        profile = ActionRegistry().profile_for("stand_at_ease", duration_override=2.0)
        target = profile.phases[0].joint_offsets_rad
        offsets = np.asarray(list(target.values()), dtype=float)
        self.assertGreaterEqual(
            float(np.sqrt(np.mean(offsets**2))),
            expected["minimum_joint_target_rms_vs_stand_rad"],
        )
        _, _, execution = run_scenario("Agentech.stand_at_ease(time=2)")
        metric = execution.command_metrics[0]
        self.assertEqual("completed", execution.status)
        self.assertGreater(metric["max_joint_excursion_rad"], 0.10)
        self.assertFalse(metric["fell"])
        entry = CAPABILITIES.get("stand_at_ease")
        self.assertEqual("APPROXIMATE", entry.status.value)
        self.assertEqual("AMBIGUOUS", entry.ground_truth_status.value)
