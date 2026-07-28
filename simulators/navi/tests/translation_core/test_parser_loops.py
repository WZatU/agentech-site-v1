from tests.translation_core.common import CoreTestCase
from translator.limits import TranslationLimits


class ParserLoopsTest(CoreTestCase):
    def test_range_loop_expands(self):
        result = self.parse(f"for _ in range(3):\n    {self.spec.robot_class}.stand()")
        self.assertTrue(result.valid)
        self.assertEqual(3, len(result.commands))

    def test_range_start_stop_step(self):
        result = self.parse(f"for i in range(1, 6, 2):\n    {self.spec.robot_class}.stand()")
        self.assertTrue(result.valid)
        self.assertEqual(3, len(result.commands))

    def test_large_loop_rejected_before_expansion(self):
        limits = TranslationLimits(max_loop_iterations=10)
        result = self.parse(
            f"for _ in range(1000000):\n    {self.spec.robot_class}.stand()",
            limits=limits,
        )
        self.assertIn("MAX_LOOP_ITERATIONS_EXCEEDED", self.error_codes(result))

    def test_max_command_limit(self):
        limits = TranslationLimits(max_loop_iterations=10, max_commands=2)
        result = self.parse(
            f"for _ in range(3):\n    {self.spec.robot_class}.stand()",
            limits=limits,
        )
        self.assertIn("MAX_COMMAND_COUNT_EXCEEDED", self.error_codes(result))
