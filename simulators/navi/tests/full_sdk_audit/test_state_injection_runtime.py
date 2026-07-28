import unittest

from .common import audit_execution


class StateInjectionRuntimeTest(unittest.TestCase):
    def test_all_method_runs_are_instrumented_without_findings(self):
        audit = audit_execution()["runtime_state_injection"]
        self.assertEqual(117, audit["instrumented_method_count"])
        self.assertGreater(audit["instrumented_mj_step_count"], 100000)
        self.assertEqual(0, audit["runtime_finding_count"])
        self.assertEqual(0, audit["static_protected_write_count"])
        self.assertEqual(0, audit["static_model_write_count"])
