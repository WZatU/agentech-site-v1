from backends.mujoco_backend import MujocoBackend
from tests.mujoco_translation.common import MujocoTranslationTestCase


class StateMonitorTest(MujocoTranslationTestCase):
    def test_real_state_fields(self):
        backend = MujocoBackend(max_simulation_time=5)
        try:
            backend.step(0.02)
            state = backend.get_state()
            self.assertEqual(12, len(state.joint_positions))
            self.assertEqual(12, len(state.joint_velocities))
            self.assertEqual(12, len(state.actuator_controls))
            self.assertEqual(12, len(state.actuator_forces))
            self.assertEqual(4, len(state.foot_contacts))
            self.assertEqual(3, len(state.imu_acceleration))
            self.assertTrue(0 <= state.contact_count <= 4)
        finally:
            backend.finalize()
