from tests.mujoco_translation.common import MujocoTranslationTestCase


class BodyFrameMotionTest(MujocoTranslationTestCase):
    def test_after_right_turn_forward_is_not_initial_world_forward(self):
        _, _, execution = self.run_scenario(
            f"{self.facade}.turn(angle_deg=90)\n{self.facade}.forward(speed_mps=0.12, duration_s=2)"
        )
        forward = self.metric(execution, "forward")
        self.assertGreater(forward["body_frame_displacement"]["forward"], 0.10)
        self.assertLess(forward["world_displacement"]["y"], -0.10)
