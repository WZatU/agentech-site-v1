from tests.mujoco_translation.common import MujocoTranslationTestCase


class UnimplementedMethodsTest(MujocoTranslationTestCase):
    def test_model_blocked_action_translates_and_returns_specific_failure(self):
        parsed, _, execution = self.run_scenario(f"{self.facade}.search_tag()")
        self.assertTrue(parsed.valid)
        self.assertEqual("PREDEFINED_ACTION", parsed.commands[0].command_type)
        self.assertEqual("failed", execution.status)
        self.assertEqual(
            "BACKEND_METHOD_BLOCKED_BY_MODEL", execution.error_code
        )
        self.assertNotEqual(
            "BACKEND_COMMAND_NOT_IMPLEMENTED", execution.error_code
        )
        self.assertEqual(0, execution.commands_executed)
