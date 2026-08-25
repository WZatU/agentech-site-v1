from __future__ import annotations

import unittest

from scripts.aegis_gateway_spec import (
    AEGIS_192_168_4_88,
    AegisCapabilityNotSupported,
    validate_aegis_command,
)


class AegisGatewaySpecTests(unittest.TestCase):
    def test_session_37_diagonal_component_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "lateral component"):
            validate_aegis_command(
                "diagonal",
                {"angle_deg": 45, "speed_mps": 0.10, "duration_s": 0.50},
                device_profile=AEGIS_192_168_4_88,
            )

    def test_session_38_negative_left_rate_is_normalized(self) -> None:
        normalized = validate_aegis_command(
            "turn",
            {"angle_deg": -10, "turn_rate_deg_s": -10},
            device_profile=AEGIS_192_168_4_88,
        )

        self.assertEqual(
            normalized,
            {"angle_deg": -10, "turn_rate_deg_s": 10},
        )

    def test_negative_rate_with_positive_target_remains_a_conflict(self) -> None:
        with self.assertRaisesRegex(ValueError, "conflicts"):
            validate_aegis_command(
                "turn",
                {"angle_deg": 10, "turn_rate_deg_s": -10},
                device_profile=AEGIS_192_168_4_88,
            )

    def test_battery_absence_is_rejected_before_plan_output(self) -> None:
        with self.assertRaises(AegisCapabilityNotSupported) as caught:
            validate_aegis_command(
                "get_battery_status",
                {},
                device_profile=AEGIS_192_168_4_88,
            )

        self.assertEqual(caught.exception.reason, "hardware_absent")
        self.assertEqual(caught.exception.capability, "battery")

    def test_exact_session_38_commands_are_valid_after_normalization(self) -> None:
        commands = [
            ("stand", {}),
            ("squat", {}),
            ("stand", {}),
            ("forward", {"speed_mps": 0.20, "duration_s": 1.0}),
            ("backward", {"speed_mps": 0.20, "duration_s": 1.0}),
            ("lateral_left", {"speed_mps": 0.15, "duration_s": 1.0}),
            ("lateral_right", {"speed_mps": 0.15, "duration_s": 1.0}),
            ("diagonal", {"angle_deg": 45, "speed_mps": 0.20, "duration_s": 1.0}),
            ("diagonal", {"angle_deg": -135, "speed_mps": 0.20, "duration_s": 1.0}),
            ("squat_forward", {"speed_mps": 0.10, "duration_s": 0.50}),
            ("squat_backward", {"speed_mps": 0.10, "duration_s": 0.50}),
            ("squat_lateral", {"direction": "left", "speed_mps": 0.10, "duration_s": 0.50}),
            ("squat_lateral", {"direction": "right", "speed_mps": 0.10, "duration_s": 0.50}),
            ("squat_diagonal", {"angle_deg": 45, "speed_mps": 0.15, "duration_s": 0.50}),
            ("squat_diagonal", {"angle_deg": -135, "speed_mps": 0.15, "duration_s": 0.50}),
            ("squat_turn", {"angle_deg": 10}),
            ("squat_turn", {"angle_deg": -10}),
            ("stand", {}),
            ("turn", {"angle_deg": 10, "turn_rate_deg_s": 10}),
            ("turn", {"angle_deg": -10, "turn_rate_deg_s": -10}),
            ("yaw", {"speed_rad_s": 0.20, "position_rad": 0.10}),
            ("yaw", {"speed_rad_s": 0.20, "position_rad": -0.10}),
            ("pitch", {"speed_rad_s": 0.20, "position_rad": 0.10}),
            ("pitch", {"speed_rad_s": 0.20, "position_rad": -0.10}),
            ("roll", {"speed_rad_s": 0.20, "position_rad": 0.10}),
            ("roll", {"speed_rad_s": 0.20, "position_rad": -0.10}),
            ("stay", {"duration_s": 0.50}),
            ("sit", {}),
        ]

        normalized = [
            validate_aegis_command(name, args, device_profile=AEGIS_192_168_4_88)
            for name, args in commands
        ]

        self.assertEqual(len(normalized), 28)
        self.assertEqual(normalized[19]["turn_rate_deg_s"], 10)

    def test_unknown_keyword_bool_number_and_nonfinite_number_fail_closed(self) -> None:
        invalid = [
            ("forward", {"backend": "dog_task"}),
            ("forward", {"speed_mps": True}),
            ("forward", {"speed_mps": float("nan")}),
            ("yaw", {"speed_rad_s": 0.2}),
            ("turn_right", {"angle_deg": 10}),
        ]
        for name, arguments in invalid:
            with self.subTest(name=name, arguments=arguments), self.assertRaises(
                (TypeError, ValueError)
            ):
                validate_aegis_command(
                    name,
                    arguments,
                    device_profile=AEGIS_192_168_4_88,
                )


if __name__ == "__main__":
    unittest.main()
