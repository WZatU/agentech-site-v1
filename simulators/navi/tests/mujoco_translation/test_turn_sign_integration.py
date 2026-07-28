from tests.mujoco_translation.common import MujocoTranslationTestCase


class TurnSignIntegrationTest(MujocoTranslationTestCase):
    def test_sdk_positive_is_real_right_turn(self):
        parsed, _, execution = self.run_scenario(
            f"{self.facade}.stand()\n{self.facade}.turn(angle_deg=10)"
        )
        turn_ir = next(command for command in parsed.commands if command.canonical_method == "turn")
        mapping = next(item for item in execution.backend_mapping if item["canonical_method"] == "turn")
        metric = self.metric(execution, "turn")
        self.assertEqual(10.0, turn_ir.parameters["angle_deg"])
        self.assertLess(mapping["backend_mapping"]["controller_target"]["yaw_rate_rad_s"], 0)
        self.assertLess(metric["yaw_change"], -0.02)

    def test_sdk_negative_is_real_left_turn(self):
        _, _, execution = self.run_scenario(
            f"{self.facade}.stand()\n{self.facade}.turn(angle_deg=-10)"
        )
        mapping = next(item for item in execution.backend_mapping if item["canonical_method"] == "turn")
        metric = self.metric(execution, "turn")
        self.assertGreater(mapping["backend_mapping"]["controller_target"]["yaw_rate_rad_s"], 0)
        self.assertGreater(metric["yaw_change"], 0.02)
