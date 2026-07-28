import unittest

from .common import REPORT, load_json


class PhysicalExecutionEvidenceTest(unittest.TestCase):
    def test_verified_claims_have_full_independent_evidence_chain(self):
        payload = load_json(REPORT / "physical_execution_audit.json")
        methods = payload["methods"]
        verified = [row for row in methods if row["physical_execution_verified"]]
        self.assertEqual(79, len(methods))
        self.assertEqual(74, len(verified))
        for row in verified:
            with self.subTest(method=row["method"]):
                self.assertEqual("completed", row["backend_execution_status"])
                self.assertTrue(row["backend_dispatch_found"])
                self.assertTrue(row["controller_command_found"])
                self.assertTrue(row["actuator_signal_changed"])
                self.assertTrue(row["observable_motion"])
                self.assertTrue(row["reproduced_original"])
                runtime = row["runtime_state_injection"]
                self.assertFalse(runtime["out_of_mj_step_state_changes"])
                self.assertFalse(runtime["reset_calls_during_command"])
                self.assertFalse(runtime["model_field_changes"])
