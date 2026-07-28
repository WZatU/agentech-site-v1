import unittest

from .common import REPORT, audit_execution


class UnsafeEvidenceTest(unittest.TestCase):
    def test_unsafe_labels_are_split_by_evidence_strength(self):
        audit = audit_execution()["unsafe_summary"]
        report = (REPORT / "unsafe_methods_audit.md").read_text(encoding="utf-8")
        self.assertEqual(2, audit["verified_count"])
        self.assertEqual(0, audit["current_model_reproducible_count"])
        self.assertEqual(2, audit["unproven_count"])
        self.assertIn("`jump_round`", report)
        self.assertIn("`set_friction`", report)
        self.assertEqual(2, report.count("`UNSAFE_CLAIM_UNPROVEN`"))
