from tests.translation_core.common import CoreTestCase


class GroundTruthConflictTest(CoreTestCase):
    def test_frontflip_conflict_in_ir_and_warning(self):
        result = self.parse(f"{self.spec.robot_class}.frontflip()")
        self.assertTrue(result.valid)
        command = result.commands[0]
        conflict = command.sdk_semantics["ground_truth_conflict"]
        self.assertEqual("SDK_DESCRIPTION_VS_VIDEO", conflict["conflict_type"])
        self.assertEqual("lying_on_side_or_back", conflict["video_observed_end_state"])
        self.assertIn("GROUND_TRUTH_CONFLICT", [warning.error_code for warning in result.warnings])

    def test_turn_keeps_public_sign(self):
        result = self.parse(f"{self.spec.robot_class}.turn(angle_deg=45)")
        command = result.commands[0]
        self.assertEqual(45.0, command.parameters["angle_deg"])
        self.assertEqual("deferred_to_mujoco_adapter", command.sdk_semantics["backend_sign_conversion"])

    def test_legacy_video_tokens_not_registered(self):
        legacy_only_token = "opening_cute_dog"
        tokens = self.parser().ground_truth["legacy_action_sequence"]["tokens_in_exact_video_order"]
        self.assertIn(legacy_only_token, tokens)
        self.assertNotIn(legacy_only_token, self.registry.list_public_names())
        self.assertNotIn("do_action", self.registry.list_public_names())
        self.assertNotIn("do_behavior", self.registry.list_public_names())

    def test_current_method_can_reference_legacy_video_without_registering_wrapper(self):
        result = self.parse(f"{self.spec.robot_class}.eager()")
        reference = result.commands[0].ground_truth_reference
        self.assertEqual("legacy_video", reference["evidence"])
        self.assertEqual("eager", reference["legacy_token"])
