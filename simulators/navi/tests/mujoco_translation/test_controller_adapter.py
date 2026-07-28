from backends.mujoco_backend import MujocoBackend
from tests.mujoco_translation.common import MujocoTranslationTestCase


class ControllerAdapterTest(MujocoTranslationTestCase):
    def test_turn_is_negated_only_at_adapter(self):
        backend = MujocoBackend(max_simulation_time=5)
        try:
            mapping = backend.adapter.set_body_velocity(0.0, 0.0, 0.4)
            self.assertEqual(0.4, mapping.metadata["sdk_yaw_value"])
            self.assertEqual(-0.4, mapping.controller_target["yaw_rate_rad_s"])
            self.assertEqual("negated_at_backend_boundary", mapping.metadata["conversion"])
        finally:
            backend.finalize()

    def test_lateral_is_not_blindly_negated(self):
        backend = MujocoBackend(max_simulation_time=5)
        try:
            left = backend.adapter.set_body_velocity(0.0, 0.07, 0.0)
            right = backend.adapter.set_body_velocity(0.0, -0.07, 0.0)
            self.assertGreater(left.controller_target["vy_mps"], 0)
            self.assertLess(right.controller_target["vy_mps"], 0)
        finally:
            backend.finalize()
