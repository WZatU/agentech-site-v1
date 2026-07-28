from tests.mujoco_translation.common import MujocoTranslationTestCase


class BackwardIntegrationTest(MujocoTranslationTestCase):
    def test_real_backward_direction(self):
        _, _, execution = self.run_scenario(
            f"{self.facade}.stand()\n{self.facade}.backward(speed_mps=0.09, duration_s=2)\n{self.facade}.stop()"
        )
        metric = self.metric(execution, "backward")
        self.assertLess(metric["body_frame_displacement"]["forward"], -0.05)
        self.assertFalse(metric["fell"])
