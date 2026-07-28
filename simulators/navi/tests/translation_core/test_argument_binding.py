from tests.translation_core.common import CoreTestCase


class ArgumentBindingTest(CoreTestCase):
    def test_duplicate_argument(self):
        result = self.parse(f"{self.spec.robot_class}.forward(0.3, speed_mps=0.4)")
        self.assertIn("DUPLICATE_ARGUMENT", self.error_codes(result))

    def test_unknown_keyword(self):
        result = self.parse(f"{self.spec.robot_class}.forward(nope=1)")
        self.assertIn("UNKNOWN_KEYWORD_ARGUMENT", self.error_codes(result))

    def test_positional_overflow(self):
        result = self.parse(f"{self.spec.robot_class}.stand(1)")
        self.assertIn("POSITIONAL_ARGUMENT_OVERFLOW", self.error_codes(result))

    def test_bool_is_not_integer_or_number(self):
        number = self.parse(f"{self.spec.robot_class}.forward(speed_mps=True)")
        self.assertIn("INVALID_ARGUMENT_TYPE", self.error_codes(number))
        integer = self.parse(f"{self.spec.robot_class}.bark(count=True)")
        self.assertIn("INVALID_ARGUMENT_TYPE", self.error_codes(integer))

    def test_legacy_parameter_alias_normalizes(self):
        result = self.parse(f"{self.spec.robot_class}.forward(speed=0.3, seconds=2)")
        self.assertTrue(result.valid)
        self.assertEqual(0.3, result.commands[0].parameters["speed_mps"])
        self.assertEqual(2.0, result.commands[0].parameters["duration_s"])
