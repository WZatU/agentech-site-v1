import unittest

from .common import CAPABILITIES


class LegacyCapabilityDerivationTest(unittest.TestCase):
    def test_legacy_status_is_derived_for_all_methods(self):
        for entry in CAPABILITIES.entries:
            with self.subTest(method=entry.method):
                self.assertEqual(entry.derived_legacy_status, entry.status)

    def test_no_strict_implemented_remains_with_unresolved_contract(self):
        self.assertFalse(
            any(
                entry.status.value == "IMPLEMENTED"
                and entry.sdk_contract_status.value != "RESOLVED"
                for entry in CAPABILITIES.entries
            )
        )
