import unittest

import numpy as np

from backends.mujoco_backend import MujocoBackend
from tests.mujoco_translation.common import translate

from .common import EXPECTED


class StaticMethodSemanticsTest(unittest.TestCase):
    def test_stand_is_a_controlled_stable_hold(self):
        expected = EXPECTED["static_semantics"]["stand"]
        parsed, scheduled = translate("Agentech.stand()", max_time=10.0)
        self.assertTrue(parsed.valid)
        self.assertTrue(scheduled.valid)
        backend = MujocoBackend(max_simulation_time=10.0, seed=0)
        start_xy = np.asarray(backend.data.qpos[:2], dtype=float).copy()
        execution = backend.execute(scheduled.commands)
        backend.step(expected["minimum_hold_s"])
        state = backend.get_state()
        drift = float(
            np.linalg.norm(np.asarray(state.base_position[:2]) - start_xy)
        )
        controls = np.asarray(state.actuator_controls, dtype=float)
        self.assertEqual("completed", execution.status)
        self.assertGreater(float(np.linalg.norm(controls)), 0.1)
        self.assertLess(drift, expected["maximum_xy_drift_m"])
        self.assertLess(
            max(abs(state.orientation_rpy[0]), abs(state.orientation_rpy[1])),
            expected["maximum_abs_roll_pitch_rad"],
        )
        self.assertEqual(expected["required_contacts"], state.contact_count)
        self.assertFalse(backend.safety_monitor.fatal)
