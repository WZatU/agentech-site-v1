import unittest

from tests.mujoco_translation.common import run_scenario


class StateMachineTest(unittest.TestCase):
    def test_movement_to_posture_stops_then_recovers_to_standing(self):
        _, _, execution = run_scenario(
            "\n".join(
                [
                    "Agentech.forward(speed_mps=0.10, duration_s=0.5, stop=False)",
                    "Agentech.squat(time=1.0)",
                ]
            )
        )
        self.assertEqual("completed", execution.status)
        self.assertEqual("STANDING", execution.final_state["runtime_state"])
        self.assertEqual(
            ["forward", "squat"],
            [mapping["canonical_method"] for mapping in execution.backend_mapping],
        )

    def test_emergency_stop_blocks_motion_with_specific_state_error(self):
        _, _, execution = run_scenario(
            "\n".join(
                [
                    "Agentech.emergency_stop(reason='state-machine acceptance')",
                    "Agentech.forward(speed_mps=0.10, duration_s=0.5)",
                ]
            )
        )
        self.assertEqual("failed", execution.status)
        self.assertEqual(
            "BACKEND_STATE_INCOMPATIBLE",
            execution.error_code,
        )
        self.assertEqual("EMERGENCY_STOP", execution.final_state["runtime_state"])

    def test_stand_recovers_from_emergency_stop_before_motion(self):
        _, _, execution = run_scenario(
            "\n".join(
                [
                    "Agentech.emergency_stop(reason='state-machine recovery')",
                    "Agentech.stand()",
                    "Agentech.forward(speed_mps=0.10, duration_s=0.5)",
                ]
            )
        )
        self.assertEqual("completed", execution.status)
        self.assertEqual("STANDING", execution.final_state["runtime_state"])
        self.assertEqual(
            ["emergency_stop", "stand", "forward"],
            [mapping["canonical_method"] for mapping in execution.backend_mapping],
        )


if __name__ == "__main__":
    unittest.main()
