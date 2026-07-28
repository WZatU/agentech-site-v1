from tests.mujoco_translation.common import MujocoTranslationTestCase
from backends.mujoco_backend import MujocoBackend


class BackendLoadTest(MujocoTranslationTestCase):
    def test_model_and_frequencies(self):
        backend = MujocoBackend(max_simulation_time=5)
        try:
            self.assertAlmostEqual(0.001, backend.physics_timestep)
            self.assertAlmostEqual(0.001, backend.controller_update_period)
            self.assertAlmostEqual(0.01, backend.sample_period)
            self.assertEqual(12, backend.model.nu)
            self.assertEqual(42, backend.model.nsensor)
        finally:
            backend.finalize()
