import math

from tests.mujoco_translation.common import MujocoTranslationTestCase


class StopIntegrationTest(MujocoTranslationTestCase):
    def test_stop_reduces_velocity_and_holds(self):
        _, _, execution = self.run_scenario(
            f"{self.facade}.forward(speed_mps=0.12, duration_s=1.5, stop=False)\n{self.facade}.stop()"
        )
        stop = self.metric(execution, "stop")
        final = execution.final_state
        speed = math.sqrt(sum(value * value for value in final["base_linear_velocity"]))
        self.assertLess(speed, 0.08)
        self.assertLess(abs(stop["body_frame_displacement"]["forward"]), 0.03)
