import unittest

from tests.full_sdk_backend.common import CAPABILITIES


class NoSilentSuccessTest(unittest.TestCase):
    def test_nonexecutable_methods_have_reason_and_no_physical_flag(self):
        for entry in CAPABILITIES.entries:
            if not entry.executable:
                with self.subTest(method=entry.method):
                    self.assertTrue(entry.reason)
                    self.assertFalse(entry.physical_execution)
                    if entry.category != "sensing":
                        self.assertIsNotNone(entry.error_code)

