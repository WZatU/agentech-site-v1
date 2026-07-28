from tests.mujoco_translation.common import MujocoTranslationTestCase


class ForwardIntegrationTest(MujocoTranslationTestCase):
    def test_real_forward_direction_and_slip_reporting(self):
        _, _, execution = self.run_scenario(
            f"{self.facade}.stand()\n{self.facade}.forward(speed_mps=0.12, duration_s=2)\n{self.facade}.stop()"
        )
        metric = self.metric(execution, "forward")
        self.assertGreater(metric["body_frame_displacement"]["forward"], 0.10)
        self.assertFalse(metric["fell"])
        self.assertIsNotNone(metric["max_slip_speed"])
        self.assertGreaterEqual(metric["slip_duration"], 0.0)
        self.assertIn(metric["ground_truth_result"], {"PASS", "APPROXIMATE"})
