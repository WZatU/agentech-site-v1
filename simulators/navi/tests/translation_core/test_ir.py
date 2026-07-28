import json

from tests.translation_core.common import CoreTestCase


class IrTest(CoreTestCase):
    def test_ir_is_json_serializable(self):
        result = self.parse(f"{self.spec.robot_class}.forward(speed_mps=0.3, duration_s=2)")
        payload = result.commands[0].to_dict()
        json.dumps(payload)
        self.assertEqual("VELOCITY_MOTION", payload["command_type"])
        self.assertEqual("BODY_FRAME", payload["coordinate_frame"])

    def test_turn_preserves_sdk_right_positive(self):
        result = self.parse(f"{self.spec.robot_class}.turn(angle_deg=90)")
        command = result.commands[0]
        self.assertEqual(90.0, command.parameters["angle_deg"])
        self.assertEqual("sdk_right_positive", command.sdk_semantics["turn_direction_convention"])
        self.assertNotIn("backend_value", command.sdk_semantics)

    def test_wait_is_explicit(self):
        result = self.parse(f"from time import sleep\nsleep(1.5)")
        command = result.commands[0]
        self.assertEqual("WAIT", command.command_type)
        self.assertTrue(command.blocking)
        self.assertEqual(1.5, command.duration)
