from tests.mujoco_translation.common import MujocoTranslationTestCase


class LateralIntegrationTest(MujocoTranslationTestCase):
    def test_left_and_right_have_opposite_signs(self):
        _, _, left_run = self.run_scenario(
            f"{self.facade}.stand()\n{self.facade}.lateral_left(speed_mps=0.10, duration_s=2)\n{self.facade}.stop()"
        )
        _, _, right_run = self.run_scenario(
            f"{self.facade}.stand()\n{self.facade}.lateral_right(speed_mps=0.10, duration_s=2)\n{self.facade}.stop()"
        )
        left = self.metric(left_run, "lateral_left")
        right = self.metric(right_run, "lateral_right")
        self.assertGreater(left["body_frame_displacement"]["left"], 0.05)
        self.assertLess(right["body_frame_displacement"]["left"], -0.05)
        self.assertFalse(left["fell"])
        self.assertFalse(right["fell"])
