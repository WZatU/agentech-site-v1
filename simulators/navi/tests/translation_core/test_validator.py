from tests.translation_core.common import CoreTestCase


class ValidatorTest(CoreTestCase):
    def test_numeric_range(self):
        result = self.parse(f"{self.spec.robot_class}.forward(speed_mps=99)")
        self.assertIn("ARGUMENT_OUT_OF_RANGE", self.error_codes(result))

    def test_enum(self):
        result = self.parse(f"{self.spec.robot_class}.sideflip(direction='up')")
        self.assertIn("INVALID_ENUM_VALUE", self.error_codes(result))

    def test_unresolved_default_is_not_invented(self):
        result = self.parse(f"{self.spec.robot_class}.cute()")
        self.assertTrue(result.valid)
        self.assertNotIn("style", result.commands[0].parameters)
        self.assertIn("UNRESOLVED_DEFAULT_VALUE", [warning.error_code for warning in result.warnings])

    def test_conditional_enum_exclusion(self):
        result = self.parse(
            f"{self.spec.robot_class}.brush_teeth(direction='left', phase='start')"
        )
        self.assertIn("INVALID_ENUM_VALUE", self.error_codes(result))

    def test_under_development_is_rejected(self):
        result = self.parse(f"{self.spec.robot_class}.set_gait(gait_id=1)")
        self.assertIn("UNRESOLVED_METHOD_SEMANTICS", self.error_codes(result))
