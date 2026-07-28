import unittest

from tests.full_sdk_backend.common import CAPABILITIES


class SensingMethodsTest(unittest.TestCase):
    def test_all_five_sensing_methods_have_specific_statuses(self):
        actual = {
            entry.method: entry.status.value for entry in CAPABILITIES.entries
            if entry.category == "sensing"
        }
        self.assertEqual({
            "get_status": "SIMULATED",
            "get_battery_status": "HARDWARE_ONLY",
            "body_status": "SIMULATED",
            "joint_states": "SIMULATED",
            "diagnose": "SIMULATED",
        }, actual)
