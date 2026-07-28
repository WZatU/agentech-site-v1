import unittest

from tests.full_sdk_backend.common import CAPABILITIES, run_method


class HardwareOnlyMethodsTest(unittest.TestCase):
    def test_battery_is_only_hardware_method_and_not_faked(self):
        methods = [
            entry.method for entry in CAPABILITIES.entries
            if entry.status.value == "HARDWARE_ONLY"
        ]
        self.assertEqual(["get_battery_status"], methods)
        _, _, execution = run_method("get_battery_status()")
        query = execution.query_results[0]
        self.assertEqual("HARDWARE_ONLY", query["status"])
        self.assertFalse(query["available"])
        self.assertIsNone(query["value"])

