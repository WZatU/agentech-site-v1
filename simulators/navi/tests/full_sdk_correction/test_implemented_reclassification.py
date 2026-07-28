import unittest

from .common import CAPABILITIES, EXPECTED


class ImplementedReclassificationTest(unittest.TestCase):
    def test_physical_and_query_methods_are_separated(self):
        fixture = EXPECTED["former_implemented"]
        for method in fixture["physical"]:
            entry = CAPABILITIES.get(method)
            self.assertEqual("PHYSICALLY_IMPLEMENTED", entry.backend_behavior_status.value)
            self.assertEqual(fixture["legacy_physical_status"], entry.status.value)
            self.assertEqual(fixture["sdk_contract_status"], entry.sdk_contract_status.value)
        for method in fixture["simulated_queries"]:
            entry = CAPABILITIES.get(method)
            self.assertEqual("SIMULATED", entry.backend_behavior_status.value)
            self.assertEqual(fixture["legacy_query_status"], entry.status.value)
