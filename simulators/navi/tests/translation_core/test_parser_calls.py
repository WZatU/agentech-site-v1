from tests.translation_core.common import CoreTestCase


class ParserCallsTest(CoreTestCase):
    def test_keyword_and_static_variable_call(self):
        result = self.parse(
            f"speed = 0.1 + 0.2\nduration = 2\n{self.spec.robot_class}.forward(speed_mps=speed, duration_s=duration)"
        )
        self.assertTrue(result.valid)
        command = result.commands[0]
        self.assertAlmostEqual(0.3, command.parameters["speed_mps"])
        self.assertEqual(2.0, command.parameters["duration_s"])
        self.assertIn("stop", command.defaults_applied)

    def test_positional_and_mixed_arguments(self):
        positional = self.parse(f"{self.spec.robot_class}.forward(0.3, 2)")
        self.assertTrue(positional.valid)
        mixed = self.parse(f"{self.spec.robot_class}.forward(0.3, duration_s=2)")
        self.assertTrue(mixed.valid)

    def test_unknown_and_legacy_calls(self):
        unknown = self.parse(f"{self.spec.robot_class}.not_a_real_method()")
        self.assertIn("UNKNOWN_SDK_METHOD", self.error_codes(unknown))
        for legacy in ("do_action", "do_behavior"):
            result = self.parse(f"{self.spec.robot_class}.{legacy}('x')")
            self.assertIn("LEGACY_METHOD_NOT_PUBLIC", self.error_codes(result))

    def test_error_has_source_line(self):
        result = self.parse(f"x = 1\n{self.spec.robot_class}.not_real()")
        self.assertEqual(3, result.issues[0].line)
