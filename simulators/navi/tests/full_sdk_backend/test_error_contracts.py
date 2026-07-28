import unittest

from backends.capabilities import BackendCapabilityStatus
from tests.full_sdk_backend.common import CAPABILITIES


class ErrorContractsTest(unittest.TestCase):
    def test_nonexecutable_statuses_have_specific_codes(self):
        expected = {
            BackendCapabilityStatus.UNAVAILABLE_IN_MUJOCO: "BACKEND_METHOD_UNAVAILABLE",
            BackendCapabilityStatus.BLOCKED_BY_MODEL: "BACKEND_METHOD_BLOCKED_BY_MODEL",
            BackendCapabilityStatus.BLOCKED_BY_UNRESOLVED_SPEC: "BACKEND_METHOD_BLOCKED_BY_SPEC",
            BackendCapabilityStatus.HARDWARE_ONLY: "BACKEND_METHOD_HARDWARE_ONLY",
            BackendCapabilityStatus.UNSAFE_TO_SIMULATE: "BACKEND_METHOD_UNSAFE",
            BackendCapabilityStatus.FAILED: "BACKEND_EXECUTION_FAILED",
        }
        for entry in CAPABILITIES.entries:
            if entry.status in expected:
                with self.subTest(method=entry.method):
                    self.assertEqual(expected[entry.status], entry.error_code)

