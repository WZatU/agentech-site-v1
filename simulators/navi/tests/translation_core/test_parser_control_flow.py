from tests.translation_core.common import CoreTestCase


class ParserControlFlowTest(CoreTestCase):
    def test_static_if(self):
        result = self.parse(f"enabled = True\nif enabled:\n    {self.spec.robot_class}.stand()")
        self.assertTrue(result.valid)
        self.assertEqual(1, len(result.commands))

    def test_static_false_else(self):
        result = self.parse(
            f"enabled = False\nif enabled:\n    {self.spec.robot_class}.stand()\nelse:\n    {self.spec.robot_class}.stop()"
        )
        self.assertTrue(result.valid)
        self.assertEqual("stop", result.commands[0].canonical_method)

    def test_query_control_flow_rejected(self):
        result = self.parse(
            f"battery = {self.spec.robot_class}.get_battery_status()\nif battery < 20:\n    {self.spec.robot_class}.stop()"
        )
        self.assertIn("QUERY_VALUE_USED_IN_UNSUPPORTED_EXPRESSION", self.error_codes(result))

    def test_sleep_becomes_wait(self):
        result = self.parse(
            f"import time\n{self.spec.robot_class}.stand()\ntime.sleep(2)\n{self.spec.robot_class}.stop()"
        )
        self.assertTrue(result.valid)
        self.assertEqual(["STATE_CHANGE", "WAIT", "SAFETY"], [command.command_type for command in result.commands])
