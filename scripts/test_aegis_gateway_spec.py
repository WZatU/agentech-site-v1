from __future__ import annotations

import unittest

from scripts.aegis_gateway_spec import (
    AEGIS_192_168_4_88,
    AegisCapabilityNotSupported,
    validate_aegis_command,
    validate_aegis_plan,
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

    def test_plan_requires_identity_hash_lines_and_exact_schema(self) -> None:
        base = {
            "version": 2,
            "robot_model": "aegis",
            "submission_id": "submission-test",
            "source_sha256": "a" * 64,
            "device_profile": dict(AEGIS_192_168_4_88),
            "commands": [{"name": "stand", "args": {}, "line": 2}],
        }
        validate_aegis_plan(base)
        invalid = [
            {**base, "submission_id": ""},
            {**base, "source_sha256": "bad"},
            {**base, "extra": "ignored"},
            {**base, "commands": [{"name": "stand", "args": {}, "line": 0}]},
            {
                **base,
                "commands": [
                    {"name": "stand", "args": {}, "line": 2, "extra": "ignored"}
                ],
            },
        ]
        for plan in invalid:
            with self.subTest(plan=plan), self.assertRaises((TypeError, ValueError)):
                validate_aegis_plan(plan)

    def test_plan_binds_source_arguments_to_compiler_normalization(self) -> None:
        plan = {
            "version": 2,
            "robot_model": "aegis",
            "submission_id": "submission-test",
            "source_sha256": "a" * 64,
            "device_profile": dict(AEGIS_192_168_4_88),
            "commands": [
                {
                    "name": "turn",
                    "source_args": {"angle_deg": -10, "turn_rate_deg_s": -10},
                    "args": {"angle_deg": -10, "turn_rate_deg_s": 10},
                    "line": 2,
                }
            ],
        }
        validate_aegis_plan(plan)
        plan["commands"][0]["source_args"]["turn_rate_deg_s"] = -20
        with self.assertRaisesRegex(ValueError, "source arguments"):
            validate_aegis_plan(plan)


if __name__ == "__main__":
    unittest.main()
