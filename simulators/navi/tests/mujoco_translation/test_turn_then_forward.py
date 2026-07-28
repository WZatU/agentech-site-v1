import math

from tests.mujoco_translation.common import MujocoTranslationTestCase


class TurnThenForwardTest(MujocoTranslationTestCase):
    def test_forward_uses_new_body_heading(self):
        _, _, execution = self.run_scenario(
            f"{self.facade}.stand()\n{self.facade}.turn(angle_deg=90)\n{self.facade}.forward(speed_mps=0.12, duration_s=2)\n{self.facade}.stop()"
        )
        turn = self.metric(execution, "turn")
        forward = self.metric(execution, "forward")
        self.assertLess(turn["yaw_change"], -math.radians(75.0))
        self.assertGreater(turn["yaw_change"], -math.radians(105.0))
        self.assertGreater(forward["body_frame_displacement"]["forward"], 0.10)
        self.assertLess(forward["world_displacement"]["y"], -0.10)
