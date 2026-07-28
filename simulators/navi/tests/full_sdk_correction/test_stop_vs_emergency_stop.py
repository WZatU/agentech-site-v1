import unittest

from tests.mujoco_translation.common import run_scenario

from .common import EXPECTED


class StopVsEmergencyStopTest(unittest.TestCase):
    def test_stop_is_nonpersistent_and_emergency_stop_is_locked(self):
        _, _, stopped = run_scenario(
            "Agentech.forward(speed_mps=0.1, duration_s=0.5)\n"
            "Agentech.stop()\n"
            "Agentech.forward(speed_mps=0.1, duration_s=0.5)"
        )
        self.assertEqual("completed", stopped.status)
        self.assertEqual(3, stopped.commands_executed)
        stop_mapping = stopped.backend_mapping[1]["backend_mapping"]
        self.assertTrue(stop_mapping["active_action_cancelled"])
        self.assertFalse(stop_mapping["persistent_lock"])

        _, _, locked = run_scenario(
            "Agentech.forward(speed_mps=0.1, duration_s=0.5)\n"
            "Agentech.emergency_stop()\n"
            "Agentech.forward(speed_mps=0.1, duration_s=0.5)"
        )
        self.assertEqual("failed", locked.status)
        self.assertEqual("BACKEND_STATE_INCOMPATIBLE", locked.error_code)
        self.assertEqual(2, locked.commands_executed)
        emergency_mapping = locked.backend_mapping[1]["backend_mapping"]
        fixture = EXPECTED["static_semantics"]["emergency_stop"]
        self.assertEqual(
            fixture["must_clear_pending_queue"],
            emergency_mapping["pending_action_queue_cleared"],
        )
        self.assertEqual(
            fixture["must_lock_non_recovery_commands"],
            emergency_mapping["persistent_lock"],
        )
        self.assertFalse(emergency_mapping["physical_estop"])

    def test_explicit_stand_recovers_emergency_lock(self):
        _, _, recovered = run_scenario(
            "Agentech.emergency_stop()\n"
            "Agentech.stand()\n"
            "Agentech.forward(speed_mps=0.1, duration_s=0.5)"
        )
        self.assertEqual("completed", recovered.status)
        self.assertEqual(3, recovered.commands_executed)
