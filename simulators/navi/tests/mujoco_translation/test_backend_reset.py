from backends.mujoco_backend import MujocoBackend
from tests.mujoco_translation.common import MujocoTranslationTestCase


class BackendResetTest(MujocoTranslationTestCase):
    def test_reset_returns_to_standing_keyframe(self):
        backend = MujocoBackend(max_simulation_time=5)
        try:
            backend.step(0.1)
            self.assertGreater(backend.data.time, 0)
            backend.reset()
            self.assertEqual(0.0, backend.data.time)
            self.assertAlmostEqual(0.276256, backend.data.qpos[2], places=6)
            self.assertEqual("STAND", backend.adapter.mode)
        finally:
            backend.finalize()
