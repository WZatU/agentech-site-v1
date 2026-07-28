import unittest

from .common import audit_execution


class NoGenericSuccessFallbackTest(unittest.TestCase):
    def test_source_patterns_are_not_generic_success_paths(self):
        audit = audit_execution()["generic_fallback"]
        self.assertEqual(0, audit["generic_success_finding_count"])
        self.assertEqual([], audit["unknown_dispatch_methods"])
        self.assertFalse(audit["backend_not_implemented_is_success_fallback"])
        self.assertIn("BACKEND_METHOD_BLOCKED_BY_SPEC", audit["explanation"])
