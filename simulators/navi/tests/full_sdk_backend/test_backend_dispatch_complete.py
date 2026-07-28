import unittest

from backends.capabilities import BackendCapabilityStatus
from tests.full_sdk_backend.common import CAPABILITIES


class BackendDispatchCompleteTest(unittest.TestCase):
    def test_every_entry_has_dispatch_or_specific_error(self):
        for entry in CAPABILITIES.entries:
            with self.subTest(method=entry.method):
                if entry.executable or entry.category == "sensing":
                    self.assertTrue(entry.implementation)
                else:
                    self.assertIsNotNone(entry.error_code)

    def test_no_entry_uses_legacy_generic_error(self):
        self.assertTrue(all(
            entry.error_code != "BACKEND_COMMAND_NOT_IMPLEMENTED"
            for entry in CAPABILITIES.entries
        ))

