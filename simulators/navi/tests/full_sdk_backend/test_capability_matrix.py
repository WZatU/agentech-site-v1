import unittest

from backends.capabilities import BackendCapabilityStatus
from tests.full_sdk_backend.common import CAPABILITIES


class CapabilityMatrixTest(unittest.TestCase):
    def test_exactly_one_entry_per_method(self):
        self.assertEqual(117, len(CAPABILITIES.entries))
        self.assertEqual(117, len(set(CAPABILITIES.methods())))

    def test_every_status_is_declared_enum(self):
        self.assertTrue(all(
            isinstance(entry.status, BackendCapabilityStatus)
            for entry in CAPABILITIES.entries
        ))

