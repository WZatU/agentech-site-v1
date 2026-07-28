import time

from tests.mujoco_translation.common import MujocoTranslationTestCase


class WaitSemanticsTest(MujocoTranslationTestCase):
    def test_wait_advances_simulation_not_wall_clock(self):
        started = time.perf_counter()
        _, _, execution = self.run_scenario("from time import sleep\nsleep(1.0)")
        wall = time.perf_counter() - started
        self.assertAlmostEqual(1.0, execution.simulation_time, places=9)
        self.assertLess(wall, 5.0)
        self.assertEqual("sleep", execution.command_metrics[0]["method"])
