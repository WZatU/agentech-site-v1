from tests.translation_core.common import CoreTestCase


class ParserFunctionsTest(CoreTestCase):
    def test_function_with_static_parameters_and_defaults(self):
        result = self.parse(
            f"""
def walk_once(speed, duration=1):
    {self.spec.robot_class}.forward(speed_mps=speed, duration_s=duration)
    {self.spec.robot_class}.stop()

walk_once(0.2, duration=2)
"""
        )
        self.assertTrue(result.valid)
        self.assertEqual(["forward", "stop"], [command.canonical_method for command in result.commands])

    def test_main_guard(self):
        result = self.parse(
            f"""
def main():
    {self.spec.robot_class}.stand()

if __name__ == "__main__":
    main()
"""
        )
        self.assertTrue(result.valid)
        self.assertEqual(1, len(result.commands))

    def test_direct_recursion_rejected(self):
        result = self.parse(
            """
def recurse():
    recurse()

recurse()
"""
        )
        self.assertIn("RECURSION_NOT_SUPPORTED", self.error_codes(result))

    def test_mutual_cycle_rejected(self):
        result = self.parse(
            """
def a():
    b()
def b():
    a()
a()
"""
        )
        self.assertIn("CALL_GRAPH_CYCLE", self.error_codes(result))
