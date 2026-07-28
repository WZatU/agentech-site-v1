import unittest

from .common import audit_execution


class StateInjectionStaticTest(unittest.TestCase):
    def test_only_actuator_control_and_initialization_resets_are_found(self):
        audit = audit_execution()["static_state_injection"]
        self.assertEqual([], audit["protected_state_writes"])
        self.assertEqual([], audit["model_runtime_writes"])
        self.assertEqual(2, len(audit["allowed_actuator_control_writes"]))
        self.assertGreaterEqual(len(audit["reset_calls"]), 1)
